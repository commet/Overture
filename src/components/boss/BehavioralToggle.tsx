'use client';

import { motion } from 'framer-motion';
import { useBossStore } from '@/stores/useBossStore';
import { useLocale } from '@/hooks/useLocale';
import { track } from '@/lib/analytics';

/**
 * Quiz-style alternative to TypeToggle.
 *
 * The technical MBTI letters (E/I/S/N/T/F/J/P) work for power users, but a
 * share-link visitor seeing them cold often bails. This component asks
 * four short workplace-observable questions instead, mapped to the same
 * `setAxis` store action — the resulting MBTI code is identical.
 *
 * Both this and TypeToggle write to the same axes state, so a user can
 * toggle modes mid-flow without losing their answers.
 */

type AxisKey = 'ei' | 'sn' | 'tf' | 'jp';

interface AxisOption {
  code: string;
  emoji: string;
  label: string;
}

interface AxisQuiz {
  key: AxisKey;
  question: string;
  options: [AxisOption, AxisOption];
}

function getQuiz(locale: 'ko' | 'en'): AxisQuiz[] {
  if (locale === 'ko') {
    return [
      {
        key: 'ei',
        question: '회의에서 우리 팀장은',
        options: [
          { code: 'E', emoji: '💬', label: '적극 발언, 즉석 피드백' },
          { code: 'I', emoji: '📨', label: '메일·메시지로 조용히 지시' },
        ],
      },
      {
        key: 'sn',
        question: '결정할 때 먼저 보는 건',
        options: [
          { code: 'S', emoji: '📊', label: '숫자·근거·과거 사례' },
          { code: 'N', emoji: '🧭', label: '방향·큰 그림' },
        ],
      },
      {
        key: 'tf',
        question: '갈등이 생기면',
        options: [
          { code: 'T', emoji: '⚖️', label: '논리·효율 우선' },
          { code: 'F', emoji: '🤝', label: '관계·분위기 먼저' },
        ],
      },
      {
        key: 'jp',
        question: '일정·계획은',
        options: [
          { code: 'J', emoji: '🗂', label: '미리 정해두고 지킴' },
          { code: 'P', emoji: '🌊', label: '유연하게, 일단 해봐' },
        ],
      },
    ];
  }
  return [
    {
      key: 'ei',
      question: 'In meetings, your boss',
      options: [
        { code: 'E', emoji: '💬', label: 'Speaks up, gives quick feedback' },
        { code: 'I', emoji: '📨', label: 'Directs quietly via email or DM' },
      ],
    },
    {
      key: 'sn',
      question: 'When deciding, they look at',
      options: [
        { code: 'S', emoji: '📊', label: 'Numbers, evidence, past cases' },
        { code: 'N', emoji: '🧭', label: 'Direction and the big picture' },
      ],
    },
    {
      key: 'tf',
      question: 'When friction shows up',
      options: [
        { code: 'T', emoji: '⚖️', label: 'Logic and efficiency first' },
        { code: 'F', emoji: '🤝', label: 'Relationships and tone first' },
      ],
    },
    {
      key: 'jp',
      question: 'For schedules and plans',
      options: [
        { code: 'J', emoji: '🗂', label: 'Sets them early and holds the line' },
        { code: 'P', emoji: '🌊', label: 'Stays flexible — "just try it"' },
      ],
    },
  ];
}

export function BehavioralToggle() {
  const axes = useBossStore((s) => s.axes);
  const setAxis = useBossStore((s) => s.setAxis);
  const locale = useLocale();
  const quiz = getQuiz(locale === 'ko' ? 'ko' : 'en');

  const handleSelect = (key: AxisKey, value: string) => {
    if (axes[key] === value) return;
    setAxis(key, value);
    track('boss_axis_changed', { axis: key, from: axes[key], to: value, mode: 'easy' });
  };

  return (
    <div className="btv-quiz">
      {quiz.map((row) => {
        const current = axes[row.key];
        return (
          <div key={row.key} className="btv-row">
            <p className="btv-question">{row.question}</p>
            <div className="btv-options">
              {row.options.map((opt) => {
                const active = current === opt.code;
                return (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => handleSelect(row.key, opt.code)}
                    className="btv-option"
                    data-active={active}
                    aria-pressed={active}
                  >
                    {active && (
                      <motion.div
                        className="btv-option-bg"
                        layoutId={`btv-bg-${row.key}`}
                        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                      />
                    )}
                    <span className="btv-option-emoji" aria-hidden="true">{opt.emoji}</span>
                    <span className="btv-option-label">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
