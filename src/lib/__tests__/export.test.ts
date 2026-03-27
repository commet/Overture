import type {
  ReframeItem,
  SynthesizeItem,
  RecastItem,
  HiddenAssumption,
} from '@/stores/types';
import {
  reframeToMarkdown,
  synthesizeToMarkdown,
  recastToMarkdown,
} from '@/lib/export';

/* ────────────────────────────────────
   reframeToMarkdown
   ──────────────────────────────────── */

describe('reframeToMarkdown', () => {
  it('returns empty string when analysis is null', () => {
    const item: ReframeItem = {
      id: 'd-1',
      input_text: 'test',
      selected_question: '',
      analysis: null,
      status: 'done',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    expect(reframeToMarkdown(item)).toBe('');
  });

  it('includes surface_task in output', () => {
    const item: ReframeItem = {
      id: 'd-2',
      input_text: 'test',
      selected_question: 'Q1',
      analysis: {
        surface_task: 'Build a dashboard',
        reframed_question: 'reframed',
        why_reframing_matters: '',
        reasoning_narrative: '',
        hidden_assumptions: [],
        hidden_questions: [],
        ai_limitations: [],
      },
      status: 'done',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const md = reframeToMarkdown(item);
    expect(md).toContain('Build a dashboard');
  });

  it('includes selected_question in output', () => {
    const item: ReframeItem = {
      id: 'd-3',
      input_text: 'test',
      selected_question: 'What is the real goal?',
      analysis: {
        surface_task: 'task',
        reframed_question: 'reframed',
        why_reframing_matters: '',
        reasoning_narrative: '',
        hidden_assumptions: [],
        hidden_questions: [],
        ai_limitations: [],
      },
      status: 'done',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const md = reframeToMarkdown(item);
    expect(md).toContain('What is the real goal?');
  });

  it('uses hypothesis as fallback for selected question', () => {
    const item: ReframeItem = {
      id: 'd-4',
      input_text: 'test',
      selected_question: '',
      analysis: {
        surface_task: 'task',
        reframed_question: '',
        why_reframing_matters: '',
        reasoning_narrative: '',
        hidden_assumptions: [],
        hidden_questions: [],
        ai_limitations: [],
        hypothesis: 'The hypothesis fallback',
      },
      status: 'done',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const md = reframeToMarkdown(item);
    expect(md).toContain('The hypothesis fallback');
  });

  it('handles legacy string[] assumptions', () => {
    const item: ReframeItem = {
      id: 'd-5',
      input_text: 'test',
      selected_question: 'Q',
      analysis: {
        surface_task: 'task',
        reframed_question: 'reframed',
        why_reframing_matters: '',
        reasoning_narrative: '',
        // Cast to simulate legacy string[] format stored in old localStorage data
        hidden_assumptions: ['Legacy assumption 1', 'Legacy assumption 2'] as unknown as HiddenAssumption[],
        hidden_questions: [],
        ai_limitations: [],
      },
      status: 'done',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const md = reframeToMarkdown(item);
    expect(md).toContain('Legacy assumption 1');
    expect(md).toContain('Legacy assumption 2');
  });

  it('handles HiddenAssumption[] format with verified status', () => {
    const item: ReframeItem = {
      id: 'd-6',
      input_text: 'test',
      selected_question: 'Q',
      analysis: {
        surface_task: 'task',
        reframed_question: 'reframed',
        why_reframing_matters: '',
        reasoning_narrative: '',
        hidden_assumptions: [
          { assumption: 'Verified assumption', risk_if_false: 'Bad things', verified: true },
          { assumption: 'Unverified assumption', risk_if_false: 'Worse things', verified: false },
        ],
        hidden_questions: [],
        ai_limitations: [],
      },
      status: 'done',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const md = reframeToMarkdown(item);
    expect(md).toContain('Verified assumption');
    expect(md).toContain('✅');
    expect(md).toContain('Unverified assumption');
    expect(md).toContain('만약 아니라면: Worse things');
  });
});

/* ────────────────────────────────────
   synthesizeToMarkdown
   ──────────────────────────────────── */

describe('synthesizeToMarkdown', () => {
  function makeSynthesizeItem(overrides: Partial<SynthesizeItem> = {}): SynthesizeItem {
    return {
      id: 's-1',
      raw_input: 'input',
      sources: [],
      analysis: null,
      final_synthesis: '',
      status: 'done',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
  }

  it('returns empty string when analysis is null', () => {
    const item = makeSynthesizeItem();
    expect(synthesizeToMarkdown(item)).toBe('');
  });

  it('includes source summaries', () => {
    const item = makeSynthesizeItem({
      analysis: {
        sources_summary: [
          { name: 'Report A', core_claim: 'Growth is slowing' },
          { name: 'Report B', core_claim: 'Market is expanding' },
        ],
        agreements: [],
        conflicts: [],
        questions_for_user: [],
      },
    });
    const md = synthesizeToMarkdown(item);
    expect(md).toContain('Report A');
    expect(md).toContain('Growth is slowing');
    expect(md).toContain('Report B');
    expect(md).toContain('Market is expanding');
  });

  it('includes agreements', () => {
    const item = makeSynthesizeItem({
      analysis: {
        sources_summary: [],
        agreements: ['Both sources agree on timeline', 'Budget is sufficient'],
        conflicts: [],
        questions_for_user: [],
      },
    });
    const md = synthesizeToMarkdown(item);
    expect(md).toContain('Both sources agree on timeline');
    expect(md).toContain('Budget is sufficient');
  });

  it('includes conflicts with judgments', () => {
    const item = makeSynthesizeItem({
      analysis: {
        sources_summary: [],
        agreements: [],
        conflicts: [
          {
            id: 'c1',
            topic: 'Market size',
            side_a: { source: 'Report A', position: '10B' },
            side_b: { source: 'Report B', position: '5B' },
            analysis: 'Different methodologies',
            user_judgment: 'Report A is more reliable',
            user_reasoning: 'Larger sample size',
          },
        ],
        questions_for_user: [],
      },
    });
    const md = synthesizeToMarkdown(item);
    expect(md).toContain('Market size');
    expect(md).toContain('Report A');
    expect(md).toContain('Report B');
    expect(md).toContain('10B');
    expect(md).toContain('5B');
    expect(md).toContain('Report A is more reliable');
    expect(md).toContain('Larger sample size');
  });
});

/* ────────────────────────────────────
   recastToMarkdown
   ──────────────────────────────────── */

describe('recastToMarkdown', () => {
  function makeRecastItem(overrides: Partial<RecastItem> = {}): RecastItem {
    return {
      id: 'o-1',
      input_text: 'Plan a product launch',
      analysis: null,
      steps: [],
      status: 'done',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
  }

  it('includes step table with actor labels', () => {
    const item = makeRecastItem({
      steps: [
        {
          task: 'Research competitors',
          actor: 'ai',
          actor_reasoning: 'AI can search fast',
          expected_output: 'Report',
          checkpoint: false,
          checkpoint_reason: '',
          estimated_time: '30분',
        },
        {
          task: 'Make strategic decision',
          actor: 'human',
          actor_reasoning: 'Needs judgment',
          expected_output: 'Decision doc',
          checkpoint: true,
          checkpoint_reason: 'Critical decision point',
          estimated_time: '1시간',
        },
        {
          task: 'Draft proposal',
          actor: 'both',
          actor_reasoning: 'Collaborative',
          expected_output: 'Proposal',
          checkpoint: false,
          checkpoint_reason: '',
          estimated_time: '2시간',
        },
      ],
    });
    const md = recastToMarkdown(item);
    expect(md).toContain('🤖 AI');
    expect(md).toContain('🧠 사람');
    expect(md).toContain('🤝 협업');
    expect(md).toContain('Research competitors');
    expect(md).toContain('Make strategic decision');
    expect(md).toContain('Draft proposal');
  });

  it('includes governing_idea', () => {
    const item = makeRecastItem({
      analysis: {
        governing_idea: 'Speed over perfection',
        storyline: { situation: 's', complication: 'c', resolution: 'r' },
        goal_summary: 'Launch by Q3',
        steps: [],
        key_assumptions: [],
        critical_path: [],
        total_estimated_time: '5시간',
        ai_ratio: 40,
        human_ratio: 60,
      },
    });
    const md = recastToMarkdown(item);
    expect(md).toContain('Speed over perfection');
    expect(md).toContain('핵심 방향');
  });

  it('includes key_assumptions', () => {
    const item = makeRecastItem({
      analysis: {
        governing_idea: 'idea',
        storyline: { situation: 's', complication: 'c', resolution: 'r' },
        goal_summary: 'goal',
        steps: [],
        key_assumptions: [
          { assumption: 'Budget is approved', importance: 'high', certainty: 'medium', if_wrong: 'Delay launch' },
          { assumption: 'Team available', importance: 'medium', certainty: 'high', if_wrong: 'Need contractors' },
        ],
        critical_path: [],
        total_estimated_time: '3시간',
        ai_ratio: 50,
        human_ratio: 50,
      },
    });
    const md = recastToMarkdown(item);
    expect(md).toContain('Budget is approved');
    expect(md).toContain('높음');
    expect(md).toContain('Delay launch');
    expect(md).toContain('Team available');
    expect(md).toContain('중간');
  });

  it('shows checkpoint reasons', () => {
    const item = makeRecastItem({
      steps: [
        {
          task: 'Review results',
          actor: 'human',
          actor_reasoning: 'Needs approval',
          expected_output: 'Approved results',
          checkpoint: true,
          checkpoint_reason: 'Must verify before proceeding',
          estimated_time: '30분',
        },
      ],
    });
    const md = recastToMarkdown(item);
    expect(md).toContain('Must verify before proceeding');
    expect(md).toContain('⚑');
  });
});
