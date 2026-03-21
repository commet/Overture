import type { RefinementLoop, FeedbackRecord, ApprovalCondition, Persona, PersonaFeedbackResult } from '@/stores/types';
import {
  extractIssuesFromFeedback,
  extractApprovalConditions,
  checkLoopConvergence,
  matchApprovalConditions,
} from '@/lib/convergence';
import { computeSimilarity } from '@/lib/similarity';

vi.mock('@/lib/similarity', () => ({
  computeSimilarity: vi.fn(),
}));

const mockedSimilarity = computeSimilarity as ReturnType<typeof vi.fn>;

function makePersona(overrides: Partial<Persona> = {}): Persona {
  return {
    id: 'p1', name: 'CEO', role: 'CEO', organization: 'Acme',
    priorities: '', communication_style: '', known_concerns: '',
    relationship_notes: '', influence: 'high', extracted_traits: [],
    feedback_logs: [], created_at: '', updated_at: '',
    ...overrides,
  };
}

function makeResult(overrides: Partial<PersonaFeedbackResult> = {}): PersonaFeedbackResult {
  return {
    persona_id: 'p1', overall_reaction: '', failure_scenario: '',
    untested_assumptions: [], classified_risks: [], first_questions: [],
    praise: [], concerns: [], wants_more: [], approval_conditions: [],
    ...overrides,
  };
}

function makeRecord(overrides: Partial<FeedbackRecord> = {}): FeedbackRecord {
  return {
    id: 'fb1', document_title: '', document_text: '',
    persona_ids: ['p1'], feedback_perspective: '', feedback_intensity: '',
    results: [], synthesis: '', created_at: '',
    ...overrides,
  };
}

function makeLoop(overrides: Partial<RefinementLoop> = {}): RefinementLoop {
  return {
    id: 'loop-1', project_id: 'proj-1', name: 'test',
    goal: 'test', original_plan: '', initial_feedback_record_id: 'fb1',
    initial_approval_conditions: [], persona_ids: ['p1'],
    iterations: [], status: 'active', max_iterations: 3,
    created_at: '', updated_at: '',
    ...overrides,
  };
}

describe('extractIssuesFromFeedback', () => {
  it('extracts critical risks, concerns, questions, wants_more', () => {
    const record = makeRecord({
      results: [makeResult({
        persona_id: 'p1',
        classified_risks: [{ text: 'critical risk', category: 'critical' }],
        concerns: ['concern 1'],
        first_questions: ['question 1'],
        wants_more: ['want 1'],
      })],
    });
    const personas = [makePersona()];
    const issues = extractIssuesFromFeedback(record, personas);

    expect(issues).toHaveLength(4);
    expect(issues[0].severity).toBe('critical');
    expect(issues[1].severity).toBe('concern');
    expect(issues[2].severity).toBe('question');
    expect(issues[3].severity).toBe('wants_more');
  });

  it('handles empty/missing fields', () => {
    const record = makeRecord({ results: [makeResult()] });
    const issues = extractIssuesFromFeedback(record, [makePersona()]);
    expect(issues).toHaveLength(0);
  });
});

describe('extractApprovalConditions', () => {
  it('extracts conditions with persona metadata', () => {
    const record = makeRecord({
      results: [makeResult({
        persona_id: 'p1',
        approval_conditions: ['condition A', 'condition B'],
      })],
    });
    const personas = [makePersona({ id: 'p1', name: 'CEO', influence: 'high' })];
    const conditions = extractApprovalConditions(record, personas);

    expect(conditions).toHaveLength(2);
    expect(conditions[0].condition).toBe('condition A');
    expect(conditions[0].persona_name).toBe('CEO');
    expect(conditions[0].influence).toBe('high');
    expect(conditions[0].met).toBe(false);
  });
});

describe('checkLoopConvergence', () => {
  it('returns not converged for empty iterations', () => {
    const loop = makeLoop();
    const result = checkLoopConvergence(loop);
    expect(result.converged).toBe(false);
  });

  it('converges when critical=0 and approval >= 80%', () => {
    const loop = makeLoop({
      initial_approval_conditions: [
        { persona_id: 'p1', persona_name: 'CEO', influence: 'high', condition: 'A', met: true },
      ],
      iterations: [{
        iteration_number: 1, issues_to_address: [], revised_plan: '',
        changes: [], feedback_record_id: 'fb2',
        convergence: {
          critical_risks: 0, total_issues: 2,
          approval_conditions: [
            { persona_id: 'p1', persona_name: 'CEO', influence: 'high', condition: 'A', met: true, met_at_iteration: 1 },
          ],
        },
        created_at: '',
      }],
    });
    const result = checkLoopConvergence(loop);
    expect(result.converged).toBe(true);
  });

  it('does not converge with remaining critical risks', () => {
    const loop = makeLoop({
      iterations: [{
        iteration_number: 1, issues_to_address: [], revised_plan: '',
        changes: [], feedback_record_id: 'fb2',
        convergence: { critical_risks: 2, total_issues: 5, approval_conditions: [] },
        created_at: '',
      }],
    });
    const result = checkLoopConvergence(loop);
    expect(result.converged).toBe(false);
    expect(result.critical_remaining).toBe(2);
  });
});

describe('matchApprovalConditions', () => {
  beforeEach(() => mockedSimilarity.mockReset());

  it('marks condition as met when not in re-review approval_conditions', () => {
    mockedSimilarity.mockReturnValue(0.1); // not similar → condition gone → met
    const initial: ApprovalCondition[] = [
      { persona_id: 'p1', persona_name: 'CEO', influence: 'high', condition: 'ROI 제시', met: false },
    ];
    const reReview = makeRecord({
      results: [makeResult({ persona_id: 'p1', approval_conditions: [], praise: [] })],
    });
    const result = matchApprovalConditions(initial, reReview, 1);
    expect(result[0].met).toBe(true);
    expect(result[0].met_at_iteration).toBe(1);
  });

  it('keeps condition unmet when still in re-review', () => {
    mockedSimilarity.mockReturnValue(0.8); // similar → still required
    const initial: ApprovalCondition[] = [
      { persona_id: 'p1', persona_name: 'CEO', influence: 'high', condition: 'ROI 제시', met: false },
    ];
    const reReview = makeRecord({
      results: [makeResult({ persona_id: 'p1', approval_conditions: ['ROI 근거 필요'], praise: [] })],
    });
    const result = matchApprovalConditions(initial, reReview, 1);
    expect(result[0].met).toBe(false);
  });

  it('preserves already-met conditions', () => {
    const initial: ApprovalCondition[] = [
      { persona_id: 'p1', persona_name: 'CEO', influence: 'high', condition: 'A', met: true, met_at_iteration: 1 },
    ];
    const result = matchApprovalConditions(initial, makeRecord(), 2);
    expect(result[0].met).toBe(true);
    expect(result[0].met_at_iteration).toBe(1);
  });
});
