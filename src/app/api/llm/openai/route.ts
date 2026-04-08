import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { validateMessages, validateSystemPrompt, validateApiKey, validateRequest, normalizeMaxTokens } from '@/lib/llm-validation';

const ALLOWED_MODELS = new Set(['gpt-4o', 'gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4.1-nano', 'o3-mini', 'o4-mini']);
const DEFAULT_MODEL = 'gpt-4o';

/**
 * OpenAI direct mode endpoint — uses the user's own OpenAI API key.
 * No rate limiting (user pays their own bill).
 */
export async function POST(req: NextRequest) {
  const reqError = validateRequest(req);
  if (reqError) return reqError;

  try {
    const body = await req.json();
    const { apiKey, messages, system } = body;
    const maxTokens = normalizeMaxTokens(body.maxTokens);

    const keyCheck = validateApiKey(apiKey, 'openai');
    if (!keyCheck.valid) return NextResponse.json({ error: keyCheck.error }, { status: 400 });
    if (!validateSystemPrompt(system)) return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    if (!validateMessages(messages)) return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });

    const client = new OpenAI({ apiKey });
    const stream = body.stream === true;
    const modelId = ALLOWED_MODELS.has(body.model) ? body.model : DEFAULT_MODEL;

    // Convert to OpenAI message format: system prompt as first message (skip if absent)
    const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [
      ...(system ? [{ role: 'system' as const, content: system }] : []),
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
