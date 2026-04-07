import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { validateOrigin, validateContentType, validateContentLength } from '@/lib/api-security';

const MAX_TOKENS_CAP = 4096;
const MAX_MESSAGE_LENGTH = 50_000;
const MAX_SYSTEM_LENGTH = 10_000;
const MAX_MESSAGES = 20;
const MAX_TOTAL_BODY = 500_000;
const VALID_ROLES = new Set(['user', 'assistant']);
const ALLOWED_MODELS = new Set(['gpt-4o', 'gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4.1-nano', 'o3-mini', 'o4-mini']);
const DEFAULT_MODEL = 'gpt-4o';

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
 * OpenAI direct mode endpoint — uses the user's own OpenAI API key.
 * No rate limiting (user pays their own bill).
 */
export async function POST(req: NextRequest) {
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

    // Validate API key format
    if (typeof apiKey !== 'string' || !apiKey.startsWith('sk-') || apiKey.length < 20 || apiKey.length > 200) {
      return NextResponse.json({ error: '유효한 OpenAI API 키가 아닙니다.' }, { status: 400 });
    }

    if (typeof system !== 'string' || system.length > MAX_SYSTEM_LENGTH) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }

    if (!validateMessages(messages)) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }

    const client = new OpenAI({ apiKey });
    const stream = body.stream === true;
    const modelId = ALLOWED_MODELS.has(body.model) ? body.model : DEFAULT_MODEL;

    // Convert to OpenAI message format: system prompt as first message
    const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: system },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    if (stream) {
      const openaiStream = await client.chat.completions.create({
        model: modelId,
        max_tokens: maxTokens,
        messages: openaiMessages,
        stream: true,
      });

      const encoder = new TextEncoder();
      const controller_ref = { aborted: false };
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of openaiStream) {
              if (controller_ref.aborted) break;
              const text = chunk.choices[0]?.delta?.content;
              if (text) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
              }
            }
            if (!controller_ref.aborted) {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            }
          } catch {
            if (!controller_ref.aborted) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`));
              controller.close();
            }
          }
        },
        cancel() {
          controller_ref.aborted = true;
          openaiStream.controller.abort();
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
    const response = await client.chat.completions.create({
      model: modelId,
      max_tokens: maxTokens,
      messages: openaiMessages,
    });

    const text = response.choices[0]?.message?.content ?? '';
    const res = NextResponse.json({ text });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch {
    return NextResponse.json(
      { error: 'OpenAI 호출 중 오류가 발생했습니다. API 키를 확인해주세요.' },
      { status: 500 }
    );
  }
}
