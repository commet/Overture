import Anthropic from '@anthropic-ai/sdk';
import { getStorage, STORAGE_KEYS } from '@/lib/storage';
import type { Settings } from '@/stores/types';

interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface LLMOptions {
  system: string;
  maxTokens?: number;
}

function parseJSON<T = unknown>(text: string): T {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Failed to parse JSON from LLM response');
  }
}

export async function callLLM(
  messages: LLMMessage[],
  options: LLMOptions
): Promise<string> {
  const settings = getStorage<Settings>(STORAGE_KEYS.SETTINGS, {
    anthropic_api_key: '',
    llm_mode: 'proxy',
    local_endpoint: '',
    language: 'ko',
  });

  if (settings.anthropic_api_key) {
    return callDirect(settings.anthropic_api_key, messages, options);
  }
  return callProxy(messages, options);
}

async function callDirect(
  apiKey: string,
  messages: LLMMessage[],
  options: LLMOptions
): Promise<string> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: options.maxTokens || 2000,
    system: options.system,
    messages,
  });
  const block = response.content.find((b) => b.type === 'text');
  return block ? block.text : '';
}

async function callProxy(
  messages: LLMMessage[],
  options: LLMOptions
): Promise<string> {
  const res = await fetch('/api/llm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, system: options.system, maxTokens: options.maxTokens }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `LLM 호출 실패 (${res.status})`);
  }

  const data = await res.json();
  return data.text;
}

export async function callLLMJson<T = unknown>(
  messages: LLMMessage[],
  options: LLMOptions
): Promise<T> {
  const text = await callLLM(messages, options);
  return parseJSON<T>(text);
}
