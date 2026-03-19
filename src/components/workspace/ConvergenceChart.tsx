'use client';

import { Card } from '@/components/ui/Card';
import type { RefinementIteration } from '@/stores/types';

interface ConvergenceChartProps {
  iterations: RefinementIteration[];
  threshold: number;
}

export function ConvergenceChart({ iterations, threshold }: ConvergenceChartProps) {
  if (iterations.length < 2) return null;

  // Scale width based on iteration count to prevent overlap
  const baseW = 300;
  const W = Math.max(baseW, iterations.length * 60);
  const H = 120;
  const pad = 10;
  const usable = W - pad * 2;

  return (
    <Card className="!p-4">
      <h4 className="text-[12px] font-bold text-[var(--text-secondary)] mb-3">수렴 추이</h4>
      <div className={W > baseW ? 'overflow-x-auto' : ''}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: H, minWidth: W > baseW ? W : undefined }}>
        {/* Threshold line */}
        <line
          x1="0"
          y1={H - threshold * 100}
          x2={W}
          y2={H - threshold * 100}
          stroke="var(--text-tertiary)"
          strokeDasharray="4 4"
          strokeWidth="1"
        />
        <text
          x={W}
          y={H - threshold * 100 - 4}
          textAnchor="end"
          fill="var(--text-tertiary)"
          fontSize="9"
        >
          목표 {Math.round(threshold * 100)}%
        </text>

        {/* Convergence line */}
        <polyline
          points={iterations
            .map((iter, i) => {
              const x = iterations.length === 1 ? W / 2 : (i / (iterations.length - 1)) * usable + pad;
              const y = H - iter.convergence_score * 100;
              return `${x},${y}`;
            })
            .join(' ')}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {iterations.map((iter, i) => {
          const x = iterations.length === 1 ? W / 2 : (i / (iterations.length - 1)) * usable + pad;
          const y = H - iter.convergence_score * 100;
          const isAbove = iter.convergence_score >= threshold;
          return (
            <g key={i}>
              <circle
                cx={x}
                cy={y}
                r="4"
                fill={isAbove ? 'var(--success)' : 'var(--accent)'}
                stroke="white"
                strokeWidth="2"
              />
              <text
                x={x}
                y={y - 10}
                textAnchor="middle"
                fill="var(--text-primary)"
                fontSize="10"
                fontWeight="bold"
              >
                {Math.round(iter.convergence_score * 100)}%
              </text>
            </g>
          );
        })}
      </svg>
      </div>
    </Card>
  );
}
