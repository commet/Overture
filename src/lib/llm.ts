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
    audio_enabled: false,
    audio_volume: 0.15,
  });

  // Direct mode: user's own API key, routed through server-side proxy
  if (settings.llm_mode === 'direct' && settings.anthropic_api_key) {
    return callServerWithUserKey(settings.anthropic_api_key, messages, options);
  }

  // Proxy mode: server's API key with rate limiting
  return callProxy(messages, options);
}

/**
 * Direct mode — sends user's API key to a server-side endpoint.
 * The key never leaves the same origin (no cross-origin browser request).
 */
async function callServerWithUserKey(
  apiKey: string,
  messages: LLMMessage[],
  options: LLMOptions
): Promise<string> {
  const res = await fetch('/api/llm/direct', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey,
      messages,
      system: options.system,
      maxTokens: options.maxTokens,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `LLM 호출 실패 (${res.status})`);
  }

  const data = await res.json();
  return data.text;
}

/**
 * Proxy mode — uses server's API key with auth + rate limiting.
 */
async function callProxy(
  messages: LLMMessage[],
  options: LLMOptions
): Promise<string> {
  const { supabase } = await import('./supabase');
  const { data: { session } } = await supabase.auth.getSession();

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const res = await fetch('/api/llm', {
    method: 'POST',
    headers,
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
