import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const MAX_TOKENS_CAP = 4096;
const MAX_MESSAGE_LENGTH = 50_000;
const MAX_SYSTEM_LENGTH = 10_000;
const VALID_ROLES = new Set(['user', 'assistant']);

function validateMessages(messages: unknown): messages is Array<{ role: string; content: string }> {
  if (!Array.isArray(messages) || messages.length === 0) return false;
  return messages.every(
    (m: unknown) =>
      typeof m === 'object' && m !== null &&
      'role' in m && VALID_ROLES.has((m as { role: unknown }).role as string) &&
      'content' in m && typeof (m as { content: unknown }).content === 'string' &&
      ((m as { content: string }).content.length <= MAX_MESSAGE_LENGTH)
  );
}

/**
 * Direct mode endpoint — uses the user's own API key (sent from client).
 * No rate limiting (user pays their own bill).
 * No auth required (the API key itself is the credential).
 * The key is only used server-side and never stored.
 */
export async function POST(req: NextRequest) {
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

    if (stream) {
      const anthropicStream = client.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system,
        messages: messages as Anthropic.MessageParam[],
      });

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const event of anthropicStream) {
              if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
              }
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`));
            controller.close();
          }
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
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system,
      messages: messages as Anthropic.MessageParam[],
    });

    const block = response.content.find((b) => b.type === 'text');
    return NextResponse.json({ text: block ? block.text : '' });
  } catch {
    return NextResponse.json(
      { error: 'LLM 호출 중 오류가 발생했습니다. API 키를 확인해주세요.' },
      { status: 500 }
    );
  }
}
