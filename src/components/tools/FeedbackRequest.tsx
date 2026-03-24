'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import type { Persona, OrchestrateItem, DecomposeItem } from '@/stores/types';
import { useOrchestrateStore } from '@/stores/useOrchestrateStore';
import { useDecomposeStore } from '@/stores/useDecomposeStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { orchestrateToMarkdown } from '@/lib/export';
import { Send, Loader2, Upload, Check, AlertTriangle, ChevronDown, ChevronUp, Bot, Brain, Flag } from 'lucide-react';

interface FeedbackRequestProps {
  personas: Persona[];
  onSubmit: (data: {
    documentTitle: string;
    documentText: string;
    personaIds: string[];
    perspective: string;
    intensity: string;
  }) => void;
  loading?: boolean;
  initialContent?: string;
  initialTitle?: string;
  initialPersonaIds?: string[];
}

const perspectives = [
  { value: '전반적 인상', description: '전체적인 방향성과 첫인상' },
  { value: '논리 구조', description: '논리적 허점과 구조적 문제' },
  { value: '실행 가능성', description: '현실적으로 실행할 수 있는지' },
  { value: '리스크', description: '위험 요소와 실패 가능성' },
  { value: '숫자/데이터', description: '근거와 수치의 신뢰성' },
];

const intensities = [
  { value: '부드럽게', mark: 'p', description: '건설적 피드백 위주' },
  { value: '솔직하게', mark: 'mf', description: '좋은 점과 문제점 균형' },
  { value: '까다롭게', mark: 'ff', description: '최악의 시나리오 중심' },
];

const INFLUENCE_STYLES = {
  high: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', label: '높음' },
  medium: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', label: '중간' },
  low: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', label: '낮음' },
};

export function FeedbackRequest({ personas, onSubmit, loading, initialContent, initialTitle, initialPersonaIds }: FeedbackRequestProps) {
  const { items: orchestrateItems } = useOrchestrateStore();
  const { items: decomposeItems } = useDecomposeStore();
  const { currentProjectId } = useProjectStore();

  const [documentText, setDocumentText] = useState(initialContent || '');
  const [documentTitle, setDocumentTitle] = useState(initialTitle || '');
  const [selectedIds, setSelectedIds] = useState<string[]>(initialPersonaIds || []);
  const [perspective, setPerspective] = useState('솔직하게');
  const [intensity, setIntensity] = useState('솔직하게');
  const [showFullDoc, setShowFullDoc] = useState(false);
  const [useCustomDoc, setUseCustomDoc] = useState(false);

  // Auto-populate from orchestrate if available
  const relatedOrchestrate = currentProjectId
    ? orchestrateItems.filter(o => o.project_id === currentProjectId && o.status === 'done' && o.analysis)
        .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))[0]
    : null;

  const relatedDecompose = currentProjectId
    ? decomposeItems.filter(d => d.project_id === currentProjectId && d.status === 'done' && d.analysis)
        .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))[0]
    : null;

  useEffect(() => {
    if (relatedOrchestrate && !initialContent && !useCustomDoc) {
      const md = orchestrateToMarkdown(relatedOrchestrate);
      setDocumentText(md);
      setDocumentTitle('편곡 결과물');
    }
  }, [relatedOrchestrate, initialContent, useCustomDoc]);

  const togglePersona = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setDocumentText(evt.target?.result as string);
      setDocumentTitle(file.name.replace(/\.(txt|md)$/, ''));
      setUseCustomDoc(true);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">

      {/* ── 1. 검증 대상 (자동 로드 or 직접 입력) ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-[15px] font-bold text-[var(--text-primary)]">검증 대상</h3>
            <p className="text-[12px] text-[var(--text-secondary)]">이해관계자 앞에서 리허설할 자료</p>
          </div>
          {relatedOrchestrate && !useCustomDoc && (
            <button
              onClick={() => setUseCustomDoc(true)}
              className="text-[11px] text-[var(--accent)] hover:underline cursor-pointer"
            >
              직접 입력으로 전환
            </button>
          )}
          {useCustomDoc && relatedOrchestrate && (
            <button
              onClick={() => { setUseCustomDoc(false); setDocumentText(orchestrateToMarkdown(relatedOrchestrate)); }}
              className="text-[11px] text-[var(--accent)] hover:underline cursor-pointer"
            >
              편곡 결과 사용
            </button>
          )}
        </div>

        {/* Auto-populated structured preview */}
        {relatedOrchestrate?.analysis && !useCustomDoc ? (
          <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
            {/* Summary */}
            <div className="px-4 py-3 bg-[var(--ai)]">
              <div className="flex items-center gap-2 mb-1">
                <Check size={12} className="text-[var(--accent)]" />
                <span className="text-[12px] font-semibold text-[var(--accent)]">편곡 결과가 자동으로 연결되었습니다</span>
              </div>
              <p className="text-[14px] font-bold text-[var(--text-primary)] mt-1">
                {relatedOrchestrate.analysis.governing_idea}
              </p>
            </div>

            {/* Key info */}
            <div className="px-4 py-3 border-t border-[var(--border-subtle)]">
              <div className="flex flex-wrap gap-3 text-[11px]">
                <span className="text-[var(--text-secondary)]">
                  <Bot size={10} className="inline mr-1" />
                  {relatedOrchestrate.analysis.steps?.filter(s => s.actor === 'ai').length || 0} AI 단계
                </span>
                <span className="text-[var(--text-secondary)]">
                  <Brain size={10} className="inline mr-1" />
                  {relatedOrchestrate.analysis.steps?.filter(s => s.actor === 'human').length || 0} 사람 단계
                </span>
                <span className="text-[var(--text-secondary)]">
                  <Flag size={10} className="inline mr-1" />
                  {relatedOrchestrate.analysis.steps?.filter(s => s.checkpoint).length || 0} 체크포인트
                </span>
                {relatedOrchestrate.analysis.key_assumptions?.length > 0 && (
                  <span className="text-amber-700">
                    <AlertTriangle size={10} className="inline mr-1" />
                    핵심 가정 {relatedOrchestrate.analysis.key_assumptions.length}건
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowFullDoc(!showFullDoc)}
                className="flex items-center gap-1 mt-2 text-[11px] text-[var(--text-tertiary)] hover:text-[var(--accent)] cursor-pointer"
              >
                {showFullDoc ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                {showFullDoc ? '접기' : '전체 내용 보기'}
              </button>
              {showFullDoc && (
                <pre className="mt-2 text-[11px] text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto bg-[var(--bg)] rounded-lg p-3">
                  {documentText}
                </pre>
              )}
            </div>
          </div>
        ) : (
          /* Manual input */
          <div className="space-y-2">
            <textarea
              value={documentText}
              onChange={(e) => setDocumentText(e.target.value)}
              placeholder="보고서, 기획서, 제안서 등의 내용을 붙여넣으세요..."
              className="w-full bg-[var(--bg)] border-[1.5px] border-[var(--border)] rounded-xl px-4 py-3 text-[14px] leading-relaxed placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] resize-none"
              rows={6}
            />
            <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-[var(--border)] text-[12px] text-[var(--text-secondary)] hover:border-[var(--accent)] cursor-pointer">
              <Upload size={12} /> .txt / .md 파일 업로드
              <input type="file" accept=".txt,.md" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        )}
      </div>

      {/* ── 2. 이해관계자 선택 ── */}
      <div>
        <h3 className="text-[15px] font-bold text-[var(--text-primary)] mb-1">누구의 시점에서?</h3>
        <p className="text-[12px] text-[var(--text-secondary)] mb-3">최대 3명 선택 ({selectedIds.length}/3) <span className="text-[var(--text-tertiary)]">— 3명 이상이면 피드백 종합이 어려워집니다</span></p>

        {personas.length === 0 ? (
          <div className="text-center py-6 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg)]">
            <p className="text-[13px] text-[var(--text-secondary)]">먼저 페르소나를 등록해주세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {personas.map((p) => {
              const selected = selectedIds.includes(p.id);
              const inf = INFLUENCE_STYLES[p.influence || 'medium'];
              return (
                <button
                  key={p.id}
                  onClick={() => togglePersona(p.id)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl border text-left
                    transition-all duration-200 cursor-pointer
                    ${selected
                      ? 'border-[var(--accent)] bg-[var(--ai)] shadow-sm -translate-y-0.5'
                      : 'border-[var(--border-subtle)] hover:border-[var(--border)]'
                    }
                  `}
                >
                  {/* Avatar */}
                  <div className={`
                    w-10 h-10 rounded-xl flex items-center justify-center text-[16px] font-bold shrink-0
                    ${selected ? 'bg-[var(--accent)] text-[var(--bg)]' : 'bg-[var(--bg)] text-[var(--text-secondary)]'}
                  `}>
                    {p.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{p.name}</p>
                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${inf.bg} ${inf.text}`}>
                        {inf.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] truncate">{p.role}{p.organization ? ` · ${p.organization}` : ''}</p>
                  </div>
                  {selected && (
                    <Check size={16} className="text-[var(--accent)] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 3. 피드백 설정 — inline compact ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-[13px] font-semibold text-[var(--text-primary)] mb-2">피드백 관점</h4>
          <div className="flex flex-wrap gap-1.5">
            {perspectives.map((p) => (
              <button
                key={p.value}
                onClick={() => setPerspective(p.value)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors cursor-pointer ${
                  perspective === p.value
                    ? 'border-[var(--accent)] bg-[var(--ai)] text-[var(--accent)]'
                    : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border)]'
                }`}
                title={p.description}
              >
                {p.value}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-[13px] font-semibold text-[var(--text-primary)] mb-2">피드백 강도</h4>
          <div className="flex gap-1.5">
            {intensities.map((item) => (
              <button
                key={item.value}
                onClick={() => setIntensity(item.value)}
                className={`flex-1 py-2 rounded-lg text-[12px] font-medium border text-center transition-colors cursor-pointer ${
                  intensity === item.value
                    ? 'border-[var(--accent)] bg-[var(--ai)] text-[var(--accent)]'
                    : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border)]'
                }`}
              >
                {item.value}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-[11px] text-[var(--text-tertiary)]">
          {selectedIds.length > 0
            ? `${selectedIds.length}명의 이해관계자가 ${perspective} 관점에서 ${intensity} 검토합니다`
            : '이해관계자를 선택하세요'
          }
        </p>
        <Button
          onClick={() => onSubmit({ documentTitle, documentText, personaIds: selectedIds, perspective, intensity })}
          disabled={!documentText.trim() || selectedIds.length === 0 || loading}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {loading ? '리허설 진행 중...' : '리허설 시작'}
        </Button>
      </div>
    </div>
  );
}
