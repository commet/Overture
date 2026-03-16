'use client';

import { useState, useRef } from 'react';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { callLLMJson } from '@/lib/llm';
import type { Persona } from '@/stores/types';
import { Sparkles, Loader2, Check, Pencil, Upload, UserCircle, ChevronRight, FileText } from 'lucide-react';

interface PersonaFormProps {
  persona?: Partial<Persona>;
  onSave: (data: Partial<Persona>) => void;
  onCancel: () => void;
}

interface PresetPersona {
  name: string;
  emoji: string;
  role: string;
  priorities: string;
  communication_style: string;
  known_concerns: string;
  extracted_traits: string[];
}

const PRESETS: PresetPersona[] = [
  {
    name: 'CEO / 대표',
    emoji: '👔',
    role: 'CEO',
    priorities: '회사 비전과 전략 방향성. 시장 기회와 경쟁 포지셔닝. 투자자/이사회 관점의 성과.',
    communication_style: '큰 그림부터. 디테일보다 방향성과 임팩트. 한 페이지 요약 선호.',
    known_concerns: '성장률, 시장 점유율, 브랜드 포지셔닝',
    extracted_traits: ['비전 중심', '빠른 판단', '임팩트 지향'],
  },
  {
    name: 'CFO / 재무',
    emoji: '📊',
    role: 'CFO',
    priorities: 'ROI와 비용 효율성. 정량적 근거와 재무 모델. 리스크 관리.',
    communication_style: '숫자로 말하기. 결론부터. 3페이지 이상 안 읽음. 근거 출처 요구.',
    known_concerns: '비용 초과, 투자 대비 수익, 현금 흐름',
    extracted_traits: ['숫자 중심', '보수적', '근거 요구'],
  },
  {
    name: 'CTO / 기술',
    emoji: '⚙️',
    role: 'CTO',
    priorities: '기술적 실현 가능성. 확장성과 유지보수성. 기술 부채 관리.',
    communication_style: '구체적 기술 스펙. 아키텍처 다이어그램 선호. 트레이드오프 분석.',
    known_concerns: '기술 부채, 보안, 시스템 안정성, 팀 리소스',
    extracted_traits: ['기술 깊이', '시스템 사고', '리스크 민감'],
  },
  {
    name: '마케팅 리드',
    emoji: '📢',
    role: '마케팅 디렉터',
    priorities: '고객 관점과 시장 반응. 브랜드 일관성. 채널별 ROI.',
    communication_style: '고객 사례와 데이터 기반. 시각적 자료 선호. 스토리텔링.',
    known_concerns: 'CAC, 전환율, 브랜드 인지도, 경쟁사 동향',
    extracted_traits: ['고객 중심', '데이터 드리븐', '트렌드 민감'],
  },
  {
    name: '투자자',
    emoji: '💰',
    role: '투자자 / VC',
    priorities: '시장 규모(TAM/SAM/SOM). 성장 지표. Exit 전략. 팀 역량.',
    communication_style: '핵심 지표 위주. 벤치마크 비교. 간결한 덱 선호.',
    known_concerns: '번레이트, 유닛 이코노믹스, 경쟁 우위 지속 가능성',
    extracted_traits: ['지표 중심', '비교 분석', '스케일 지향'],
  },
  {
    name: '클라이언트 / 고객사',
    emoji: '🤝',
    role: '클라이언트 담당자',
    priorities: '납기와 품질. 비용 대비 가치. 커뮤니케이션 투명성.',
    communication_style: '진행 상황 정기 업데이트. 리스크 사전 공유. 실무적 언어.',
    known_concerns: '일정 지연, 스코프 크리프, 품질 이슈',
    extracted_traits: ['실용적', '일정 민감', '신뢰 중시'],
  },
];

const STRUCTURE_PROMPT = `사용자가 특정 이해관계자에 대해 자유롭게 작성한 텍스트를 읽고, 아래 JSON 구조로 정리해주세요. 추론하지 말고 텍스트에 명시된 정보만 추출하세요. 해당 필드에 맞는 정보가 없으면 빈 문자열로 두세요. JSON만 출력하세요.

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

extracted_traits는 이 사람의 핵심 성향을 2~4개의 짧은 키워드로 추출하세요.`;

const FILE_ANALYZE_PROMPT = `아래 텍스트(회의록, 이메일, 채팅 로그 등)에서 특정 인물의 성향, 의사결정 패턴, 커뮤니케이션 스타일을 분석하여 페르소나 프로필을 생성해주세요. 여러 인물이 등장하면 가장 핵심적인 의사결정자 1명에 대해 분석하세요. JSON만 출력하세요.

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

export function PersonaForm({ persona, onSave, onCancel }: PersonaFormProps) {
  const [step, setStep] = useState<'method' | 'preset' | 'freetext' | 'file' | 'structuring' | 'review'>(
    persona?.name ? 'review' : 'method'
  );
  const [freeText, setFreeText] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: persona?.name || '',
    role: persona?.role || '',
    organization: persona?.organization || '',
    priorities: persona?.priorities || '',
    communication_style: persona?.communication_style || '',
    known_concerns: persona?.known_concerns || '',
    relationship_notes: persona?.relationship_notes || '',
    extracted_traits: persona?.extracted_traits || [] as string[],
  });
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePresetSelect = (preset: PresetPersona) => {
    setForm({
      name: '',
      role: preset.role,
      organization: '',
      priorities: preset.priorities,
      communication_style: preset.communication_style,
      known_concerns: preset.known_concerns,
      relationship_notes: '',
      extracted_traits: preset.extracted_traits,
    });
    setStep('review');
  };

  const handleFreeTextStructure = async () => {
    if (!freeText.trim()) return;
    setLoading(true);
    setError('');
    setStep('structuring');
    try {
      const result = await callLLMJson<Record<string, unknown>>(
        [{ role: 'user', content: freeText }],
        { system: STRUCTURE_PROMPT, maxTokens: 1000 }
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
      });
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 구조화에 실패했습니다.');
      setStep('freetext');
    } finally {
      setLoading(false);
    }
  };

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
        { system: FILE_ANALYZE_PROMPT, maxTokens: 1000 }
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

  return (
    <div className="space-y-4">
      {/* Method selection */}
      {step === 'method' && (
        <div className="space-y-3">
          <h3 className="text-[15px] font-bold text-[var(--text-primary)]">어떤 방법으로 페르소나를 만드시겠어요?</h3>

          <button onClick={() => setStep('preset')}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--ai)] transition-all text-left cursor-pointer group">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
              <UserCircle size={20} className="text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-[var(--text-primary)]">프리셋에서 선택</p>
              <p className="text-[12px] text-[var(--text-secondary)]">CEO, CFO, CTO 등 일반적인 이해관계자 유형에서 시작</p>
            </div>
            <ChevronRight size={16} className="text-[var(--text-secondary)] group-hover:text-[var(--accent)]" />
          </button>

          <button onClick={() => setStep('freetext')}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--ai)] transition-all text-left cursor-pointer group">
            <div className="w-10 h-10 rounded-lg bg-[var(--ai)] flex items-center justify-center shrink-0">
              <Sparkles size={20} className="text-[#2d4a7c]" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-[var(--text-primary)]">자유롭게 설명하기</p>
              <p className="text-[12px] text-[var(--text-secondary)]">아는 것을 자유롭게 적으면 AI가 구조화합니다</p>
            </div>
            <ChevronRight size={16} className="text-[var(--text-secondary)] group-hover:text-[var(--accent)]" />
          </button>

          <button onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--ai)] transition-all text-left cursor-pointer group">
            <div className="w-10 h-10 rounded-lg bg-[var(--human)] flex items-center justify-center shrink-0">
              <FileText size={20} className="text-[#8b6914]" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-[var(--text-primary)]">파일에서 분석</p>
              <p className="text-[12px] text-[var(--text-secondary)]">회의록, 이메일, 채팅 로그를 올리면 자동으로 페르소나를 추출</p>
            </div>
            <ChevronRight size={16} className="text-[var(--text-secondary)] group-hover:text-[var(--accent)]" />
          </button>
          <input ref={fileInputRef} type="file" accept=".txt,.md,.csv" onChange={handleFileUpload} className="hidden" />

          <button onClick={() => setStep('review')}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-[13px] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors cursor-pointer">
            <Pencil size={14} />
            직접 하나씩 입력하기
          </button>
        </div>
      )}

      {/* Preset selection */}
      {step === 'preset' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-[var(--text-primary)]">페르소나 유형 선택</h3>
            <button onClick={() => setStep('method')} className="text-[12px] text-[var(--accent)] cursor-pointer hover:underline">
              뒤로
            </button>
          </div>
          <p className="text-[12px] text-[var(--text-secondary)]">선택 후 실제 인물에 맞게 수정할 수 있습니다</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.role}
                onClick={() => handlePresetSelect(preset)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--ai)] transition-all cursor-pointer text-center"
              >
                <span className="text-[24px]">{preset.emoji}</span>
                <span className="text-[13px] font-semibold text-[var(--text-primary)]">{preset.name}</span>
                <div className="flex flex-wrap gap-1 justify-center">
                  {preset.extracted_traits.slice(0, 2).map((t) => (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg)] text-[var(--text-secondary)]">{t}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Free text input */}
      {step === 'freetext' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-[var(--text-primary)]">이 사람에 대해 자유롭게 적어주세요</h3>
            <button onClick={() => setStep('method')} className="text-[12px] text-[var(--accent)] cursor-pointer hover:underline">
              뒤로
            </button>
          </div>
          <p className="text-[12px] text-[var(--text-secondary)]">
            이름, 직책, 성격, 의사결정 스타일, 최근 관심사 — 무엇이든 좋습니다.
          </p>
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder={"김 상무님은 우리 회사 CFO입니다. ROI와 비용 절감을 최우선시하고, 정성적 분석보다 정량적 근거를 선호합니다. 결론부터 듣고 싶어하며 3페이지 이상은 안 읽으십니다. 최근 신사업 투자 실패 때문에 보수적입니다."}
            className="w-full bg-[#fafbfc] border-[1.5px] border-[var(--border)] rounded-[10px] px-4 py-3 text-[15px] leading-[1.7] placeholder:text-[var(--text-secondary)] placeholder:text-[14px] focus:outline-none focus:border-[var(--accent)] resize-none"
            rows={6}
          />
          {error && <p className="text-[13px] text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex justify-end">
            <Button onClick={handleFreeTextStructure} disabled={!freeText.trim() || loading}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              AI로 정리하기
            </Button>
          </div>
        </div>
      )}

      {/* Loading */}
      {step === 'structuring' && (
        <div className="text-center py-8 space-y-3">
          <Loader2 size={28} className="mx-auto animate-spin text-[var(--accent)]" />
          <p className="text-[14px] text-[var(--text-secondary)]">페르소나 프로필을 구조화하고 있습니다...</p>
        </div>
      )}

      {/* Review / Edit form */}
      {step === 'review' && (
        <div className="space-y-3 animate-fade-in">
          {!persona?.name && (
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-[var(--text-primary)]">프로필 확인 및 수정</h3>
              <button onClick={() => setStep('method')} className="text-[12px] text-[var(--accent)] cursor-pointer hover:underline">
                다른 방법으로
              </button>
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
              <input type="text" value={form.name} onChange={(e) => handleFieldChange('name', e.target.value)} placeholder="실명 또는 별칭"
                className="bg-[#fafbfc] border-[1.5px] border-[var(--border)] rounded-[10px] px-3 py-2 text-[14px] focus:outline-none focus:border-[var(--accent)]" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[13px] font-semibold">역할 *</label>
              <input type="text" value={form.role} onChange={(e) => handleFieldChange('role', e.target.value)} placeholder="직책/역할"
                className="bg-[#fafbfc] border-[1.5px] border-[var(--border)] rounded-[10px] px-3 py-2 text-[14px] focus:outline-none focus:border-[var(--accent)]" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-semibold">소속</label>
            <input type="text" value={form.organization} onChange={(e) => handleFieldChange('organization', e.target.value)} placeholder="우리 회사 / 투자사 / 고객사"
              className="bg-[#fafbfc] border-[1.5px] border-[var(--border)] rounded-[10px] px-3 py-2 text-[14px] focus:outline-none focus:border-[var(--accent)]" />
          </div>
          <Field label="우선순위 *" placeholder="이 사람이 가장 중요하게 보는 것"
            value={form.priorities} onChange={(e) => handleFieldChange('priorities', e.target.value)} />
          <Field label="커뮤니케이션 스타일" placeholder="선호하는 보고/소통 방식"
            value={form.communication_style} onChange={(e) => handleFieldChange('communication_style', e.target.value)} />
          <Field label="최근 관심사/우려" placeholder="요즘 신경 쓰는 것, 최근 이슈"
            value={form.known_concerns} onChange={(e) => handleFieldChange('known_concerns', e.target.value)} />
          <Field label="관계 메모" placeholder="나와의 관계, 보고 빈도 등"
            value={form.relationship_notes} onChange={(e) => handleFieldChange('relationship_notes', e.target.value)} />

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
