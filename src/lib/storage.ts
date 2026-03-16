export const STORAGE_KEYS = {
  DECOMPOSE_LIST: 'sot_decompose_list',
  SYNTHESIZE_LIST: 'sot_synthesize_list',
  ORCHESTRATE_LIST: 'sot_orchestrate_list',
  PERSONAS: 'sot_personas',
  FEEDBACK_HISTORY: 'sot_feedback_history',
  SETTINGS: 'sot_settings',
} as const;

export function getStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

export function setStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('localStorage write failed:', e);
  }
}

export function removeStorage(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

export function clearAllStorage(): void {
  if (typeof window === 'undefined') return;
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
}
