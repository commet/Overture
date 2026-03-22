import { getStorage, STORAGE_KEYS } from '@/lib/storage';
import type { Settings } from '@/stores/types';

export interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LLMOptions {
  system: string;
  maxTokens?: number;
}

export interface StreamCallbacks {
  onToken: (text: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

export function parseJSON<T = unknown>(text: string): T {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Failed to parse JSON from LLM response');
  }
}

// ─── Retry logic for transient HTTP errors ───

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

async function fetchWithRetry(
  input: RequestInfo,
  init: RequestInit,
  maxRetries = 2
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(input, init);
    if (res.ok || !RETRYABLE_STATUS.has(res.status) || attempt === maxRetries) {
      return res;
    }
    const delay = 1000 * Math.pow(2, attempt);
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[llm] 재시도 ${attempt + 1}/${maxRetries} (status ${res.status}, ${delay}ms 후)`);
    }
    await new Promise(r => setTimeout(r, delay));
  }
  // Unreachable but satisfies TypeScript
  return fetch(input, init);
}

// ─── Settings helper ───

function getSettings(): Settings {
  return getStorage<Settings>(STORAGE_KEYS.SETTINGS, {
    anthropic_api_key: '',
    llm_mode: 'proxy',
    local_endpoint: '',
    language: 'ko',
    audio_enabled: false,
    audio_volume: 0.15,
  });
}

// ─── Non-streaming calls ───

export async function callLLM(
  messages: LLMMessage[],
  options: LLMOptions
): Promise<string> {
  const settings = getSettings();

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
  const res = await fetchWithRetry('/api/llm/direct', {
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

  const res = await fetchWithRetry('/api/llm', {
    method: 'POST',
    headers,
    body: JSON.stringify({ messages, system: options.system, maxTokens: options.maxTokens }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (err.needsLogin) {
      throw new Error('LOGIN_REQUIRED:' + (err.error || '로그인이 필요합니다.'));
    }
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

// ─── Streaming call ───

export async function callLLMStream(
  messages: LLMMessage[],
  options: LLMOptions,
  callbacks: StreamCallbacks
): Promise<void> {
  const settings = getSettings();

  const isDirect = settings.llm_mode === 'direct' && settings.anthropic_api_key;
  const url = isDirect ? '/api/llm/direct' : '/api/llm';

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (!isDirect) {
    const { supabase } = await import('./supabase');
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  }

  const bodyObj: Record<string, unknown> = {
    messages,
    system: options.system,
    maxTokens: options.maxTokens,
    stream: true,
  };
  if (isDirect) {
    bodyObj.apiKey = settings.anthropic_api_key;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyObj),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (err.needsLogin) {
        throw new Error('LOGIN_REQUIRED:' + (err.error || '로그인이 필요합니다.'));
      }
      throw new Error(err.error || `LLM 호출 실패 (${res.status})`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('Stream not available');

    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              fullText += parsed.text;
              callbacks.onToken(fullText);
            }
            if (parsed.rateLimit !== undefined) {
              // Dispatch rate limit info for RateLimitBadge
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('overture:ratelimit', {
                  detail: { remaining: parsed.rateLimit },
                }));
              }
            }
          } catch {
            // Skip malformed lines
          }
        }
      }
    }

    callbacks.onComplete(fullText);
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}
