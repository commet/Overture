'use client';

/**
 * VoyageChart — 해도 (nautical chart) showing the user's decision voyage.
 *
 * Renders the active branch as a vertical timeline of waypoints
 * (checkpoints), pinning the destination (anchor stage) at the bottom even
 * when not yet reached — so the user always sees where they're heading.
 * Sibling branches (different choices made earlier) surface as small spurs
 * off the active path; clicking a checkpoint opens an action menu where
 * the user can rewind to that moment, automatically forking a new branch.
 *
 * Backend wiring: reads `session.checkpoints` + `session.active_checkpoint_id`
 * from useProgressiveStore. The store records checkpoints automatically at
 * each stage transition; this component is purely a view + restore caller.
 */

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Anchor, X as XIcon, RotateCcw, ChevronRight } from 'lucide-react';
import { useProgressiveStore } from '@/stores/useProgressiveStore';
import { useLocale } from '@/hooks/useLocale';
import type { VoyageCheckpoint, VoyageStage } from '@/stores/types';
import { EASE } from './shared/constants';

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
      origin: '출발',
      briefing: '항해 준비',
      crew_set: '선원 배정',
      crew_done: '항해 완료',
      mix: '항해 보고서',
      review: '검토',
      anchor: '정박',
    } as Record<VoyageStage, string>)[stage];
  }
  return ({
    origin: 'Origin',
    briefing: 'Briefing',
    crew_set: 'Crew',
    crew_done: 'Voyage done',
    mix: 'Report',
    review: 'Review',
    anchor: 'Anchor',
  } as Record<VoyageStage, string>)[stage];
}

/** Walk parent links from `activeId` back to root, returning the path in
 *  chronological order (root → leaf). Falls back to empty when activeId
 *  is null or detached. */
function computeActivePath(
  checkpoints: VoyageCheckpoint[],
  activeId: string | null,
): VoyageCheckpoint[] {
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

/** Count siblings (other children of the same parent) for a checkpoint —
 *  used to render the "다른 항로 (N)" branch indicator next to a node. */
function countSiblingBranches(
  checkpoints: VoyageCheckpoint[],
  cp: VoyageCheckpoint,
): number {
  if (!cp.parent_id) return 0;
  return checkpoints.filter(c => c.parent_id === cp.parent_id && c.id !== cp.id).length;
}

export function VoyageChart() {
  const locale = useLocale();
  const L = (ko: string, en: string) => locale === 'ko' ? ko : en;
  const session = useProgressiveStore(s => s.sessions.find(ss => ss.id === s.currentSessionId));
  const restoreCheckpoint = useProgressiveStore(s => s.restoreCheckpoint);
  const [popoverId, setPopoverId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [showSiblingsOf, setShowSiblingsOf] = useState<string | null>(null);

  const checkpoints = useMemo(() => session?.checkpoints || [], [session?.checkpoints]);
  const activeId = session?.active_checkpoint_id ?? null;
  const activePath = useMemo(
    () => computeActivePath(checkpoints, activeId),
    [checkpoints, activeId],
  );

  // Future stages — what's still ahead. Pin the anchor as destination
  // even when nothing has been reached yet (per design: "끝점 visibility").
  const reachedStageSet = useMemo(
    () => new Set(activePath.map(c => c.stage)),
    [activePath],
  );
  const lastIdx = activePath.length > 0
    ? STAGE_ORDER.indexOf(activePath[activePath.length - 1].stage)
    : -1;
  const futureStages = useMemo(
    () => STAGE_ORDER.slice(lastIdx + 1).filter(s => !reachedStageSet.has(s)),
    [lastIdx, reachedStageSet],
  );

  // Sibling lookup — children of a parent grouped together
  const siblingsByParent = useMemo(() => {
    const map = new Map<string, VoyageCheckpoint[]>();
    for (const c of checkpoints) {
      if (!c.parent_id) continue;
      const list = map.get(c.parent_id) || [];
      list.push(c);
      map.set(c.parent_id, list);
    }
    return map;
  }, [checkpoints]);

  if (!session || checkpoints.length === 0) return null;

  const handlePick = (id: string) => {
    setPopoverId(prev => prev === id ? null : id);
  };

  const handleRestore = (id: string) => {
    setConfirmId(id);
    setPopoverId(null);
  };

  const handleConfirmRestore = () => {
    if (confirmId) restoreCheckpoint(confirmId);
    setConfirmId(null);
  };

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)]/85 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-subtle)]/60">
        <Compass size={12} className="text-[var(--accent)]" />
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
          {L('해도', 'Chart')}
        </span>
        <span className="text-[10px] text-[var(--text-tertiary)] ml-auto">
          {L(`기점 ${activePath.length}`, `${activePath.length} waypoints`)}
        </span>
      </div>

      {/* Body — vertical timeline */}
      <div className="px-4 py-4 space-y-3">
        {activePath.map((cp, i) => {
          const branchCount = countSiblingBranches(checkpoints, cp);
          const siblings = cp.parent_id
            ? (siblingsByParent.get(cp.parent_id) || []).filter(s => s.id !== cp.id)
            : [];
          const isActive = cp.id === activeId;
          const hasNext = i < activePath.length - 1 || futureStages.length > 0;
          const showSiblings = showSiblingsOf === cp.id;
          return (
            <div key={cp.id} className="relative pl-7">
              {/* Vertical connector down to next node */}
              {hasNext && (
                <div className="absolute left-[10px] top-5 bottom-[-12px] border-l border-dashed border-[var(--accent)]/35" />
              )}
              {/* Node — circular with stage glyph + active pulse */}
              <button
                type="button"
                onClick={() => handlePick(cp.id)}
                className={`absolute left-0 top-0 w-[22px] h-[22px] rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[var(--accent)] ring-[3px] ring-[var(--accent)]/22 shadow-[0_2px_6px_rgba(180,160,100,0.25)]'
                    : 'bg-[var(--accent)]/82 hover:bg-[var(--accent)] ring-2 ring-[var(--surface)]'
                }`}
                aria-label={cp.label}
              >
                <span className="text-[9px] leading-none">{STAGE_GLYPH[cp.stage]}</span>
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full bg-[var(--accent)]/40"
                    animate={{ scale: [1, 1.7, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                  />
                )}
              </button>
              {/* Label + branch hint */}
              <div className="min-h-[22px] flex items-baseline gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handlePick(cp.id)}
                  className={`text-[11.5px] font-medium leading-snug text-left cursor-pointer transition-colors ${
                    isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {cp.label}
                </button>
                {branchCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowSiblingsOf(showSiblings ? null : cp.id)}
                    className="text-[9.5px] text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors"
                  >
                    ↪ {L(`다른 항로 ${branchCount}`, `${branchCount} alt`)}
                  </button>
                )}
              </div>

              {/* Popover — actions for this checkpoint */}
              <AnimatePresence>
                {popoverId === cp.id && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -2 }}
                    transition={{ duration: 0.18 }}
                    className="mt-1.5 rounded-lg border border-[var(--accent)]/25 bg-[var(--surface)] px-3 py-2 text-[10.5px] shadow-[var(--shadow-sm)]"
                  >
                    <div className="text-[var(--text-tertiary)] mb-1.5">
                      {new Date(cp.created_at).toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                    {!isActive && (
                      <button
                        type="button"
                        onClick={() => handleRestore(cp.id)}
                        className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors cursor-pointer"
                      >
                        <RotateCcw size={11} />
                        {L('이 분기로 돌아가기', 'Rewind here')}
                        <ChevronRight size={10} className="ml-auto" />
                      </button>
                    )}
                    {isActive && (
                      <div className="px-2 py-1 text-[var(--text-tertiary)]">
                        {L('현재 위치', 'Current waypoint')}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sibling branches expanded */}
              <AnimatePresence>
                {showSiblings && siblings.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <div className="ml-3 mt-2 pl-3 border-l border-dotted border-[var(--text-tertiary)]/30 space-y-1.5">
                      {siblings.map(sib => (
                        <button
                          key={sib.id}
                          type="button"
                          onClick={() => handleRestore(sib.id)}
                          className="w-full text-left flex items-center gap-2 text-[10.5px] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors group cursor-pointer"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-tertiary)]/40 group-hover:bg-[var(--accent)] shrink-0 transition-colors" />
                          <span className="truncate">{sib.label}</span>
                          <RotateCcw size={9} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Future stages — ghost nodes with dashed connector. Always shows
            the destination (anchor) so users see where they're heading. */}
        {futureStages.map((stage, i) => {
          const isDestination = stage === 'anchor';
          const isLast = i === futureStages.length - 1;
          return (
            <div key={`future-${stage}`} className="relative pl-7">
              {!isLast && (
                <div className="absolute left-[10px] top-5 bottom-[-12px] border-l border-dotted border-[var(--text-tertiary)]/25" />
              )}
              <div
                className={`absolute left-0 top-0 w-[22px] h-[22px] rounded-full flex items-center justify-center border-[1.5px] border-dashed ${
                  isDestination
                    ? 'border-[var(--accent)]/55 bg-[var(--accent)]/[0.04]'
                    : 'border-[var(--text-tertiary)]/35 bg-transparent'
                }`}
              >
                {isDestination
                  ? <Anchor size={10} className="text-[var(--accent)]/75" />
                  : <span className="text-[9px] leading-none opacity-45">{STAGE_GLYPH[stage]}</span>}
              </div>
              <div className={`text-[11.5px] leading-snug ${
                isDestination
                  ? 'text-[var(--accent)] font-semibold'
                  : 'text-[var(--text-tertiary)]'
              }`}>
                {stageLabel(stage, locale === 'ko' ? 'ko' : 'en')}
                {isDestination && (
                  <span className="ml-1.5 text-[9.5px] font-normal text-[var(--accent)]/70">
                    {L('· 도착지', '· destination')}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm modal — rewinding loses the current branch tip but
          preserves it as a sibling once the user takes their next action. */}
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
                      onClick={handleConfirmRestore}
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
