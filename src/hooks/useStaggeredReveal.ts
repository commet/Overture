import { useState, useEffect, useRef } from 'react';

/**
 * Staggered reveal for worker results.
 * When a worker transitions to 'done', its ID is added to the revealed set
 * after a delay, creating a cascading reveal effect.
 */
export function useStaggeredReveal(
  workers: Array<{ id: string; status: string }>,
  sessionId: string | null,
): Set<string> {
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const prevSessionRef = useRef(sessionId);

  // Reset on session change
  useEffect(() => {
    if (prevSessionRef.current !== sessionId) {
      setRevealedIds(new Set());
      timersRef.current.forEach(t => clearTimeout(t));
      timersRef.current.clear();
      prevSessionRef.current = sessionId;
    }
  }, [sessionId]);

  useEffect(() => {
    const doneIds = new Set(
      workers.filter(w => w.status === 'done' || w.status === 'waiting_input' || w.status === 'error').map(w => w.id),
    );

    // Queue newly done workers for staggered reveal
    setRevealedIds(prev => {
      const newWorkers = workers.filter(w =>
        doneIds.has(w.id) && !prev.has(w.id) && !timersRef.current.has(w.id),
      );

      newWorkers.forEach((w, i) => {
        const timer = setTimeout(() => {
          setRevealedIds(p => new Set(p).add(w.id));
          timersRef.current.delete(w.id);
        }, 500 + i * 600);
        timersRef.current.set(w.id, timer);
      });

      // Remove revealed IDs for workers that reverted to non-done
      let next = prev;
      let changed = false;
      for (const id of prev) {
        if (!doneIds.has(id)) {
          if (!changed) { next = new Set(prev); changed = true; }
          next.delete(id);
        }
      }
      return changed ? next : prev;
    });
  }, [workers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(t => clearTimeout(t));
      timersRef.current.clear();
    };
  }, []);

  return revealedIds;
}
