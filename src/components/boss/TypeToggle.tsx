'use client';

import { motion } from 'framer-motion';
import { AXES } from '@/lib/boss/personality-types';
import { useBossStore } from '@/stores/useBossStore';

/**
 * 4-axis pill selector with boss context hints.
 * E/I  S/N  T/F  J/P — each with a boss-specific description.
 */
export function TypeToggle() {
  const axes = useBossStore((s) => s.axes);
  const setAxis = useBossStore((s) => s.setAxis);

  return (
    <div className="bt-row">
      {AXES.map((axis) => {
        const current = axes[axis.key];
        const isLeft = current === axis.left.code;
        const activeDesc = isLeft ? axis.left.desc : axis.right.desc;

        return (
          <div key={axis.key} className="bt-axis">
            <div className="bt-pair">
              <button
                type="button"
                onClick={() => setAxis(axis.key, axis.left.code)}
                className="bt-pill"
                data-active={isLeft}
              >
                {axis.left.code}
                {isLeft && (
                  <motion.div
                    className="bt-pill-bg"
                    layoutId={`bt-bg-${axis.key}`}
                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                  />
                )}
              </button>
              <button
                type="button"
                onClick={() => setAxis(axis.key, axis.right.code)}
                className="bt-pill"
                data-active={!isLeft}
              >
                {axis.right.code}
                {!isLeft && (
                  <motion.div
                    className="bt-pill-bg"
                    layoutId={`bt-bg-${axis.key}`}
                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                  />
                )}
              </button>
            </div>
            <p className="bt-desc">{activeDesc}</p>
          </div>
        );
      })}
    </div>
  );
}
