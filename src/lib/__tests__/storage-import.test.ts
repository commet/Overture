import { describe, it, expect } from 'vitest';

/**
 * Tests for the import whitelist logic from settings page.
 * Ensures malicious JSON imports cannot overwrite sensitive keys.
 */

const STORAGE_KEYS = {
  DECOMPOSE_LIST: 'sot_decompose_list',
  SYNTHESIZE_LIST: 'sot_synthesize_list',
  ORCHESTRATE_LIST: 'sot_orchestrate_list',
  PERSONAS: 'sot_personas',
  FEEDBACK_HISTORY: 'sot_feedback_history',
  PROJECTS: 'sot_projects',
  JUDGMENTS: 'sot_judgments',
  REFINEMENT_LOOPS: 'sot_refinement_loops',
  ACCURACY_RATINGS: 'sot_accuracy_ratings',
  SETTINGS: 'sot_settings',
} as const;

function getAllowedKeys(): Set<string> {
  return new Set(Object.values(STORAGE_KEYS).filter(k => k !== 'sot_settings'));
}

function filterImportData(data: Record<string, unknown>): Record<string, unknown> {
  const allowed = getAllowedKeys();
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (allowed.has(key) && typeof value !== 'undefined') {
      result[key] = value;
    }
  }
  return result;
}

describe('import whitelist', () => {
  it('allows valid storage keys', () => {
    const data = {
      sot_projects: [{ id: '1', name: 'test' }],
      sot_personas: [{ id: '2', name: 'CEO' }],
    };
    const filtered = filterImportData(data);
    expect(Object.keys(filtered)).toEqual(['sot_projects', 'sot_personas']);
  });

  it('blocks sot_settings (contains API key)', () => {
    const data = {
      sot_settings: { anthropic_api_key: 'sk-ant-stolen' },
      sot_projects: [],
    };
    const filtered = filterImportData(data);
    expect(filtered).not.toHaveProperty('sot_settings');
    expect(filtered).toHaveProperty('sot_projects');
  });

  it('blocks arbitrary keys', () => {
    const data = {
      malicious_key: 'payload',
      __proto__: { polluted: true },
      sot_projects: [],
    };
    const filtered = filterImportData(data);
    expect(Object.keys(filtered)).toEqual(['sot_projects']);
  });

  it('blocks all unknown keys', () => {
    const data = {
      random: 'data',
      another: 'thing',
      localStorage: 'overwrite',
    };
    const filtered = filterImportData(data);
    expect(Object.keys(filtered)).toHaveLength(0);
  });

  it('returns empty for completely empty input', () => {
    const filtered = filterImportData({});
    expect(Object.keys(filtered)).toHaveLength(0);
  });

  it('allowed keys count is exactly 9 (all except SETTINGS)', () => {
    const allowed = getAllowedKeys();
    expect(allowed.size).toBe(9);
    expect(allowed.has('sot_settings')).toBe(false);
  });
});
