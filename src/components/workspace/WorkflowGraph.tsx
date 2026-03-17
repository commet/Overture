'use client';

import type { OrchestrateStep as OrchestrateStepType, OrchestrateAnalysis } from '@/stores/types';
import { Bot, Brain, Handshake, Flag, Clock, Package, Scale } from 'lucide-react';

interface WorkflowGraphProps {
  steps: OrchestrateStepType[];
  analysis: OrchestrateAnalysis | null;
  editable?: boolean;
  onUpdateActor?: (index: number, actor: 'ai' | 'human' | 'both') => void;
  onToggleCheckpoint?: (index: number) => void;
  onRemoveStep?: (index: number) => void;
}

export function WorkflowGraph({ steps, analysis, editable = false, onUpdateActor, onToggleCheckpoint, onRemoveStep }: WorkflowGraphProps) {
  const criticalPath = analysis?.critical_path || [];

  return (
    <div className="space-y-0">
      {/* Track headers */}
      <div className="grid grid-cols-[80px_1fr_40px_1fr] gap-0 mb-2 px-2">
        <div />
        <div className="text-center">
          <span className="text-[10px] font-bold text-[#2d4a7c] bg-[var(--ai)] px-2 py-0.5 rounded-full">🤖 AI 트랙</span>
        </div>
        <div />
        <div className="text-center">
          <span className="text-[10px] font-bold text-[#8b6914] bg-[var(--human)] px-2 py-0.5 rounded-full">🧠 사람 트랙</span>
        </div>
      </div>

      {steps.map((step, i) => {
        const isCritical = criticalPath.includes(i + 1) || criticalPath.includes(i);
        const isAI = step.actor === 'ai';
        const isHuman = step.actor === 'human';
        const isBoth = step.actor === 'both';

        return (
          <div key={i} className="relative">
            {/* Connection line */}
            {i > 0 && (
              <div className="grid grid-cols-[80px_1fr_40px_1fr] gap-0">
                <div />
                <div className="flex justify-center"><div className="w-0.5 h-3 bg-[var(--border)]" /></div>
                <div className="flex justify-center"><div className="w-0.5 h-3 bg-[var(--border)]" /></div>
                <div className="flex justify-center"><div className="w-0.5 h-3 bg-[var(--border)]" /></div>
              </div>
            )}

            {/* Step row */}
            <div className={`grid grid-cols-[80px_1fr_40px_1fr] gap-0 items-start ${isCritical ? 'relative' : ''}`}>
              {/* Step number */}
              <div className="flex items-start justify-center pt-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-bold ${
                  isCritical
                    ? 'bg-red-100 text-red-700 ring-2 ring-red-300'
                    : step.checkpoint
                    ? 'bg-[var(--checkpoint)] text-amber-700'
                    : 'bg-[var(--bg)] text-[var(--text-secondary)]'
                }`}>
                  {step.checkpoint ? <Flag size={14} /> : i + 1}
                </div>
              </div>

              {/* AI track */}
              <div className="px-1">
                {(isAI || isBoth) ? (
                  <div className={`rounded-xl p-3 border transition-all ${
                    isBoth ? 'bg-[var(--ai)]/50 border-[var(--ai)]' : 'bg-[var(--ai)] border-[var(--ai)]'
                  } ${isCritical ? 'ring-1 ring-red-200' : ''}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Bot size={12} className="text-[#2d4a7c]" />
                      <span className="text-[11px] font-bold text-[#2d4a7c]">
                        {isBoth ? '협업 (AI 파트)' : 'AI 실행'}
                      </span>
                    </div>
                    <p className="text-[12px] text-[var(--text-primary)] leading-relaxed">{step.task}</p>
                    {step.expected_output && (
                      <p className="text-[10px] text-[#2d4a7c] mt-1.5 flex items-center gap-1">
                        <Package size={10} /> {step.expected_output}
                      </p>
                    )}
                    {step.estimated_time && (
                      <p className="text-[9px] text-[var(--text-secondary)] mt-1 flex items-center gap-1">
                        <Clock size={9} /> {step.estimated_time}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="h-full min-h-[60px] flex items-center justify-center">
                    <div className="w-full border border-dashed border-[var(--border)] rounded-xl p-2 text-center">
                      <span className="text-[10px] text-[var(--text-secondary)]">&mdash;</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Center connector */}
              <div className="flex items-center justify-center">
                {isBoth && (
                  <div className="w-6 h-6 rounded-full bg-[var(--collab)] flex items-center justify-center">
                    <Handshake size={12} className="text-[#2d6b2d]" />
                  </div>
                )}
                {step.checkpoint && !isBoth && (
                  <div className="w-6 h-6 rounded-full bg-[var(--checkpoint)] flex items-center justify-center">
                    <Flag size={12} className="text-amber-700" />
                  </div>
                )}
              </div>

              {/* Human track */}
              <div className="px-1">
                {(isHuman || isBoth) ? (
                  <div className={`rounded-xl p-3 border transition-all ${
                    isBoth ? 'bg-[var(--human)]/50 border-[var(--human)]' : 'bg-[var(--human)] border-[var(--human)]'
                  } ${isCritical ? 'ring-1 ring-red-200' : ''}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Brain size={12} className="text-[#8b6914]" />
                      <span className="text-[11px] font-bold text-[#8b6914]">
                        {isBoth ? '협업 (사람 파트)' : '사람 판단'}
                      </span>
                    </div>
                    {isBoth ? (
                      <>
                        {step.judgment && (
                          <p className="text-[12px] text-[var(--text-primary)] leading-relaxed">{step.judgment}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-[12px] text-[var(--text-primary)] leading-relaxed">{step.task}</p>
                    )}
                    {step.judgment && !isBoth && (
                      <p className="text-[10px] text-[#8b6914] mt-1.5 flex items-center gap-1">
                        <Scale size={10} /> {step.judgment}
                      </p>
                    )}
                    {step.checkpoint && (
                      <p className="text-[10px] text-amber-700 mt-1.5 flex items-center gap-1">
                        <Flag size={10} /> {step.checkpoint_reason}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="h-full min-h-[60px] flex items-center justify-center">
                    <div className="w-full border border-dashed border-[var(--border)] rounded-xl p-2 text-center">
                      <span className="text-[10px] text-[var(--text-secondary)]">&mdash;</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Edit controls */}
            {editable && (
              <div className="grid grid-cols-[80px_1fr_40px_1fr] gap-0 mt-1">
                <div />
                <div className="flex items-center gap-1 px-1">
                  {(['ai', 'human', 'both'] as const).map((actor) => (
                    <button
                      key={actor}
                      onClick={() => onUpdateActor?.(i, actor)}
                      className={`px-2 py-0.5 rounded text-[9px] font-medium border cursor-pointer transition-colors ${
                        step.actor === actor
                          ? actor === 'ai' ? 'border-[#2d4a7c] bg-[var(--ai)]' : actor === 'human' ? 'border-[#8b6914] bg-[var(--human)]' : 'border-[#2d6b2d] bg-[var(--collab)]'
                          : 'border-[var(--border)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {actor === 'ai' ? '🤖' : actor === 'human' ? '🧠' : '🤝'}
                    </button>
                  ))}
                  <button onClick={() => onToggleCheckpoint?.(i)} className={`px-2 py-0.5 rounded text-[9px] border cursor-pointer ${step.checkpoint ? 'border-amber-400 bg-[var(--checkpoint)]' : 'border-[var(--border)]'}`}>
                    ⚑
                  </button>
                  <button onClick={() => onRemoveStep?.(i)} className="px-2 py-0.5 rounded text-[9px] border border-[var(--border)] text-red-400 cursor-pointer hover:bg-red-50">
                    ✕
                  </button>
                </div>
                <div />
                <div />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
