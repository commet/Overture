'use client';

import { useState, useRef } from 'react';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AnimatedPlaceholder } from '@/components/ui/AnimatedPlaceholder';
import { callLLMJson } from '@/lib/llm';
import type { Persona } from '@/stores/types';
import { Sparkles, Loader2, Check, Pencil, Upload, ChevronRight, ChevronLeft, FileText, UserCircle } from 'lucide-react';

interface PersonaFormProps {
  persona?: Partial<Persona>;
  onSave: (data: Partial<Persona>) => void;
  onCancel: () => void;
}

// ─── Presets & Trait Options ───

interface RolePreset {
  emoji: string;
  label: string;
  role: string;
  traitDefaults: {
    priorities: string[];
    styles: string[];
    concerns: string[];
    traits: string[];
  };
}

const ROLE_PRESETS: RolePreset[] = [
  {
    emoji: '👔', label: 'CEO / 대표', role: 'CEO',
    traitDefaults: {
      priorities: ['시장 기회와 성장', '비전과 전략 방향', '투자자/이사회 관리', '경쟁 포지셔닝', '팀 빌딩과 문화'],
      styles: ['큰 그림부터 듣고 싶어함', '한 페이지 요약 선호', '임팩트 중심 소통', '빠른 판단을 선호', '비유와 스토리에 반응'],
      concerns: ['매출 성장률 둔화', '경쟁사 동향', '핵심 인재 이탈', '시장 타이밍', '브랜드 이미지'],
      traits: ['비전 중심', '빠른 판단', '임팩트 지향', '직관적'],
    },
  },
  {
    emoji: '📊', label: 'CFO / 재무', role: 'CFO',
    traitDefaults: {
      priorities: ['ROI와 비용 효율', '정량적 근거', '리스크 관리', '현금 흐름', '재무 모델링'],
      styles: ['숫자로 말하기', '결론부터', '3페이지 이상 안 읽음', '근거 출처 요구', '테이블/차트 선호'],
      concerns: ['비용 초과', '투자 대비 수익', '현금 흐름 압박', '규제/컴플라이언스', '예산 삭감 압력'],
      traits: ['숫자 중심', '보수적', '근거 요구', '리스크 민감'],
    },
  },
  {
    emoji: '⚙️', label: 'CTO / 기술', role: 'CTO',
    traitDefaults: {
      priorities: ['기술 실현 가능성', '확장성/유지보수', '기술 부채 관리', '보안', '팀 생산성'],
      styles: ['구체적 스펙 기반', '아키텍처 다이어그램', '트레이드오프 분석', 'POC 먼저', '비동기 소통 선호'],
      concerns: ['기술 부채 누적', '시스템 안정성', '채용 난이도', '레거시 마이그레이션', '보안 취약점'],
      traits: ['기술 깊이', '시스템 사고', '리스크 민감', '실용적'],
    },
  },
  {
    emoji: '📢', label: '마케팅 리드', role: '마케팅 디렉터',
    traitDefaults: {
      priorities: ['고객 관점', '브랜드 일관성', '채널별 ROI', '시장 트렌드', '경쟁사 분석'],
      styles: ['데이터 + 스토리', '시각적 자료 선호', '고객 사례 기반', '트렌드 레퍼런스', 'A/B 테스트 지향'],
      concerns: ['CAC 상승', '전환율 하락', '브랜드 인지도', '채널 포화', '경쟁사 공격적 마케팅'],
      traits: ['고객 중심', '데이터 드리븐', '트렌드 민감', '크리에이티브'],
    },
  },
  {
    emoji: '💰', label: '투자자 / VC', role: '투자자',
    traitDefaults: {
      priorities: ['시장 규모 (TAM/SAM)', '성장 지표', 'Exit 전략', '팀 역량', '유닛 이코노믹스'],
      styles: ['핵심 지표 위주', '벤치마크 비교', '간결한 덱', '포트폴리오 시너지', '레퍼런스 체크'],
      concerns: ['번레이트', '경쟁 우위 지속성', '시장 타이밍', '팀 실행력', '규제 리스크'],
      traits: ['지표 중심', '비교 분석', '스케일 지향', '패턴 매칭'],
    },
  },
  {
    emoji: '🤝', label: '클라이언트', role: '클라이언트 담당자',
    traitDefaults: {
      priorities: ['납기와 품질', '비용 대비 가치', '소통 투명성', '리스크 사전 공유', '실무적 산출물'],
      styles: ['정기 진행 업데이트', '리스크 사전 공유', '실무적 언어', '문서화 중시', '마일스톤 기반'],
      concerns: ['일정 지연', '스코프 크리프', '품질 이슈', '담당자 교체', '예산 초과'],
      traits: ['실용적', '일정 민감', '신뢰 중시', '결과 지향'],
    },
  },
];

const STRUCTURE_PROMPT = `사용자가 특정 이해관계자에 대해 자유롭게 작성한 텍스트를 읽고, 아래 JSON 구조로 정리하세요. 텍스트에 명시된 정보만 추출하세요. JSON만 출력.

{
  "name": "",
  "role": "",
  "organization": "",
  "priorities": "",
  "communication_style": "",
  "known_concerns": "",
  "relationship_notes": "",
  "extracted_traits": []
}

extracted_traits는 핵심 성향 2~4개의 짧은 키워드.`;

const FILE_ANALYZE_PROMPT = `아래 텍스트(회의록, 이메일, 채팅 등)에서 핵심 의사결정자 1명의 성향, 패턴, 스타일을 분석하여 페르소나 프로필을 생성하세요. JSON만 출력.

{
  "name": "",
  "role": "",
  "organization": "",
  "priorities": "",
  "communication_style": "",
  "known_concerns": "",
  "relationship_notes": "",
  "extracted_traits": []
}`;

// ─── Chip Selector Sub-component ───

function ChipSelector({
  label,
  options,
  selected,
  onToggle,
  customValue,
  onCustomChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
  customValue: string;
  onCustomChange: (val: string) => void;
}) {
  return (
    <div>
      <label className="text-[13px] font-bold text-[var(--text-primary)] mb-2 block">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {options.map((opt) => {
          const isSelected = selected.includes(opt);
          return (
            <button
              key={opt}
              onClick={() => onToggle(opt)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all cursor-pointer ${
                isSelected
                  ? 'border-[var(--accent)] bg-[var(--ai)] text-[var(--text-primary)] shadow-sm'
                  : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]'
              }`}
            >
              {isSelected && <Check size={10} className="inline mr-1" />}
              {opt}
            </button>
          );
        })}
      </div>
      <input
        type="text"
        value={customValue}
        onChange={(e) => onCustomChange(e.target.value)}
        placeholder="+ 직접 추가..."
        className="w-full bg-[var(--bg)] border border-dashed border-[var(--border)] rounded-lg px-3 py-2 text-[12px] text-[var(--text-secondary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
      />
    </div>
  );
}

// ─── Main Form ───

type Step = 'method' | 'preset' | 'configurator' | 'freetext' | 'structuring' | 'review';

export function PersonaForm({ persona, onSave, onCancel }: PersonaFormProps) {
  const [step, setStep] = useState<Step>(persona?.name ? 'review' : 'method');
  const [selectedPreset, setSelectedPreset] = useState<RolePreset | null>(null);

  // Configurator state
  const [configStep, setConfigStep] = useState(0);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [customPriority, setCustomPriority] = useState('');
  const [customStyle, setCustomStyle] = useState('');
  const [customConcern, setCustomConcern] = useState('');

  // Free text state
  const [freeText, setFreeText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Final form state
  const [form, setForm] = useState({
    name: persona?.name || '',
    role: persona?.role || '',
    organization: persona?.organization || '',
    priorities: persona?.priorities || '',
    communication_style: persona?.communication_style || '',
    known_concerns: persona?.known_concerns || '',
    relationship_notes: persona?.relationship_notes || '',
    extracted_traits: persona?.extracted_traits || [] as string[],
    decision_style: persona?.decision_style as Persona['decision_style'],
    risk_tolerance: persona?.risk_tolerance as Persona['risk_tolerance'],
    success_metric: persona?.success_metric || '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toggle a chip selection
  const toggleItem = (list: string[], setList: (l: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  // Handle preset selection → enter configurator
  const handlePresetSelect = (preset: RolePreset) => {
    setSelectedPreset(preset);
    setSelectedPriorities([]);
    setSelectedStyles([]);
    setSelectedConcerns([]);
    setSelectedTraits([]);
    setConfigStep(0);
    setStep('configurator');
  };

  // Finish configurator → go to review
  const finishConfigurator = () => {
    if (!selectedPreset) return;
    const allPriorities = [...selectedPriorities, ...(customPriority ? [customPriority] : [])];
    const allStyles = [...selectedStyles, ...(customStyle ? [customStyle] : [])];
    const allConcerns = [...selectedConcerns, ...(customConcern ? [customConcern] : [])];

    setForm({
      name: '',
      role: selectedPreset.role,
      organization: '',
      priorities: allPriorities.join('. '),
      communication_style: allStyles.join('. '),
      known_concerns: allConcerns.join('. '),
      relationship_notes: '',
      extracted_traits: selectedTraits.length > 0 ? selectedTraits : selectedPreset.traitDefaults.traits.slice(0, 3),
      decision_style: undefined,
      risk_tolerance: undefined,
      success_metric: '',
    });
    setStep('review');
  };

  // Free text → AI structure
  const handleFreeTextStructure = async () => {
    if (!freeText.trim()) return;
    setLoading(true);
    setError('');
    setStep('structuring');
    try {
      const result = await callLLMJson<Record<string, unknown>>(
        [{ role: 'user', content: freeText }],
        { system: STRUCTURE_PROMPT, maxTokens: 1000, shape: { extracted_traits: 'array' } }
      );
      setForm({
        name: (result.name as string) || '',
        role: (result.role as string) || '',
        organization: (result.organization as string) || '',
        priorities: (result.priorities as string) || '',
        communication_style: (result.communication_style as string) || '',
        known_concerns: (result.known_concerns as string) || '',
        relationship_notes: (result.relationship_notes as string) || '',
        extracted_traits: (result.extracted_traits as string[]) || [],
        decision_style: undefined,
        risk_tolerance: undefined,
        success_metric: '',
      });
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 구조화에 실패했습니다.');
      setStep('freetext');
    } finally {
      setLoading(false);
    }
  };

  // File upload → AI analyze
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError('');
    setStep('structuring');
    try {
      const text = await file.text();
      const result = await callLLMJson<Record<string, unknown>>(
        [{ role: 'user', content: text }],
        { system: FILE_ANALYZE_PROMPT, maxTokens: 1000, shape: { extracted_traits: 'array' } }
      );
      setForm({
        name: (result.name as string) || '',
        role: (result.role as string) || '',
        organization: (result.organization as string) || '',
        priorities: (result.priorities as string) || '',
        communication_style: (result.communication_style as string) || '',
        known_concerns: (result.known_concerns as string) || '',
        relationship_notes: (result.relationship_notes as string) || '',
        extracted_traits: (result.extracted_traits as string[]) || [],
        decision_style: undefined,
        risk_tolerance: undefined,
        success_metric: '',
      });
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일 분석에 실패했습니다.');
      setStep('method');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const configSteps = selectedPreset
    ? [
        {
          label: '우선순위',
          desc: `이 ${selectedPreset.label}이 가장 중요하게 보는 것은?`,
          options: selectedPreset.traitDefaults.priorities,
          selected: selectedPriorities,
          onToggle: (item: string) => toggleItem(selectedPriorities, setSelectedPriorities, item),
          custom: customPriority,
          onCustom: setCustomPriority,
        },
        {
          label: '커뮤니케이션 스타일',
          desc: '어떻게 소통하는 것을 선호하나요?',
          options: selectedPreset.traitDefaults.styles,
          selected: selectedStyles,
          onToggle: (item: string) => toggleItem(selectedStyles, setSelectedStyles, item),
          custom: customStyle,
          onCustom: setCustomStyle,
        },
        {
          label: '최근 관심사/우려',
          desc: '요즘 이 사람이 신경 쓰는 것은?',
          options: selectedPreset.traitDefaults.concerns,
          selected: selectedConcerns,
          onToggle: (item: string) => toggleItem(selectedConcerns, setSelectedConcerns, item),
          custom: customConcern,
          onCustom: setCustomConcern,
        },
        {
          label: '핵심 성향',
          desc: '이 사람을 한마디로 표현하면?',
          options: selectedPreset.traitDefaults.traits,
          selected: selectedTraits,
          onToggle: (item: string) => toggleItem(selectedTraits, setSelectedTraits, item),
          custom: '',
          onCustom: () => {},
        },
      ]
    : [];

  return (
    <div className="space-y-4">

      {/* ── METHOD SELECTION ── */}
      {step === 'method' && (
        <div className="space-y-3">
          <h3 className="text-[15px] font-bold text-[var(--text-primary)]">어떤 방법으로 만드시겠어요?</h3>

          <button onClick={() => setStep('preset')}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--ai)]/30 transition-all text-left cursor-pointer group">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
              <UserCircle size={20} className="text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-[var(--text-primary)]">유형에서 시작</p>
              <p className="text-[12px] text-[var(--text-secondary)]">CEO, CFO 등 선택 후 성향을 클릭으로 조합</p>
            </div>
            <ChevronRight size={16} className="text-[var(--text-secondary)] group-hover:text-[var(--accent)]" />
          </button>

          <button onClick={() => setStep('freetext')}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--ai)]/30 transition-all text-left cursor-pointer group">
            <div className="w-10 h-10 rounded-xl bg-[var(--ai)] flex items-center justify-center shrink-0">
              <Sparkles size={20} className="text-[#2d4a7c]" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-[var(--text-primary)]">자유롭게 설명</p>
              <p className="text-[12px] text-[var(--text-secondary)]">아는 것을 적으면 AI가 프로필로 구조화</p>
            </div>
            <ChevronRight size={16} className="text-[var(--text-secondary)] group-hover:text-[var(--accent)]" />
          </button>

          <button onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--ai)]/30 transition-all text-left cursor-pointer group">
            <div className="w-10 h-10 rounded-xl bg-[var(--human)] flex items-center justify-center shrink-0">
              <FileText size={20} className="text-[#8b6914]" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-[var(--text-primary)]">파일에서 분석</p>
              <p className="text-[12px] text-[var(--text-secondary)]">회의록, 이메일, 채팅에서 자동 추출</p>
            </div>
            <ChevronRight size={16} className="text-[var(--text-secondary)] group-hover:text-[var(--accent)]" />
          </button>
          <input ref={fileInputRef} type="file" accept=".txt,.md,.csv" onChange={handleFileUpload} className="hidden" />

          <button onClick={() => setStep('review')}
            className="w-full flex items-center gap-3 p-3 text-[13px] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors cursor-pointer">
            <Pencil size={14} /> 직접 입력하기
          </button>
        </div>
      )}

      {/* ── PRESET SELECTION ── */}
      {step === 'preset' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-[var(--text-primary)]">어떤 유형인가요?</h3>
            <button onClick={() => setStep('method')} className="text-[12px] text-[var(--accent)] cursor-pointer hover:underline">뒤로</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ROLE_PRESETS.map((preset) => (
              <button
                key={preset.role}
                onClick={() => handlePresetSelect(preset)}
                className="flex flex-col items-center gap-1.5 p-4 rounded-xl border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--ai)]/30 transition-all cursor-pointer"
              >
                <span className="text-[28px]">{preset.emoji}</span>
                <span className="text-[13px] font-semibold text-[var(--text-primary)]">{preset.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── TRAIT CONFIGURATOR ── */}
      {step === 'configurator' && selectedPreset && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-[var(--text-primary)]">
              {selectedPreset.emoji} {selectedPreset.label} 페르소나 설정
            </h3>
            <button onClick={() => setStep('preset')} className="text-[12px] text-[var(--accent)] cursor-pointer hover:underline">유형 변경</button>
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5 justify-center">
            {configSteps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === configStep ? 'w-6 bg-[var(--accent)]' : i < configStep ? 'w-1.5 bg-[var(--success)]' : 'w-1.5 bg-[var(--border)]'
                }`}
              />
            ))}
          </div>

          {/* Current config step */}
          <div className="animate-fade-in" key={configStep}>
            <p className="text-[13px] text-[var(--text-secondary)] mb-3">
              {configSteps[configStep].desc}
            </p>
            <ChipSelector
              label={configSteps[configStep].label}
              options={configSteps[configStep].options}
              selected={configSteps[configStep].selected}
              onToggle={configSteps[configStep].onToggle}
              customValue={configSteps[configStep].custom}
              onCustomChange={configSteps[configStep].onCustom}
            />
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConfigStep(Math.max(0, configStep - 1))}
              disabled={configStep === 0}
            >
              <ChevronLeft size={14} /> 이전
            </Button>
            {configStep < configSteps.length - 1 ? (
              <Button size="sm" onClick={() => setConfigStep(configStep + 1)}>
                다음 <ChevronRight size={14} />
              </Button>
            ) : (
              <Button size="sm" onClick={finishConfigurator}>
                <Check size={14} /> 완료
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── FREE TEXT ── */}
      {step === 'freetext' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-[var(--text-primary)]">이 사람에 대해 자유롭게 적어주세요</h3>
            <button onClick={() => setStep('method')} className="text-[12px] text-[var(--accent)] cursor-pointer hover:underline">뒤로</button>
          </div>
          <p className="text-[12px] text-[var(--text-secondary)]">이름, 직책, 성격, 의사결정 스타일, 최근 관심사 — 무엇이든.</p>
          <div className="relative">
            <AnimatedPlaceholder
              texts={[
                '김 상무님은 CFO입니다. ROI를 최우선시하고, 결론부터 듣고 싶어합니다.',
                '박 대표님은 비전형 리더입니다. 큰 그림을 먼저 보고, 시장 기회를 놓치면 안 된다고 강조합니다.',
                '이 팀장은 기술 출신입니다. 실현 가능성과 구체적 스펙을 먼저 확인하려 합니다.',
                '정 이사님은 투자자입니다. 유닛 이코노믹스와 시장 규모부터 봅니다.',
                '최 부장은 클라이언트 측 PM입니다. 납기와 리스크 사전 공유를 중시합니다.',
              ]}
              visible={!freeText.trim()}
              className="absolute left-4 top-3 text-[14px] text-[var(--text-secondary)] leading-[1.7] max-w-[calc(100%-2rem)] truncate"
            />
            <textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              className="w-full bg-[var(--bg)] border-[1.5px] border-[var(--border)] rounded-[10px] px-4 py-3 text-[15px] leading-[1.7] placeholder:text-[var(--text-secondary)] placeholder:text-[14px] focus:outline-none focus:border-[var(--accent)] resize-none"
              rows={5}
            />
          </div>
          {error && <p className="text-[13px] text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex justify-end">
            <Button onClick={handleFreeTextStructure} disabled={!freeText.trim() || loading}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              AI로 정리하기
            </Button>
          </div>
        </div>
      )}

      {/* ── STRUCTURING (Loading) ── */}
      {step === 'structuring' && (
        <div className="text-center py-8 space-y-3">
          <Loader2 size={28} className="mx-auto animate-spin text-[var(--accent)]" />
          <p className="text-[14px] text-[var(--text-secondary)]">페르소나를 구조화하고 있습니다...</p>
        </div>
      )}

      {/* ── REVIEW & EDIT ── */}
      {step === 'review' && (
        <div className="space-y-3 animate-fade-in">
          {!persona?.name && (
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-[var(--text-primary)]">프로필 확인 및 수정</h3>
              <button onClick={() => setStep('method')} className="text-[12px] text-[var(--accent)] cursor-pointer hover:underline">다른 방법으로</button>
            </div>
          )}
          {form.extracted_traits.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-1">
              {form.extracted_traits.map((trait, i) => (
                <Badge key={i} variant="ai">{trait}</Badge>
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[13px] font-semibold">이름 *</label>
              <input type="text" value={form.name} onChange={(e) => handleFieldChange('name', e.target.value)} placeholder="실명 또는 별칭" maxLength={50}
                className="bg-[var(--bg)] border-[1.5px] border-[var(--border)] rounded-[10px] px-3 py-2 text-[14px] focus:outline-none focus:border-[var(--accent)]" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[13px] font-semibold">역할 *</label>
              <input type="text" value={form.role} onChange={(e) => handleFieldChange('role', e.target.value)} placeholder="직책/역할" maxLength={80}
                className="bg-[var(--bg)] border-[1.5px] border-[var(--border)] rounded-[10px] px-3 py-2 text-[14px] focus:outline-none focus:border-[var(--accent)]" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-semibold">소속</label>
            <input type="text" value={form.organization} onChange={(e) => handleFieldChange('organization', e.target.value)} placeholder="우리 회사 / 투자사 / 고객사" maxLength={80}
              className="bg-[var(--bg)] border-[1.5px] border-[var(--border)] rounded-[10px] px-3 py-2 text-[14px] focus:outline-none focus:border-[var(--accent)]" />
          </div>
          <Field label="우선순위 *" placeholder="이 사람이 가장 중요하게 보는 것" maxLength={300}
            value={form.priorities} onChange={(e) => handleFieldChange('priorities', e.target.value)} />
          <Field label="커뮤니케이션 스타일" placeholder="선호하는 보고/소통 방식" maxLength={300}
            value={form.communication_style} onChange={(e) => handleFieldChange('communication_style', e.target.value)} />
          <Field label="최근 관심사/우려" placeholder="요즘 신경 쓰는 것" maxLength={300}
            value={form.known_concerns} onChange={(e) => handleFieldChange('known_concerns', e.target.value)} />
          <Field label="관계 메모" placeholder="나와의 관계, 보고 빈도 등" maxLength={300}
            value={form.relationship_notes} onChange={(e) => handleFieldChange('relationship_notes', e.target.value)} />

          {/* Structured persona fields */}
          <div className="pt-2 border-t border-[var(--border-subtle)]">
            <p className="text-[12px] font-semibold text-[var(--text-secondary)] mb-2">의사결정 성향 (선택)</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-3">
              {[
                { value: 'analytical', label: '데이터 중심' },
                { value: 'intuitive', label: '직관/경험' },
                { value: 'consensus', label: '합의 중시' },
                { value: 'directive', label: '빠른 결정' },
              ].map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setForm(f => ({ ...f, decision_style: (f.decision_style === opt.value ? undefined : opt.value) as Persona['decision_style'] }))}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border cursor-pointer transition-all ${
                    form.decision_style === opt.value ? 'border-[var(--accent)] bg-[var(--ai)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-secondary)]'
                  }`}
                >{opt.label}</button>
              ))}
            </div>
            <p className="text-[12px] font-semibold text-[var(--text-secondary)] mb-2">리스크 수용도</p>
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {[
                { value: 'low', label: '안전 우선' },
                { value: 'medium', label: '균형' },
                { value: 'high', label: '도전적' },
              ].map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setForm(f => ({ ...f, risk_tolerance: (f.risk_tolerance === opt.value ? undefined : opt.value) as Persona['risk_tolerance'] }))}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border cursor-pointer transition-all ${
                    form.risk_tolerance === opt.value ? 'border-[var(--accent)] bg-[var(--ai)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-secondary)]'
                  }`}
                >{opt.label}</button>
              ))}
            </div>
            <Field label="OK 조건" placeholder="이 사람이 승인하려면 보여줘야 할 것 (예: ROI 데이터)" maxLength={300}
              value={form.success_metric} onChange={(e) => handleFieldChange('success_metric', e.target.value)} />
          </div>
          {error && <p className="text-[13px] text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onCancel}>취소</Button>
            <Button onClick={() => onSave(form)} disabled={!form.name || !form.role || !form.priorities}>
              <Check size={14} /> 저장
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
