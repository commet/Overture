'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Tab } from '@/components/ui/Tab';
import { CopyButton } from '@/components/ui/CopyButton';
import { Badge } from '@/components/ui/Badge';
import type { Persona, FeedbackRecord } from '@/stores/types';
import { User, MessageCircleQuestion, ThumbsUp, AlertTriangle, Search } from 'lucide-react';

interface FeedbackResultProps {
  record: FeedbackRecord;
  personas: Persona[];
}

export function FeedbackResult({ record, personas }: FeedbackResultProps) {
  const tabs = [
    ...record.results.map((r) => {
      const persona = personas.find((p) => p.id === r.persona_id);
      return { key: r.persona_id, label: persona?.name || '페르소나' };
    }),
    ...(record.synthesis ? [{ key: 'synthesis', label: '종합' }] : []),
  ];

  const [activeTab, setActiveTab] = useState(tabs[0]?.key || '');
  const activeResult = record.results.find((r) => r.persona_id === activeTab);
  const activePersona = personas.find((p) => p.id === activeTab);

  const getFullText = () => {
    let text = `## 페르소나 피드백 결과\n\n**자료**: ${record.document_title}\n**관점**: ${record.feedback_perspective} | **강도**: ${record.feedback_intensity}\n\n`;
    for (const result of record.results) {
      const p = personas.find((persona) => persona.id === result.persona_id);
      text += `### ${p?.name || '페르소나'} (${p?.role || ''})\n\n`;
      text += `**전반적 반응**: ${result.overall_reaction}\n\n`;
      text += `**먼저 물어볼 질문**\n${result.first_questions.map((q) => `- ${q}`).join('\n')}\n\n`;
      text += `**칭찬할 부분**\n${result.praise.map((p) => `- ${p}`).join('\n')}\n\n`;
      text += `**우려/지적**\n${result.concerns.map((c) => `- ${c}`).join('\n')}\n\n`;
      text += `**추가로 보고 싶은 것**\n${result.wants_more.map((w) => `- ${w}`).join('\n')}\n\n`;
    }
    if (record.synthesis) {
      text += `### 종합 분석\n${record.synthesis}\n`;
    }
    return text;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-bold text-[var(--text-primary)]">피드백 결과</h3>
        <CopyButton getText={getFullText} label="전체 복사" />
      </div>

      {tabs.length > 1 && <Tab tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />}

      {activeTab === 'synthesis' ? (
        <Card>
          <div className="text-[14px] leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap">
            {record.synthesis}
          </div>
        </Card>
      ) : activeResult ? (
        <div className="space-y-4 animate-fade-in">
          {activePersona && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--bg)] flex items-center justify-center">
                <User size={18} className="text-[var(--text-secondary)]" />
              </div>
              <div>
                <span className="text-[15px] font-bold">{activePersona.name}</span>
                <span className="text-[13px] text-[var(--text-secondary)] ml-2">{activePersona.role}</span>
              </div>
            </div>
          )}

          {/* Overall reaction */}
          <Card className="!bg-[var(--ai)]">
            <p className="text-[12px] font-bold text-[#2d4a7c] mb-1">전반적 반응</p>
            <p className="text-[14px] text-[var(--text-primary)] font-medium">{activeResult.overall_reaction}</p>
          </Card>

          {/* First questions */}
          <Card>
            <div className="flex items-center gap-2 text-[13px] font-bold text-[var(--text-primary)] mb-3">
              <MessageCircleQuestion size={14} className="text-[var(--accent)]" />
              이 사람이라면 먼저 물어볼 질문
            </div>
            <ul className="space-y-2">
              {activeResult.first_questions.map((q, i) => (
                <li key={i} className="text-[14px] text-[var(--text-primary)] bg-[var(--bg)] rounded-lg px-3 py-2">
                  {q}
                </li>
              ))}
            </ul>
          </Card>

          {/* Praise */}
          <Card className="!border-l-4 !border-l-[var(--success)]">
            <div className="flex items-center gap-2 text-[13px] font-bold text-[var(--success)] mb-2">
              <ThumbsUp size={14} /> 칭찬할 부분
            </div>
            <ul className="space-y-1">
              {activeResult.praise.map((p, i) => (
                <li key={i} className="text-[13px] text-[var(--text-primary)]">+ {p}</li>
              ))}
            </ul>
          </Card>

          {/* Concerns */}
          <Card className="!border-l-4 !border-l-amber-400">
            <div className="flex items-center gap-2 text-[13px] font-bold text-amber-700 mb-2">
              <AlertTriangle size={14} /> 우려/지적할 부분
            </div>
            <ul className="space-y-1">
              {activeResult.concerns.map((c, i) => (
                <li key={i} className="text-[13px] text-[var(--text-primary)]">- {c}</li>
              ))}
            </ul>
          </Card>

          {/* Wants more */}
          <Card className="!border-l-4 !border-l-[var(--accent)]">
            <div className="flex items-center gap-2 text-[13px] font-bold text-[var(--accent)] mb-2">
              <Search size={14} /> 추가로 보고 싶어할 것
            </div>
            <ul className="space-y-1">
              {activeResult.wants_more.map((w, i) => (
                <li key={i} className="text-[13px] text-[var(--text-primary)]">{w}</li>
              ))}
            </ul>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
