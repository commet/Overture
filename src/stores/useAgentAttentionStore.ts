'use client';

/**
 * Lightweight cross-component store for "the agents are paying attention" cues.
 *
 * Used by:
 * - Input flows (Q/A, QuickChat, retry) — call `ping(source)` to make every active
 *   agent row flash briefly, communicating that the user's input was received.
 * - Traceability hover — `setHoveredAttribution({ source: 'section' | 'agent', id })`
 *   so the sidebar and the draft can highlight each other bi-directionally.
 *
 * Not persisted; purely ephemeral state.
 */

import { create } from 'zustand';

export type PingSource = 'answer' | 'chat' | 'retry' | 'deploy';

export type AttributionHover =
  | { kind: 'section'; sectionIndex: number; contributorIds: string[] }
  | { kind: 'agent'; workerId: string }
  | null;

interface AgentAttentionState {
  // Input → agent ping
  lastPingAt: number;
  lastPingSource: PingSource | null;
  ping: (source: PingSource) => void;

  // Draft ↔ sidebar hover attribution
  hovered: AttributionHover;
  setHovered: (h: AttributionHover) => void;
}

export const useAgentAttentionStore = create<AgentAttentionState>((set) => ({
  lastPingAt: 0,
  lastPingSource: null,
  ping: (source) => set({ lastPingAt: Date.now(), lastPingSource: source }),

  hovered: null,
  setHovered: (h) => set({ hovered: h }),
}));
