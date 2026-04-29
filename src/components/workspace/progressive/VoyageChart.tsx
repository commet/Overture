'use client';

/**
 * VoyageChart — 해도 (nautical chart) showing the user's decision voyage
 * as a real branching graph, not a linear list.
 *
 * The earlier version was a vertical timeline that duplicated the stepper
 * up top. This version draws an actual chart: a graticule (lat/long grid)
 * background, a dashed main route from origin down to the current
 * position, sibling spurs branching out laterally where the user could
 * have chosen differently, and a destination glyph pinned at the end of
 * a ghost route so users see where they're heading.
 *
 * Layout: SVG-driven. Main route lives at x=MAIN_X, sibling branches
 * spread to the right at x=BRANCH_X. Each row is ROW_H tall. Labels are
 * rendered with foreignObject so HTML text styling stays consistent.
 *
 * Backend wiring: reads `session.checkpoints` + `session.active_checkpoint_id`
 * from useProgressiveStore and calls `restoreCheckpoint(id)` on rewind.
 */

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Anchor, X as XIcon, RotateCcw, ChevronRight } from 'lucide-react';
import { useProgressiveStore } from '@/stores/useProgressiveStore';
import { useLocale } from '@/hooks/useLocale';
import type { VoyageCheckpoint, VoyageStage } from '@/stores/types';
import { EASE } from './shared/constants';

// Layout constants — tuned to fit the agent-sidebar width (~256-288px).
const VIEW_W = 240;
const MAIN_X = 28;        // main route x-position
const BRANCH_X = 152;     // sibling branch x-position
const ROW_H = 56;         // vertical spacing between waypoints
const NODE_R = 8;         // main node radius
const BRANCH_NODE_R = 4.5;// sibling node radius
const LABEL_X = MAIN_X + 16;  // text label offset on main path
const LABEL_W = BRANCH_X - LABEL_X - 14;

const STAGE_ORDER: VoyageStage[] = [
  'origin', 'briefing', 'crew_set', 'crew_done', 'mix', 'review', 'anchor',
];

const STAGE_GLYPH: Record<VoyageStage, string> = {
  origin: '⊙',
  briefing: '⚓',
  crew_set: '👥',
  crew_done: '⛵',
  mix: '📜',
  review: '👁',
  anchor: '🏁',
};

function stageLabel(stage: VoyageStage, locale: 'ko' | 'en'): string {
  if (locale === 'ko') {
    return ({
      origin: '출발', briefing: '항해 준비', crew_set: '선원 배정',
      crew_done: '항해 완료', mix: '항해 보고서', review: '검토', anchor: '정박',
    } as Record<VoyageStage, string>)[stage];
  }
  return ({
    origin: 'Origin', briefing: 'Briefing', crew_set: 'Crew',
    crew_done: 'Voyage done', mix: 'Report', review: 'Review', anchor: 'Anchor',
  } as Record<VoyageStage, string>)[stage];
}

function computeActivePath(checkpoints: VoyageCheckpoint[], activeId: string | null): VoyageCheckpoint[] {
  if (!activeId) return [];
  const byId = new Map(checkpoints.map(c => [c.id, c]));
  const path: VoyageCheckpoint[] = [];
  let cur: VoyageCheckpoint | undefined = byId.get(activeId);
  let guard = 0;
  while (cur && guard < 200) {
    path.unshift(cur);
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
    guard += 1;
  }
  return path;
}

export function VoyageChart() {
  const locale = useLocale();
  const L = (ko: string, en: string) => locale === 'ko' ? ko : en;
  const session = useProgressiveStore(s => s.sessions.find(ss => ss.id === s.currentSessionId));
  const restoreCheckpoint = useProgressiveStore(s => s.restoreCheckpoint);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const checkpoints = useMemo(() => session?.checkpoints || [], [session?.checkpoints]);
  const activeId = session?.active_checkpoint_id ?? null;
  const activePath = useMemo(() => computeActivePath(checkpoints, activeId), [checkpoints, activeId]);

  // Future stages — what's still ahead. Always pin the anchor as a
  // destination glyph at the bottom for "끝점 visibility".
  const reachedStages = useMemo(() => new Set(activePath.map(c => c.stage)), [activePath]);
  const lastIdx = activePath.length > 0
    ? STAGE_ORDER.indexOf(activePath[activePath.length - 1].stage)
    : -1;
  const futureStages = useMemo(
    () => STAGE_ORDER.slice(lastIdx + 1).filter(s => !reachedStages.has(s)),
    [lastIdx, reachedStages],
  );

  // Siblings of each active-path node (alternative branches the user
  // could have taken from the same parent). Drawn as lateral spurs.
  const siblingsByActiveId = useMemo(() => {
    const map = new Map<string, VoyageCheckpoint[]>();
    const activeIds = new Set(activePath.map(c => c.id));
    for (const cp of activePath) {
      if (!cp.parent_id) continue;
      const siblings = checkpoints.filter(
        c => c.parent_id === cp.parent_id && c.id !== cp.id && !activeIds.has(c.id),
      );
      if (siblings.length > 0) map.set(cp.id, siblings);
    }
    return map;
  }, [activePath, checkpoints]);

  if (!session || checkpoints.length === 0) return null;

  const totalRows = activePath.length + futureStages.length;
  const chartHeight = totalRows * ROW_H + 24;

  // Coordinates
  const yForActiveIdx = (i: number) => i * ROW_H + 28;
  const yForFutureIdx = (i: number) => (activePath.length + i) * ROW_H + 28;

  const handleNodeClick = (id: string) => {
    setSelectedId(prev => prev === id ? null : id);
  };

  const handleRestoreRequest = (id: string) => {
    setConfirmId(id);
    setSelectedId(null);
  };

  const handleConfirm = () => {
    if (confirmId) restoreCheckpoint(confirmId);
    setConfirmId(null);
  };

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)]/85 backdrop-blur-sm overflow-hidden">
      {/* Header — chart title + waypoint count + faux bearing */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-subtle)]/60">
        <Compass size={12} className="text-[var(--accent)]" />
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
          {L('해도', 'Chart')}
        </span>
        <span className="ml-auto text-[9px] tracking-[0.16em] uppercase text-[var(--accent)]/55 font-mono">
          N · {activePath.length}/{STAGE_ORDER.length}
        </span>
      </div>

      {/* Chart body — SVG graph with graticule, route, branches, destination. */}
      <div className="relative px-2 py-3">
        <svg
          width="100%"
          viewBox={`0 0 ${VIEW_W} ${chartHeight}`}
          className="overflow-visible"
          preserveAspectRatio="xMinYMin meet"
        >
          <defs>
            {/* Graticule — lat/long grid, very faint. Sells the chart vibe. */}
            <pattern id="voyage-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" stroke="currentColor" strokeWidth="0.4" fill="none" />
            </pattern>
          </defs>
          <rect
            x="0" y="0" width={VIEW_W} height={chartHeight}
            fill="url(#voyage-grid)"
            className="text-[var(--text-tertiary)]"
            opacity="0.13"
          />

          {/* Main route — dashed line connecting active-path nodes. */}
          {activePath.length > 1 && (
            <line
              x1={MAIN_X}
              y1={yForActiveIdx(0)}
              x2={MAIN_X}
              y2={yForActiveIdx(activePath.length - 1)}
              stroke="currentColor"
              className="text-[var(--accent)]"
              strokeWidth="1.4"
              strokeDasharray="3 3"
              strokeLinecap="round"
            />
          )}

          {/* Ghost line from current to destination — what's still ahead. */}
          {futureStages.length > 0 && activePath.length > 0 && (
            <line
              x1={MAIN_X}
              y1={yForActiveIdx(activePath.length - 1)}
              x2={MAIN_X}
              y2={yForFutureIdx(futureStages.length - 1)}
              stroke="currentColor"
              className="text-[var(--text-tertiary)]"
              strokeWidth="1"
              strokeDasharray="2 5"
              strokeLinecap="round"
              opacity="0.55"
            />
          )}

          {/* Sibling branches — lateral curved spurs out of the parent.
              Curve goes from the *parent* node (above the active node) out
              to the right where the alternative waypoint sits. */}
          {activePath.map((cp, i) => {
            const sibs = siblingsByActiveId.get(cp.id) || [];
            if (sibs.length === 0) return null;
            // Spur originates at the parent (i-1 on the main path).
            const parentY = i > 0 ? yForActiveIdx(i - 1) : yForActiveIdx(i) - 24;
            return sibs.map((sib, j) => {
              const sibY = parentY + (j + 1) * 22;
              const cx = (MAIN_X + BRANCH_X) / 2;
              return (
                <g key={sib.id}>
                  <path
                    d={`M ${MAIN_X + 4},${parentY + 6} Q ${cx},${sibY} ${BRANCH_X - BRANCH_NODE_R - 1},${sibY}`}
                    stroke="currentColor"
                    className="text-[var(--text-tertiary)]"
                    strokeWidth="0.9"
                    strokeDasharray="2 3"
                    fill="none"
                    opacity="0.7"
                  />
                  <circle
                    cx={BRANCH_X}
                    cy={sibY}
                    r={BRANCH_NODE_R}
                    className="fill-[var(--bg)] stroke-[var(--text-tertiary)] hover:stroke-[var(--accent)] hover:fill-[var(--accent)]/10 cursor-pointer transition-colors"
                    strokeWidth="1.2"
                    onClick={() => handleRestoreRequest(sib.id)}
                  >
                    <title>{sib.label}</title>
                  </circle>
                </g>
              );
            });
          })}

          {/* Active-path nodes — drawn after lines so they sit on top. */}
          {activePath.map((cp, i) => {
            const isActive = cp.id === activeId;
            const cy = yForActiveIdx(i);
            return (
              <g key={cp.id}>
                {/* Active pulse */}
                {isActive && (
                  <motion.circle
                    cx={MAIN_X}
                    cy={cy}
                    r={NODE_R}
                    className="fill-[var(--accent)]"
                    initial={{ opacity: 0.55 }}
                    animate={{ scale: [1, 1.7, 1], opacity: [0.55, 0, 0.55] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                    style={{ transformOrigin: `${MAIN_X}px ${cy}px` }}
                  />
                )}
                <circle
                  cx={MAIN_X}
                  cy={cy}
                  r={NODE_R}
                  className={`cursor-pointer transition-colors ${
                    isActive
                      ? 'fill-[var(--accent)] stroke-[var(--accent)]'
                      : 'fill-[var(--accent)]/82 stroke-[var(--surface)] hover:fill-[var(--accent)]'
                  }`}
                  strokeWidth={isActive ? 0 : 2}
                  onClick={() => handleNodeClick(cp.id)}
                />
                <text
                  x={MAIN_X}
                  y={cy + 3}
                  textAnchor="middle"
                  className="select-none pointer-events-none"
                  fontSize="9"
                  fill="white"
                >
                  {STAGE_GLYPH[cp.stage]}
                </text>
              </g>
            );
          })}

          {/* Future ghost nodes (including destination). */}
          {futureStages.map((stage, i) => {
            const isDestination = stage === 'anchor';
            const cy = yForFutureIdx(i);
            return (
              <g key={`future-${stage}`}>
                <circle
                  cx={MAIN_X}
                  cy={cy}
                  r={NODE_R}
                  className={
                    isDestination
                      ? 'fill-[var(--accent)]/8 stroke-[var(--accent)]'
                      : 'fill-transparent stroke-[var(--text-tertiary)]'
                  }
                  strokeWidth="1.2"
                  strokeDasharray="2 2"
                />
                <text
                  x={MAIN_X}
                  y={cy + 3}
                  textAnchor="middle"
                  className="select-none pointer-events-none"
                  fontSize="9"
                  opacity="0.5"
                >
                  {STAGE_GLYPH[stage]}
                </text>
              </g>
            );
          })}

          {/* Labels — HTML text via foreignObject so styling matches the
              rest of the app and label widths can flow naturally. */}
          {activePath.map((cp, i) => {
            const isActive = cp.id === activeId;
            return (
              <foreignObject
                key={`label-${cp.id}`}
                x={LABEL_X}
                y={yForActiveIdx(i) - 10}
                width={LABEL_W}
                height="22"
              >
                <button
                  type="button"
                  onClick={() => handleNodeClick(cp.id)}
                  className={`text-[11px] font-medium leading-[1.1] cursor-pointer transition-colors text-left truncate w-full ${
                    isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {cp.label}
                </button>
              </foreignObject>
            );
          })}
          {futureStages.map((stage, i) => {
            const isDestination = stage === 'anchor';
            return (
              <foreignObject
                key={`label-future-${stage}`}
                x={LABEL_X}
                y={yForFutureIdx(i) - 10}
                width={LABEL_W}
                height="22"
              >
                <div className={`text-[11px] leading-[1.1] truncate ${
                  isDestination
                    ? 'text-[var(--accent)] font-semibold'
                    : 'text-[var(--text-tertiary)]'
                }`}>
                  {stageLabel(stage, locale === 'ko' ? 'ko' : 'en')}
                  {isDestination && (
                    <span className="ml-1 text-[9.5px] font-normal text-[var(--accent)]/70">
                      {L('· 도착지', '· dest.')}
                    </span>
                  )}
                </div>
              </foreignObject>
            );
          })}

          {/* Destination override — replace the anchor stage glyph with a
              proper anchor icon for emphasis. */}
          {futureStages.includes('anchor') && (() => {
            const i = futureStages.indexOf('anchor');
            const cy = yForFutureIdx(i);
            return (
              <foreignObject x={MAIN_X - 7} y={cy - 7} width="14" height="14">
                <Anchor size={12} className="text-[var(--accent)]/80" />
              </foreignObject>
            );
          })()}
        </svg>

        {/* Footer hint — subtle interaction cue */}
        {checkpoints.length > 1 && (
          <div className="text-[9.5px] text-[var(--text-tertiary)] mt-2 px-1 leading-tight">
            {L('기점이나 다른 항로를 클릭해서 그 시점으로 돌아갈 수 있어요', 'Click a waypoint or alt route to rewind there')}
          </div>
        )}
      </div>

      {/* Selection popover — appears below the chart since space inside the
          SVG is tight. Surfaces metadata + restore action for the picked
          checkpoint without disrupting the chart layout. */}
      <AnimatePresence>
        {selectedId && (() => {
          const cp = checkpoints.find(c => c.id === selectedId);
          if (!cp) return null;
          const isActive = cp.id === activeId;
          return (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: EASE }}
              className="overflow-hidden border-t border-[var(--accent)]/20 bg-[var(--accent)]/[0.04]"
            >
              <div className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-2 mb-1.5">
                  <span className="text-[11px] font-semibold text-[var(--text-primary)]">{cp.label}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
                    aria-label={L('닫기', 'Close')}
                  >
                    <XIcon size={11} />
                  </button>
                </div>
                <div className="text-[10px] text-[var(--text-tertiary)] mb-2.5">
                  {new Date(cp.created_at).toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </div>
                {!isActive ? (
                  <button
                    type="button"
                    onClick={() => handleRestoreRequest(cp.id)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-semibold text-[var(--accent)] border border-[var(--accent)]/35 hover:bg-[var(--accent)]/10 transition-colors cursor-pointer"
                  >
                    <RotateCcw size={11} />
                    {L('이 분기로 돌아가기', 'Rewind here')}
                    <ChevronRight size={10} />
                  </button>
                ) : (
                  <div className="text-[10.5px] text-[var(--text-tertiary)] text-center py-1">
                    {L('현재 위치', 'Current waypoint')}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Confirm modal — shown when the user picks a non-active waypoint
          to rewind to. Spells out that the current branch isn't lost,
          just preserved as a sibling once they take the next action. */}
      <AnimatePresence>
        {confirmId && (() => {
          const target = checkpoints.find(c => c.id === confirmId);
          if (!target) return null;
          return (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setConfirmId(null)}
                className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 4 }}
                transition={{ duration: 0.22, ease: EASE }}
                className="fixed inset-0 z-[61] flex items-center justify-center p-4 pointer-events-none"
              >
                <div className="pointer-events-auto w-full max-w-sm rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] shadow-[var(--shadow-xl)] p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 rounded-full bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
                      <RotateCcw size={15} className="text-[var(--accent)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-1">
                        {L('여기서 새 항로 잡을까요?', 'Set a new course from here?')}
                      </h3>
                      <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                        {L(
                          `'${target.label}' 시점으로 돌아갑니다. 현재 진행한 작업은 다른 분기로 보존돼요.`,
                          `Rewinds to '${target.label}'. Your current course is preserved as a sibling branch.`,
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--bg)] transition-colors cursor-pointer"
                      aria-label={L('닫기', 'Close')}
                    >
                      <XIcon size={14} />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmId(null)}
                      className="flex-1 px-3 py-2.5 rounded-lg text-[12.5px] font-medium text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--accent)]/30 transition-colors cursor-pointer"
                    >
                      {L('취소', 'Cancel')}
                    </button>
                    <button
                      onClick={handleConfirm}
                      className="flex-1 px-3 py-2.5 rounded-lg text-[12.5px] font-semibold text-white shadow-[var(--shadow-sm)] cursor-pointer"
                      style={{ background: 'var(--gradient-gold)' }}
                    >
                      {L('이 항로로', 'Set course')}
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
