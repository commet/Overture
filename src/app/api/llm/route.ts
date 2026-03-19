import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const MAX_TOKENS_CAP = 4096;
const DAILY_LIMIT = 5;
const rateLimit = new Map<string, { count: number; resetAt: number }>();

/**
 * Verify Supabase auth token from request.
 * Returns user ID if valid, null otherwise.
 */
async function verifyAuth(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimit.set(userId, { count: 1, resetAt: now + 24 * 60 * 60 * 1000 });
    return true;
  }
  if (entry.count >= DAILY_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  // 1. Authenticate
  const userId = await verifyAuth(req);
  if (!userId) {
    return NextResponse.json(
      { error: '로그인이 필요합니다.' },
      { status: 401 }
    );
  }

  // 2. Check server API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: '서버에 API 키가 설정되지 않았습니다. 설정에서 직접 API 키를 입력해주세요.' },
      { status: 503 }
    );
  }

  // 3. Rate limit by authenticated user ID
  if (!checkRateLimit(userId)) {
    return NextResponse.json(
      { error: '일일 무료 사용량을 초과했습니다. 설정에서 직접 API 키를 입력하면 제한 없이 사용할 수 있습니다.' },
      { status: 429 }
    );
  }

  // 4. Validate input
  try {
    const body = await req.json();
    const { messages, system } = body;
    const maxTokens = Math.min(Number(body.maxTokens) || 2000, MAX_TOKENS_CAP);

    if (!Array.isArray(messages) || messages.length === 0 || typeof system !== 'string') {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system,
      messages,
    });

    const block = response.content.find((b) => b.type === 'text');
    return NextResponse.json({ text: block ? block.text : '' });
  } catch {
    return NextResponse.json(
      { error: 'LLM 호출 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    );
  }
}
