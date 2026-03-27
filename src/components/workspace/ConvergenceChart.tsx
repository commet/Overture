'use client';

import { Card } from '@/components/ui/Card';
import type { RefineIteration } from '@/stores/types';

interface ConvergenceChartProps {
  iterations: RefineIteration[];
  initialIssueCount: number;
}

export function ConvergenceChart({ iterations, initialIssueCount }: ConvergenceChartProps) {
  if (iterations.length === 0) return null;

  const dataPoints = [
    { label: '초기', issues: initialIssueCount, critical: -1 },
    ...iterations.map((iter, i) => ({
      label: `v${i + 2}`,
      issues: iter.convergence.total_issues,
      critical: iter.convergence.critical_risks,
    })),
  ];

  const maxIssues = Math.max(...dataPoints.map(d => d.issues), 1);
  const W = Math.max(280, dataPoints.length * 70);
  const H = 100;
  const pad = 10;
  const usable = W - pad * 2;

  return (
    <Card className="!p-4">
      <h4 className="text-[12px] font-bold text-[var(--text-secondary)] mb-3">이슈 추이</h4>
      <div className={W > 280 ? 'overflow-x-auto' : ''}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: H, minWidth: W > 280 ? W : undefined }}>
          {/* Issue count line */}
          <polyline
            points={dataPoints
              .map((d, i) => {
                const x = dataPoints.length === 1 ? W / 2 : (i / (dataPoints.length - 1)) * usable + pad;
                const y = H - pad - ((d.issues / maxIssues) * (H - pad * 3));
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
          {dataPoints.map((d, i) => {
            const x = dataPoints.length === 1 ? W / 2 : (i / (dataPoints.length - 1)) * usable + pad;
            const y = H - pad - ((d.issues / maxIssues) * (H - pad * 3));
            const hasCritical = d.critical > 0;
            return (
              <g key={i}>
                <circle
                  cx={x} cy={y} r="4"
                  fill={hasCritical ? 'var(--risk-critical)' : d.critical === 0 ? 'var(--success)' : 'var(--accent)'}
                  stroke="white" strokeWidth="2"
                />
                <text x={x} y={y - 10} textAnchor="middle" fill="var(--text-primary)" fontSize="10" fontWeight="bold">
                  {d.issues}
                </text>
                <text x={x} y={H - 2} textAnchor="middle" fill="var(--text-tertiary)" fontSize="8">
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </Card>
  );
}
