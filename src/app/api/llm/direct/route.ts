import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { validateOrigin, validateContentType, validateContentLength } from '@/lib/api-security';

const MAX_TOKENS_CAP = 4096;
const MAX_MESSAGE_LENGTH = 50_000;
const MAX_SYSTEM_LENGTH = 10_000;
const MAX_MESSAGES = 20;
const MAX_TOTAL_BODY = 500_000; // 500KB
const VALID_ROLES = new Set(['user', 'assistant']);

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
 * Direct mode endpoint — uses the user's own API key (sent from client).
 * No rate limiting (user pays their own bill).
 * No auth required (the API key itself is the credential).
 * The key is only used server-side and never stored.
 */
export async function POST(req: NextRequest) {
  // Request validation
  const ctError = validateContentType(req);
  if (ctError) return ctError;
  const clError = validateContentLength(req);
  if (clError) return clError;
  const csrfError = validateOrigin(req);
  if (csrfError) return csrfError;

  try {
    const body = await req.json();
    const { apiKey, messages, system } = body;
    const maxTokens = Math.min(Number(body.maxTokens) || 2000, MAX_TOKENS_CAP);

    // Validate API key format and length
    if (typeof apiKey !== 'string' || !apiKey.startsWith('sk-ant-') || apiKey.length < 20 || apiKey.length > 200) {
      return NextResponse.json({ error: '유효한 Anthropic API 키가 아닙니다.' }, { status: 400 });
    }

    if (typeof system !== 'string' || system.length > MAX_SYSTEM_LENGTH) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }

    if (!validateMessages(messages)) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }

    const client = new Anthropic({ apiKey });
    const stream = body.stream === true;

    const MODEL_MAP: Record<string, string> = {
      fast: 'claude-haiku-4-5-20251001',
      default: 'claude-sonnet-4-20250514',
      strong: 'claude-sonnet-4-20250514',
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
      { error: 'LLM 호출 중 오류가 발생했습니다. API 키를 확인해주세요.' },
      { status: 500 }
    );
  }
}
