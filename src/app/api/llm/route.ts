import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const rateLimit = new Map<string, { count: number; resetAt: number }>();
const DAILY_LIMIT = 30;

function getRateLimitKey(req: NextRequest): string {
  return req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous';
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimit.set(key, { count: 1, resetAt: now + 24 * 60 * 60 * 1000 });
    return true;
  }
  if (entry.count >= DAILY_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: '서버에 API 키가 설정되지 않았습니다. 설정에서 직접 API 키를 입력해주세요.' },
      { status: 503 }
    );
  }

  const ip = getRateLimitKey(req);
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: '일일 무료 사용량을 초과했습니다. 설정에서 직접 API 키를 입력하면 제한 없이 사용할 수 있습니다.' },
      { status: 429 }
    );
  }

  try {
    const { messages, system, maxTokens } = await req.json();

    if (!messages || !system) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens || 2000,
      system,
      messages,
    });

    const block = response.content.find((b) => b.type === 'text');
    return NextResponse.json({ text: block ? block.text : '' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'LLM 호출 중 오류가 발생했습니다.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
