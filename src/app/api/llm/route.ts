import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { validateOrigin, validateContentType, validateContentLength } from '@/lib/api-security';

const MAX_TOKENS_CAP = 4096;
const DAILY_LIMIT = 20; // ~2-3 progressive sessions per day (with workers)
const ANON_LIMIT = 12; // Progressive flow uses 6-8 calls per session; allow 1 full session + retry
const MAX_MESSAGE_LENGTH = 50_000;
const MAX_SYSTEM_LENGTH = 10_000;
const MAX_MESSAGES = 20;
const MAX_TOTAL_BODY = 500_000; // 500KB total payload
const VALID_ROLES = new Set(['user', 'assistant']);

/**
 * Verify Supabase auth token from request.
 * Returns { userId, token } if valid, null otherwise.
 */
async function verifyAuth(req: NextRequest): Promise<{ userId: string; token: string } | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return { userId: user.id, token };
}

/**
 * Atomic rate limiter via Supabase RPC.
 * - Runs as SECURITY DEFINER (user cannot tamper with the table)
 * - Single INSERT ... ON CONFLICT with WHERE count < limit (no race condition)
 */
async function checkRateLimit(userId: string, token: string): Promise<boolean> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data, error } = await supabase.rpc('check_and_increment_rate_limit', {
    p_user_id: userId,
    p_limit: DAILY_LIMIT,
  });

  if (error) {
    // RPC error — fail closed (deny the request)
    console.error('[rate-limit] RPC error:', error.message);
    return false;
  }

  return data === true;
}

/**
 * Validate messages array structure.
 */
function validateMessages(messages: unknown): messages is Array<{ role: string; content: string }> {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) return false;
  let totalSize = 0;
  return messages.every(
    (m: unknown) => {
      if (typeof m !== 'object' || m === null) return false;
      if (!('role' in m) || !VALID_ROLES.has((m as { role: unknown }).role as string)) return false;
      if (!('content' in m) || typeof (m as { content: unknown }).content !== 'string') return false;
      const content = (m as { content: string }).content;
      if (content.length > MAX_MESSAGE_LENGTH) return false;
      totalSize += content.length;
      return totalSize <= MAX_TOTAL_BODY;
    }
  );
}

/**
 * Anonymous rate limiting via Supabase (persistent across serverless instances).
 * Uses a dedicated RPC that doesn't require auth — takes a hashed IP instead.
 */
async function checkAnonRateLimit(ip: string): Promise<boolean> {
  // Hash IP so raw addresses aren't stored in the rate_limits table
  const encoder = new TextEncoder();
  const data = encoder.encode(`anon:${ip}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  // Only need first 32 hex chars (RPC converts to UUID internally)
  const ipHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: allowed, error } = await supabase.rpc('check_anon_rate_limit', {
    p_ip_hash: ipHash,
    p_limit: ANON_LIMIT,
  });

  if (error) {
    // RPC error — fail closed (deny the request)
    console.error('[rate-limit] anon RPC error:', error.message);
    return false;
  }

  return allowed === true;
}

export async function POST(req: NextRequest) {
  // 0. Request validation
  const ctError = validateContentType(req);
  if (ctError) return ctError;
  const clError = validateContentLength(req);
  if (clError) return clError;
  const csrfError = validateOrigin(req);
  if (csrfError) return csrfError;

  // 1. Authenticate (optional — anonymous trial allowed)
  const auth = await verifyAuth(req);

  // 2. Check server API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: '현재 서비스를 이용할 수 없습니다. 설정에서 직접 API 키를 입력해주세요.' },
      { status: 503 }
    );
  }

  // 3. Rate limiting — authenticated vs anonymous
  // Always resolve IP for anon rate limiting (prevents double-dip: auth 5 + anon 3)
  const ip = req.headers.get('x-real-ip')
    || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown';

  if (auth) {
    // Logged-in user: 5/day via Supabase RPC
    const allowed = await checkRateLimit(auth.userId, auth.token);
    if (!allowed) {
      return NextResponse.json(
        { error: '오늘의 무료 사용량(10회)을 모두 사용했습니다. 설정에서 직접 API 키를 입력하면 제한 없이 사용할 수 있어요.' },
        { status: 429 }
      );
    }
    // Also burn the anon quota for this IP so user can't strip auth and get extra calls
    await checkAnonRateLimit(ip);
  } else {
    // Anonymous: ANON_LIMIT/day per IP
    const allowed = await checkAnonRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: '무료 체험을 모두 사용했습니다. 로그인하면 하루 10회까지 무료로 계속 사용할 수 있어요!', needsLogin: true },
        { status: 429 }
      );
    }
  }

  // 4. Validate input
  try {
    const body = await req.json();
    const { messages, system } = body;
    const maxTokens = Math.min(Number(body.maxTokens) || 2000, MAX_TOKENS_CAP);

    if (typeof system !== 'string' || system.length > MAX_SYSTEM_LENGTH) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }

    if (!validateMessages(messages)) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }

    const client = new Anthropic({ apiKey });
    const stream = body.stream === true;

    // Model routing: fast=Haiku (cheap/fast), default=Sonnet, strong=Opus
    const MODEL_MAP: Record<string, string> = {
      fast: 'claude-haiku-4-5-20251001',
      default: 'claude-sonnet-4-20250514',
      strong: 'claude-sonnet-4-20250514', // Opus 사용 시 비용 주의
    };
    const modelId = MODEL_MAP[body.model as string] || MODEL_MAP.default;

    if (stream) {
      const anthropicStream = client.messages.stream({
        model: modelId,
        max_tokens: maxTokens,
        system,
        messages: messages as Anthropic.MessageParam[],
      });

      const encoder = new TextEncoder();
      let cancelled = false;
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const event of anthropicStream) {
              if (cancelled) break;
              if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
              }
            }
            if (!cancelled) {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            }
          } catch {
            if (!cancelled) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`));
              controller.close();
            }
          }
        },
        cancel() {
          cancelled = true;
          anthropicStream.abort();
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Non-streaming path
    const response = await client.messages.create({
      model: modelId,
      max_tokens: maxTokens,
      system,
      messages: messages as Anthropic.MessageParam[],
    });

    const block = response.content.find((b) => b.type === 'text');
    const res = NextResponse.json({ text: block ? block.text : '' });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch {
    return NextResponse.json(
      { error: 'LLM 호출 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    );
  }
}
