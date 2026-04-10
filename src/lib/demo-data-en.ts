/**
 * Interactive Demo Data (English) — 3 hardcoded scenarios + branching data
 *
 * Structure: base analysis -> Q1 patch -> Q2 patch -> workers (fixed) -> draft -> DM (Q1-based) -> final (DM toggle-based)
 */

import type {
  AnalysisSnapshot, FlowQuestion, WorkerPersona,
  MixResult, DMFeedbackResult, DMConcern,
} from '@/stores/types';

// ─── Demo Scenario Type ───

export interface DemoScenario {
  id: string;
  title: string;
  icon: string;
  desc: string;
  problemText: string;
  team: WorkerPersona[];
  analysis: AnalysisSnapshot;
  q1: {
    question: FlowQuestion;
    effects: Record<string, {
      snapshotPatch: Partial<AnalysisSnapshot>;
      dmKey: string;
    }>;
  };
  q2: {
    question: FlowQuestion;
    effects: Record<string, {
      snapshotPatch: Partial<AnalysisSnapshot>;
    }>;
  };
  workers: Array<{
    persona: WorkerPersona;
    task: string;
    completionNote: string;
    result: string;
  }>;
  draft: MixResult;
  dmVariants: Record<string, DMFeedbackResult>;
  finalBase: string;
  finalPatches: [string, string]; // [concern0 applied text, concern1 applied text]
}

// ─── Utility ───

export function applyPatch(base: AnalysisSnapshot, patch: Partial<AnalysisSnapshot>): AnalysisSnapshot {
  return {
    ...base,
    ...patch,
    version: base.version + 1,
  };
}

/** Insert concern-applied results into finalBase */
export function buildFinal(scenario: DemoScenario, concerns: DMConcern[]): string {
  let doc = scenario.finalBase;
  if (concerns[0]?.applied) {
    doc = doc.replace('<!-- PATCH_0 -->', scenario.finalPatches[0]);
  } else {
    doc = doc.replace('<!-- PATCH_0 -->', '');
  }
  if (concerns[1]?.applied) {
    doc = doc.replace('<!-- PATCH_1 -->', scenario.finalPatches[1]);
  } else {
    doc = doc.replace('<!-- PATCH_1 -->', '');
  }
  return doc.trim();
}

// ─── Shared Personas ───

const SUJIN: WorkerPersona = {
  id: 'researcher', name: 'Sophie', role: 'Research Analyst',
  emoji: '🔍', expertise: 'Market research, data analysis', tone: 'Thorough and evidence-based', color: '#3B82F6',
};
const HYUNWOO: WorkerPersona = {
  id: 'strategist', name: 'Nathan', role: 'Strategist',
  emoji: '🎯', expertise: 'Strategy design, positioning', tone: 'Direct and to the point', color: '#8B5CF6',
};
const MINJAE: WorkerPersona = {
  id: 'numbers', name: 'Ethan', role: 'Numbers Analyst',
  emoji: '📊', expertise: 'Finance, quantitative analysis', tone: 'Numbers-driven', color: '#10B981',
};
const DONGHYUK: WorkerPersona = {
  id: 'critic', name: 'Blake', role: 'Risk Reviewer',
  emoji: '⚠️', expertise: 'Risk analysis, counterarguments', tone: 'Sharp but constructive', color: '#EF4444',
};
const SEOYEON: WorkerPersona = {
  id: 'copywriter', name: 'Claire', role: 'Copywriter',
  emoji: '✍️', expertise: 'Document structuring, persuasive writing', tone: 'Clear and compelling', color: '#F59E0B',
};

// ═══════════════════════════════════════════════════════════════
// ═══ SCENARIO 1: 📋 Business Plan ═══
// ═══════════════════════════════════════════════════════════════

const scenario1: DemoScenario = {
  id: 'planning',
  title: 'Business Plan',
  icon: '📋',
  desc: 'First time planning — where do you even start?',
  problemText: 'The CEO wants a new business proposal in 2 weeks. I\'m on the dev team and have never done this before.',

  team: [SUJIN, HYUNWOO, MINJAE],

  // ─── v0: Initial Analysis ───
  analysis: {
    version: 0,
    real_question: 'There\'s really only one question to answer in 2 weeks: "Should we go for it?"',
    hidden_assumptions: [
      'A proposal isn\'t a perfect report — it\'s the process of gathering the materials for a judgment call',
      'Two weeks usually means first draft + feedback, not a polished final document',
      'Dev experience is an advantage — you can judge technical feasibility more accurately than any planning expert',
    ],
    skeleton: [
      'First — find out who reads this and what they decide. This determines the entire structure',
      'Then — assess technical feasibility. The dev team can answer this most accurately',
      'Next — check if people actually want it. Even 3 conversations are enough',
      'Add — rough numbers. Even estimates are better than none for decision-making',
      'Finally — include kill criteria. "We stop if X" is what makes a plan credible',
    ],
    insight: 'It\'s not that different from scoping a feature — why build it, can we build it, how much will it cost.',
  },

  // ─── Q1: Understanding the context ───
  q1: {
    question: {
      id: 'demo-q1',
      text: 'Why do you think the CEO assigned this?',
      subtext: 'This single answer completely changes the plan\'s structure.',
      options: ['A competitor beat us to the punch', 'Revenue growth has stalled', 'The CEO has a personal conviction', 'I\'m not sure'],
      type: 'select',
      engine_phase: 'reframe',
    },
    effects: {
      'A competitor beat us to the punch': {
        dmKey: 'ceo',
        snapshotPatch: {
          real_question: 'A competitor went first. The good news: the market is proven. The question is — what can we do differently?',
          hidden_assumptions: [
            'A competitor going first means the market exists — they saved you the validation cost',
            'Building the same thing puts you at a late-mover disadvantage — find what you can do differently',
            'Spending 2 weeks on competitive analysis leaves no time for the actual plan',
          ],
          skeleton: [
            'First — try the competitor\'s product yourself. Skip the press, use the real thing (1 hour is enough)',
            'Then — ask the CEO: "Same thing, or go different?" This sets the direction',
            'Next — ask 3 customers: "Have you tried theirs? What do you think?" Their reaction is your market validation',
            'The key — one thing only we can do. A technical differentiator is the dev team\'s domain',
            'The plan\'s core — a "here\'s them, here\'s us" comparison table',
          ],
          insight: 'The competitor opened the market. An analysis report isn\'t what you need — "one thing we can do that they can\'t" is the plan\'s core.',
        },
      },
      'Revenue growth has stalled': {
        dmKey: 'executive',
        snapshotPatch: {
          real_question: 'To propose a new venture when revenue is stalling, you need a comparison: is this better than improving what we already have?',
          hidden_assumptions: [
            'Whether the plateau is market saturation vs. execution issues completely changes the plan',
            'A new venture without synergy to the existing business is a much harder sell',
            'A proposal without numbers won\'t get past the first review',
          ],
          skeleton: [
            'First — why isn\'t current revenue growing? Market saturation or execution? (Get this wrong and the new venture repeats the mistake)',
            'Then — estimate the new business\'s scale. Is it meaningful at the 1-year mark? (Even rough numbers)',
            'Include this — an "improve existing business" option too. Having a comparison doubles persuasiveness',
            'Check — can the current team handle it? If hiring is needed, the timeline changes completely',
            'The plan\'s core — "new venture vs. existing improvement" comparison table + your recommendation',
          ],
          insight: 'The most powerful page in the plan is the one showing "this is a better bet than improving what we have."',
        },
      },
      'The CEO has a personal conviction': {
        dmKey: 'ceo',
        snapshotPatch: {
          real_question: 'The CEO already wants to do this. The plan isn\'t about "should we?" — it\'s about "what do we do in month one?"',
          hidden_assumptions: [
            'When the decision is made, the proposal becomes an execution roadmap, not a pitch for approval',
            'Focus on "how" — but if there\'s a genuine dealbreaker, it\'s better to flag it now than later',
            'Understanding what convinced the CEO gives you the starting point for the plan',
          ],
          skeleton: [
            'First — ask the CEO: "What made you feel this would work?" This is your starting point',
            'Then — find one way to validate that conviction. The CEO will want confirmation too',
            'Get specific — first month plan: headcount, budget, what to build',
            'Set a checkpoint — "If this works, continue. If not, stop." One line is enough',
            'Finally — include one honest risk. This is what makes the plan credible',
          ],
          insight: 'When the direction is set, the plan\'s value is showing a concrete, feasible first step.',
        },
      },
      'I\'m not sure': {
        dmKey: 'ceo',
        snapshotPatch: {
          real_question: 'Without knowing the reason, you can\'t set the direction. Before writing anything, ask the CEO: "Why this, and why now?"',
          hidden_assumptions: [
            'Asking "why are we doing this?" is a normal first step in planning',
            'Writing without knowing the reason risks producing something that misses the mark entirely',
            'The CEO may not have fully articulated it either — the conversation helps both sides',
          ],
          skeleton: [
            'Today — ask the CEO "Why this, and why now?" (Slack or text is fine)',
            'Based on the answer — it\'ll be competition, revenue, or conviction. The structure follows from there',
            'If you can\'t ask directly — check with others: "What has the CEO been talking about lately?"',
            'While you wait — check technical feasibility. This is needed regardless of the reason',
            'Lock direction within 3 days — the remaining 11 days are your actual planning time',
          ],
          insight: 'A 15-minute conversation saves 2 weeks. A plan written without knowing the "why" will almost certainly miss the mark.',
        },
      },
    },
  },

  // ─── Q2: Biggest worry ───
  q2: {
    question: {
      id: 'demo-q2',
      text: 'What worries you the most right now?',
      subtext: 'Be honest. This helps us zero in on the right direction.',
      options: ['I don\'t know what to write', 'It won\'t be convincing enough', 'Not enough time', 'I\'ve never done planning'],
      type: 'select',
      engine_phase: 'reframe',
    },
    effects: {
      'I don\'t know what to write': {
        snapshotPatch: {
          insight: '"Not knowing what to write" is completely normal — you haven\'t heard the decision criteria yet. Focus on just 3 things: Will it work? How much? What if it doesn\'t?',
          hidden_assumptions: [
            'A proposal isn\'t about filling a blank document — it\'s about answering questions',
            'Figure out what the decision-maker will ask first, and the outline writes itself',
            'Three answers is enough for the backbone of any proposal',
          ],
        },
      },
      'It won\'t be convincing enough': {
        snapshotPatch: {
          insight: 'Persuasiveness isn\'t about volume of data. "I looked into this personally" is more powerful than 50 pages of research. Even one customer conversation changes your confidence level.',
          hidden_assumptions: [
            'Persuasiveness comes from the argument structure, not the amount of data',
            'If you can answer "why us?" in three sentences, that\'s enough',
            'Technical feasibility assessment is the strongest card the dev team can play',
          ],
        },
      },
      'Not enough time': {
        snapshotPatch: {
          insight: 'Two weeks feels short for a "finished document," but it\'s plenty for "gathering the materials to make a judgment call."',
          skeleton: [
            'Days 1-3 — CEO conversation + technical feasibility check',
            'Days 4-7 — Validate with 3 customers + key numbers',
            'Days 8-10 — One-page draft + CEO mid-check',
            'Days 11-14 — Incorporate feedback + final version',
            'Key — If the CEO says "direction looks right" by day 10, you\'ve succeeded',
          ],
          hidden_assumptions: [
            'Two weeks realistically means first draft + one feedback round',
            'When time is short, cutting scope is the answer',
            'Ask the CEO first: "What form are you expecting in 2 weeks?"',
          ],
        },
      },
      'I\'ve never done planning': {
        snapshotPatch: {
          insight: 'The core of planning is asking "will this actually work?" Market research can be assisted by tools, but "can we really build this?" — only the dev team can answer that.',
          hidden_assumptions: [
            'Planning isn\'t writing — it\'s structuring a judgment call',
            'A developer\'s "will this really work?" instinct is the most valuable skill in planning',
            'Non-technical parts (market/finance) can be AI-drafted; you verify',
          ],
        },
      },
    },
  },

  // ─── Workers (fixed) ───
  workers: [
    {
      persona: SUJIN,
      task: 'Research market landscape and competitive environment for the new business',
      completionNote: 'Distilled the key findings.',
      result: '**Bottom line: The market is large, but "SMB-focused" is still a white space.**\n\n- Domestic SaaS market growing 20%+ annually, roughly doubling by 2027\n- Three major players dominate but all target enterprise\n- Top complaint from SMB customers: "It doesn\'t fit our industry, so we end up not using it"',
    },
    {
      persona: HYUNWOO,
      task: 'Define MVP scope and differentiation strategy',
      completionNote: 'Direction is set.',
      result: '**Bottom line: MVP in 4 weeks is feasible. "Industry-specific" is our unique card.**\n\n- MVP scope: Auto-classification + industry templates + dashboard — these 3 features are enough to start\n- Big players go generic, requiring 2-3 months for onboarding. We pre-train for 1-week setup\n- Key pitch to the CEO: "What takes competitors 6 months, we do in 4 weeks"',
    },
    {
      persona: MINJAE,
      task: 'Build revenue model and initial cost estimates',
      completionNote: 'Numbers are ready.',
      result: '**Bottom line: Break-even at 30 paying customers. Year 1 revenue target: $200K.**\n\n- Monthly subscription model: $300-500/mo for SMBs\n- Initial costs: Primarily developer salaries, minimal marketing spend\n- Break-even: 30 paying customers (target within 6-8 months)',
    },
  ],

  // ─── Draft ───
  draft: {
    title: 'New Business Proposal',
    executive_summary: 'The market is growing 20%+ annually, and there\'s no specialized solution for SMBs. Leveraging our existing development capabilities, we\'ll launch an MVP within 4 weeks and reach break-even at 30 paying customers.',
    sections: [
      { heading: 'Market Opportunity', content: 'The market is growing over 20% annually. But most solutions are generic enterprise tools, and **there\'s no specialized service built for SMBs.** The #1 customer complaint: "It doesn\'t fit our industry."' },
      { heading: 'Our Differentiation', content: 'We go **industry-specific** instead of generic. What large vendors take 6 months to customize, we deliver in 1 week through pre-training. MVP is achievable in 4 weeks using our existing backend capabilities.' },
      { heading: 'Revenue Model', content: 'Monthly subscription at $300-500, break-even at 30 paying customers. Year 1 target: $200K in revenue. Initial costs are dev-team driven, no large upfront investment required.' },
    ],
    key_assumptions: [
      'Existing team can build MVP within 4 weeks',
      'SMBs willing to pay $300-500/month',
      'Industry specialization works as real differentiation',
    ],
    next_steps: [
      'Interview 5 potential customers — validate pain points',
      'Finalize MVP spec + begin development',
      'CEO first review (in 2 weeks)',
    ],
  },

  // ─── DM Variants (DM persona changes based on Q1 answer) ───
  dmVariants: {
    ceo: {
      persona_name: 'Mr. Kim',
      persona_role: 'CEO',
      first_reaction: 'I see the market is big. But why WE should do this is weak. What makes us different from everyone else?',
      good_parts: [
        'The 4-week MVP timeline is realistic and well-staged',
        'Break-even at 30 customers — clear, concrete number',
      ],
      concerns: [
        {
          text: 'I don\'t understand what "industry-specific" actually means. Which industry? Give me one concrete example.',
          severity: 'critical',
          fix_suggestion: 'Pick one target industry and add a specific problem-to-solution case study',
          applied: false,
        },
        {
          text: 'How do we land the first customers? There\'s no sales plan here.',
          severity: 'important',
          fix_suggestion: 'Add a customer acquisition strategy — existing network, free pilot program, etc.',
          applied: false,
        },
      ],
      would_ask: [
        'If competitors copy us, what\'s our moat?',
        'How much does AI cost eat into our margins?',
      ],
      approval_condition: 'If the target industry and customer acquisition method get specific, I\'d put this on the leadership meeting agenda.',
    },
    executive: {
      persona_name: 'Director Park',
      persona_role: 'VP of Business',
      first_reaction: 'The structure is fine. But there are no answers to what the CFO will ask in the leadership meeting.',
      good_parts: [
        'Market growth data is clear and well-sourced',
        'Including exit criteria upfront is a smart move',
      ],
      concerns: [
        {
          text: 'Exact initial investment cost is missing. That\'s the first thing the CFO will ask.',
          severity: 'critical',
          fix_suggestion: 'Add a detailed 6-month cost table (headcount, infrastructure, marketing — line by line)',
          applied: false,
        },
        {
          text: 'I don\'t see the synergy with our existing business. Need an answer to "why us?"',
          severity: 'important',
          fix_suggestion: 'Make the connection to existing assets explicit (customer base, tech stack)',
          applied: false,
        },
      ],
      would_ask: [
        'Do we need to pull people off existing projects?',
        'If it fails after 6 months, what\'s the sunk cost?',
      ],
      approval_condition: 'With a cost table and clear synergy with existing business, this can go on the next leadership meeting agenda.',
    },
    investor: {
      persona_name: 'Partner Lee',
      persona_role: 'VC Partner',
      first_reaction: 'The market is good, but the evidence that THIS team can win in THIS market is thin.',
      good_parts: [
        'Market size and growth rate meet investment criteria',
        '4-week MVP is a strong signal of team execution speed',
      ],
      concerns: [
        {
          text: 'There must be similar services already. The competitive analysis is too shallow.',
          severity: 'critical',
          fix_suggestion: 'Add a 3-competitor comparison matrix + our positioning',
          applied: false,
        },
        {
          text: 'No early traction plan. How do you get the first 10 customers?',
          severity: 'important',
          fix_suggestion: 'Add a 1-page go-to-market strategy — channels, first customers, conversion approach',
          applied: false,
        },
      ],
      would_ask: [
        'What domain experience does the team have?',
        'What\'s the 12-month KPI target?',
      ],
      approval_condition: 'With a stronger competitive analysis and GTM strategy, I\'d schedule a follow-up meeting.',
    },
  },

  // ─── Final Document ───
  finalBase: `# New Business Proposal

> Market growing 20%+ annually. No specialized SMB solution exists. MVP in 4 weeks. Break-even at 30 paying customers.

## Market Opportunity

The market is growing over 20% annually. But most solutions are generic enterprise tools, and **there's no specialized service built for SMBs.**

Top customer complaint: "Existing solutions don't fit our industry."

<!-- PATCH_0 -->

## Our Differentiation

**Industry-specific**, not generic. What large vendors take 6 months to customize, we deliver in 1 week through pre-training.

- MVP achievable in 4 weeks (leveraging existing backend capabilities)
- Scope limited to 3 core features

## Revenue Model

- Monthly subscription: $300-500 for SMBs
- Break-even: 30 paying customers
- Year 1 target: $200K revenue
<!-- PATCH_1 -->

## Risks and Decision Criteria

- **Go criteria**: 3+ out of 5 potential customers say "I'd use this"
- **No-Go criteria**: MVP timeline missed or zero customer interest

## Next Steps

1. Interview 5 potential customers (Week 1)
2. Finalize MVP spec + begin development (Week 2)
3. CEO first review (in 2 weeks)`,

  finalPatches: [
    // concern[0] applied: Specific target industry
    `
### Target Industry: E-commerce

Specific case: 80% of e-commerce seller support tickets follow repeat patterns (shipping/exchanges/returns). Industry-specific automation can **cut support staff costs by 30%**.

Generic solutions require 2-3 months to learn industry-specific terminology and workflows. We deliver in **under 1 week** through pre-training.`,
    // concern[1] applied: Customer acquisition strategy
    `

### Customer Acquisition Strategy

- **Existing network**: Propose free pilots to 10 SMBs within the team's personal network
- **Free trial**: 1 month free, then convert to paid after demonstrating results (target 30% conversion rate)
- **Content marketing**: Industry-specific success story blog posts to drive inbound leads`,
  ],
};

// ═══════════════════════════════════════════════════════════════
// ═══ SCENARIO 2: 🎯 Competitive Proposal ═══
// ═══════════════════════════════════════════════════════════════

const scenario2: DemoScenario = {
  id: 'proposal',
  title: 'Competitive Proposal',
  icon: '🎯',
  desc: 'How to win a pitch against a big competitor',
  problemText: 'We\'re pitching against a large enterprise next week. I need to convince them why we\'re the right choice.',

  team: [SUJIN, HYUNWOO, SEOYEON],

  analysis: {
    version: 0,
    real_question: 'Pitch prep next week — before making slides, find out why the client invited you in the first place',
    hidden_assumptions: [
      'The client didn\'t just invite the big firm — they called you too, and there\'s a reason for that',
      'Once you know that reason, the core message of your pitch writes itself',
      'The most common pitch mistake is making slides before understanding the client',
    ],
    skeleton: [
      'First — call the client contact. "I\'d like to ask a few things before the pitch" is all it takes',
      'Then — figure out why you were invited. Price? Referral? Bad experience with the big firm? That\'s the direction of your pitch',
      'Next — distill "why us instead of the big firm" into one sentence. This should run through everything',
      'Add — prepare answers to 3 likely objections. Concerns about scale, references, and staffing',
      'Finally — three core slides are enough. Client understanding / Why us / Execution plan',
    ],
    insight: 'The strongest opening line in a pitch is "We looked into your situation, and here\'s what we found." The team that knows the client wins.',
  },

  q1: {
    question: {
      id: 'demo-q1-2',
      text: 'Why did the client invite us to pitch?',
      subtext: 'This answer completely changes your pitch strategy.',
      options: ['We fit the budget', 'Someone referred us', 'They had a bad experience with a big firm', 'Not sure'],
      type: 'select',
      engine_phase: 'reframe',
    },
    effects: {
      'We fit the budget': {
        dmKey: 'manager',
        snapshotPatch: {
          real_question: 'You were invited because of price. But if you win on price alone, you\'ll face price pressure throughout the entire project. You need to shift to "this much value for this price."',
          hidden_assumptions: [
            'Even if price got you in the door, winning on price alone means getting squeezed the whole project',
            '"For this price, here\'s how much more we deliver than the big firm" is the right positioning',
            'If you lead with a price comparison, the "cheap vendor" image sticks',
          ],
          skeleton: [
            'First — don\'t bring up the price comparison yourself. If the client asks, answer then',
            'Then — show specifically "what\'s included at this price." The big firm charges extra for all of this',
            'Next — emphasize speed. "First deliverable within 2 weeks of kickoff" — the big firm takes 4 weeks just to start',
            'Add — promise direct communication. Contrast with the big firm\'s subcontractor structure',
            'Finally — close with the frame "you\'re buying efficiency, not a discount"',
          ],
          insight: 'Even if price opened the door, you need to win on value. Go in cheap, get treated cheap.',
        },
      },
      'Someone referred us': {
        dmKey: 'clevel',
        snapshotPatch: {
          real_question: 'You were referred. There\'s already trust on the table. Use it well.',
          hidden_assumptions: [
            'A referral is a powerful starting point — they already think "worth meeting"',
            'Find out who referred you and what they said — that gives you the pitch\'s core message',
            'Your goal is to exceed the referrer\'s promise — make it a confirming pitch',
          ],
          skeleton: [
            'First — find out who referred you and what they said. That\'s where the pitch starts',
            'Then — open with "We\'re here through [name]\'s introduction" — make the connection explicit',
            'Next — back up whatever the referrer said with specific examples of your work',
            'Add — preemptively address weaknesses the referrer probably didn\'t mention (scale, references)',
            'Finally — "We\'ve already looked into this project" — show the depth of your preparation',
          ],
          insight: 'A referral opens the door. Making them feel "this is the right team" once inside — that comes from how deeply you prepared.',
        },
      },
      'They had a bad experience with a big firm': {
        dmKey: 'manager',
        snapshotPatch: {
          real_question: 'The client got burned by a big firm. Your job is to show "we\'re different" in concrete, structural terms.',
          hidden_assumptions: [
            'If they had a bad experience, the key is knowing exactly what they hated most',
            'PM rotations, subcontractor layers, slow decisions — figure out which one was the problem',
            'You need to show "we\'re different" through structure, not just words',
          ],
          skeleton: [
            'First — find out what specifically went wrong. It\'s fine to ask the contact directly',
            'Then — show the opposite in your pitch. If PM turnover was the issue, promise "dedicated team, no rotation"',
            'Next — make your process tangible. "Weekly reviews, direct communication, immediate revisions"',
            'Add — bring a deliverable sample. "This quality, at this speed"',
            'Finally — a promise like "first deliverable within 2 weeks of kickoff." The speed big firms can\'t match',
          ],
          insight: 'For a client burned by a big firm, "we\'re different" as words means nothing. "Here\'s how we work" as structure is what convinces.',
        },
      },
      'Not sure': {
        dmKey: 'manager',
        snapshotPatch: {
          real_question: 'If you don\'t know why you were invited, find out before the pitch. Going in without knowing is shooting without a target.',
          hidden_assumptions: [
            'Without knowing why you were invited, you can\'t set the pitch\'s core message',
            '"What made you reach out to us?" — one question to the contact is all it takes',
            'Once you know the reason, your entire pitch strategy changes',
          ],
          skeleton: [
            'Today — contact the client. "To help us prepare, could you share what brought us to your attention?"',
            'Also ask — "What\'s the most important criteria for this project?"',
            'Based on the answer — it\'ll be price, a referral, or frustration with a big firm. Strategy differs for each',
            'If you can\'t reach them — look for clues in the RFP and the client\'s recent news',
            'Before the pitch — at minimum, have one sentence for "why they called us"',
          ],
          insight: 'A pitch without knowing why you were invited becomes "a proposal that fits anyone." A proposal that fits anyone gets picked by no one.',
        },
      },
    },
  },

  q2: {
    question: {
      id: 'demo-q2-2',
      text: 'What worries you most about going up against the big competitor?',
      subtext: 'Knowing this lets you address it in the proposal before they even ask.',
      options: ['We look too small', 'Not enough references', 'Can\'t compete on price', 'Brand recognition gap'],
      type: 'select',
      engine_phase: 'reframe',
    },
    effects: {
      'We look too small': {
        snapshotPatch: {
          insight: 'Don\'t hide "small team" as a weakness in the proposal. Reframe it: "Decisions are fast, and the founder is personally involved." That turns it into a strength.',
          hidden_assumptions: [
            '"Small team = risky" can be reframed as "small team = focused"',
            'Big firms rotate PMs and subcontract the real work — contrast this directly',
            'Senior people being hands-on is your strongest card',
          ],
        },
      },
      'Not enough references': {
        snapshotPatch: {
          insight: 'No references? Compete on "how much we\'ve already prepared for YOUR project." Depth of preparation beats a reference list.',
          hidden_assumptions: [
            'Demonstrating deep understanding of the client\'s industry during the pitch is stronger than any reference',
            'Offering a free pilot or prototype is also a strong card to play',
            'Acknowledge the gap honestly, then present a concrete alternative — that builds trust',
          ],
        },
      },
      'Can\'t compete on price': {
        snapshotPatch: {
          insight: 'You won\'t beat a big firm on price. Reframe: "For the same budget, here\'s how much more you get from us."',
          hidden_assumptions: [
            'You need to shift from price comparison to value comparison',
            'Big firms carry heavy overhead costs — make that visible and the math reverses',
            'The message isn\'t "we\'re cheaper" — it\'s "faster and more for the same money"',
          ],
        },
      },
      'Brand recognition gap': {
        snapshotPatch: {
          insight: 'Big firms send generic template proposals. If the client\'s name and specific challenges appear throughout yours, the "made for us" feeling is completely different.',
          hidden_assumptions: [
            'Fight with "understanding of this project," not brand recognition',
            'Even one pre-pitch interview with the client changes the perception completely',
            'Mentioning the client\'s specific situation by name is itself a differentiator',
          ],
        },
      },
    },
  },

  workers: [
    {
      persona: SUJIN,
      task: 'Analyze the client\'s industry landscape and the competing bidder',
      completionNote: 'Looked at it from the client\'s perspective.',
      result: '**Bottom line: What the client really wants is a partner who understands them.**\n\n- Client\'s industry is in early digital transformation — speed of adaptation is critical\n- Big competitor\'s pattern: generic proposals + subcontractor structure + slow decision-making\n- Opportunity: Emphasizing "customization" and "speed" gives us structural advantage',
    },
    {
      persona: HYUNWOO,
      task: 'Develop competitive positioning and pitch strategy',
      completionNote: 'Strategy is set.',
      result: '**Bottom line: "Small but dedicated to you" — this is the frame that wins.**\n\n- Attack big company weakness: "Their PM will rotate. Our founder is personally on this."\n- First 5 minutes of pitch: Show that we already understand their problem\n- Pricing: Position as "not cheap, but efficient" rather than undercutting',
    },
    {
      persona: SEOYEON,
      task: 'Design the proposal\'s core message and structure',
      completionNote: 'Framework is ready.',
      result: '**Bottom line: Proposal structure should be "Client\'s problem -> Our understanding -> Execution plan."**\n\n- First page: Client\'s name + their challenge (proof that we get it)\n- Middle: Success stories in similar contexts + specific timeline\n- Last page: "We can start next week" — leave them with a sense of speed',
    },
  ],

  draft: {
    title: 'Competitive Pitch Proposal',
    executive_summary: 'We deeply understand the client\'s digital transformation challenges. We win with what large firms can\'t offer: **a tailored approach + fast execution.** The team you see at the pitch is the team that delivers your project, start to finish.',
    sections: [
      { heading: 'The Client\'s Challenge', content: 'The core challenge is succeeding at digital transformation in a rapidly shifting market. But generic solutions from large vendors **can\'t deliver the industry-specific speed you need.**' },
      { heading: 'Why Us', content: 'At large firms, PMs rotate and subcontractors do the actual work. With us, **the team you meet at the pitch sees the project through to the end.** Decisions are fast. You get our full attention.' },
      { heading: 'Execution Plan', content: '**Prototype delivered within 2 weeks** of kickoff. Large firms take 4-6 weeks. Weekly progress reviews to adjust direction together.' },
    ],
    key_assumptions: [
      'Client values speed and customization over brand name',
      'We can demonstrate deep understanding at the pitch',
      'Lack of references can be offset by execution speed',
    ],
    next_steps: [
      'Final review of pitch materials + rehearsal',
      'Pre-pitch interview with client contact (if possible)',
      'Prepare 20 anticipated Q&A questions for pitch day',
    ],
  },

  dmVariants: {
    manager: {
      persona_name: 'Team Lead Lee',
      persona_role: 'Client Project Manager',
      first_reaction: 'I can feel the enthusiasm, but... to get this approved upstairs, I need more objective evidence.',
      good_parts: [
        'It\'s clear you understand our industry',
        'The timeline is specific, which builds confidence',
      ],
      concerns: [
        {
          text: 'I can\'t tell if you\'ve done a project of similar scale before. Even one reference would help.',
          severity: 'critical',
          fix_suggestion: 'Add 1 similar-scale/industry project case study (or relevant capability evidence if none exists)',
          applied: false,
        },
        {
          text: 'With a small team, I\'m worried about how much focus our project actually gets.',
          severity: 'important',
          fix_suggestion: 'Add a dedicated staffing plan + explicitly state "this project is our #1 priority"',
          applied: false,
        },
      ],
      would_ask: [
        'Are you running other projects at the same time?',
        'What guarantees that our contact person won\'t change mid-project?',
      ],
      approval_condition: 'With a clear reference and dedicated staffing plan, I can bring this to upper management.',
    },
    clevel: {
      persona_name: 'EVP Jung',
      persona_role: 'Client Head of Digital Innovation',
      first_reaction: 'The proposal itself isn\'t bad, but the reason to pick you over the big firm is still weak.',
      good_parts: [
        'The fast execution speed is attractive',
        'Having the founder directly involved feels genuine',
      ],
      concerns: [
        {
          text: 'I need more evidence that a company your size can handle a project like ours.',
          severity: 'critical',
          fix_suggestion: 'Add detailed team capabilities + contingency scaling plan (partner network, etc.)',
          applied: false,
        },
        {
          text: 'There\'s no long-term partnership perspective. What happens after this project ends?',
          severity: 'important',
          fix_suggestion: 'Add a 1-page post-project maintenance/expansion roadmap',
          applied: false,
        },
      ],
      would_ask: [
        'Will this company still be around in 3 years?',
        'What about security and compliance?',
      ],
      approval_condition: 'With a team capability plan and long-term partnership vision, you\'d stay in the final shortlist.',
    },
  },

  finalBase: `# Competitive Pitch Proposal

> We deeply understand the client's digital transformation challenges. We win with tailored approach + fast execution.

## The Client's Challenge

The core challenge is succeeding at digital transformation in a rapidly shifting market.

Generic solutions from large vendors **can't deliver the industry-specific speed you need.**

## Why Us

At large firms, PMs rotate and subcontractors do the actual work. With us, **the team you meet at the pitch sees the project through to the end.**

- Decision speed: Big firm 2 weeks -> Us 1 day
- Kickoff to delivery: Big firm 4-6 weeks -> Us 2 weeks
- Communication: Big firm weekly reports -> Us real-time channel
<!-- PATCH_0 -->

## Execution Plan

- **Weeks 1-2**: Kickoff + prototype delivery
- **Weeks 3-6**: Core feature development + weekly reviews
- **Weeks 7-8**: Testing + launch support

## Value for Investment

Not simply "cheaper" — **faster and more tailored results for the same budget.**
<!-- PATCH_1 -->

## Next Steps

1. Prototype delivered within 1 week of pitch (free)
2. Detailed timeline + contract terms within 2 weeks
3. First deliverable within 2 weeks of kickoff`,

  finalPatches: [
    `
### Relevant Project Experience

| Project | Scale | Duration | Result |
|---------|-------|----------|--------|
| Company A Digital Transformation | Mid-size enterprise | 3 months | 40% improvement in processing speed |

**Dedicated staffing**: 2 senior developers + 1 PM assigned full-time to this project. Founder participates in weekly reviews.`,
    `

### Long-term Partnership

- **Maintenance**: 3 months free support post-launch
- **Expansion roadmap**: Phase 2 feature expansion option after initial project completion
- **Dedicated channel**: Technical support channel remains active after project ends`,
  ],
};

// ═══════════════════════════════════════════════════════════════
// ═══ SCENARIO 3: ⚖️ Competitive Response ═══
// ═══════════════════════════════════════════════════════════════

const scenario3: DemoScenario = {
  id: 'strategy',
  title: 'Competitive Response',
  icon: '⚖️',
  desc: 'Competitor slashed prices — how do we respond?',
  problemText: 'A competitor just cut prices by 30%. I need to present a response strategy this week.',

  team: [SUJIN, HYUNWOO, DONGHYUK],

  analysis: {
    version: 0,
    real_question: 'What you need to decide this week: match the price cut, find another way, or wait and see',
    hidden_assumptions: [
      'First find out WHY they cut 30% — whether it\'s burning investor cash or a real cost advantage changes everything',
      'Matching the cut keeps revenue but shrinks margins — calculate how long you can sustain that first',
      'If customers stay with you for reasons beyond price, you may not need to match at all',
    ],
    skeleton: [
      'Today — ask your sales team: "How many customers have actually churned or inquired this month?"',
      'Tomorrow — check your margin structure. If you match the 30% cut, how many months can you survive?',
      'This week — find out why the competitor cut. Burning investor cash, or a permanent structural advantage?',
      'Then — lay out 3 options: match the cut / differentiate / selective discounts',
      'When reporting — compare each option\'s outcome 6 months out. That\'s the basis for the decision',
    ],
    insight: 'When it feels urgent, look at the numbers first. Actual churn, your margin cushion, their financial runway — these 3 numbers decide the strategy.',
  },

  q1: {
    question: {
      id: 'demo-q1-3',
      text: 'What\'s the main reason customers use us?',
      subtext: 'This decides whether you need to match the price cut or not.',
      options: ['Price is the main factor for most', 'Quality/service keeps most customers', 'It varies by customer', 'Honestly, not sure'],
      type: 'select',
      engine_phase: 'reframe',
    },
    effects: {
      'Price is the main factor for most': {
        dmKey: 'ceo',
        snapshotPatch: {
          real_question: 'If most customers are price-sensitive, not matching the cut means real churn. You need to decide fast.',
          hidden_assumptions: [
            'When price-sensitive customers are your core, "just differentiate" won\'t buy enough time',
            'A selective discount does less margin damage than a blanket price cut',
            'At the same time, you need to start building value beyond price for the long term',
          ],
          skeleton: [
            'Urgent — pull the at-risk customer list today. Your sales team already knows who they are',
            'This week — apply a selective discount (10-15%) to at-risk customers first',
            'At the same time — calculate what a full price match does to your margins. This number is your decision point',
            'In parallel — build a list of "what we offer beyond price." Dedicated support, fast response, etc.',
            'When reporting — present a 2-track strategy: "selective discounts to stop churn + value reinforcement within 3 months"',
          ],
          insight: 'In a price-sensitive market, a blanket cut kills your margins. Selective discounts + value building as a 2-track approach is what actually works.',
        },
      },
      'Quality/service keeps most customers': {
        dmKey: 'ceo',
        snapshotPatch: {
          real_question: 'If customers stay for quality, you may not need to match the price at all. What you need now is to clearly articulate "why we\'re worth the premium."',
          hidden_assumptions: [
            'Customers who chose you for quality won\'t jump ship over a 30% price difference immediately',
            'But if you can\'t explain "why we\'re worth more," they\'ll start to waver over time',
            'Now is the right moment to crystallize "our value proposition"',
          ],
          skeleton: [
            'First — check the churn data. Quality-focused customers probably haven\'t moved yet',
            'Then — articulate 3 reasons "why we\'re worth the premium." Dedicated manager, fast response, custom features',
            'Next — share this with the sales team. When a customer asks "why are you more expensive?", they should have the answer ready',
            'Add — if there are price-sensitive customers in the mix, handle them separately with selective discounts',
            'When reporting — present as "hold pricing + clarify our value." Back it with numbers',
          ],
          insight: 'If you\'re winning on quality, don\'t get pulled into a price war. Articulating "why the premium is worth it" is the strategy.',
        },
      },
      'It varies by customer': {
        dmKey: 'meeting',
        snapshotPatch: {
          real_question: 'If the reason varies by customer, a one-size-fits-all response won\'t work. You need to segment and respond differently to each group.',
          hidden_assumptions: [
            'Applying the same response to price-sensitive and quality-focused customers means losing both',
            'Once you segment, each group gets a tailored strategy',
            'For now, focus on the segment with the highest churn risk',
          ],
          skeleton: [
            'First — divide customers into 2-3 groups. Price-driven / quality-driven / relationship-driven',
            'Then — assess churn risk for each group. Start with "who\'s likely to move right now"',
            'Price group — consider selective discounts. Within margin tolerance',
            'Quality group — hold pricing + emphasize value. Share "why we\'re worth more" with the sales team',
            'When reporting — present as "segmented response." More precise than a blanket cut, less margin damage',
          ],
          insight: 'One response for all customers is the least efficient approach. Segment and respond, and you protect both margins and customers.',
        },
      },
      'Honestly, not sure': {
        dmKey: 'ceo',
        snapshotPatch: {
          real_question: 'If you don\'t know why customers use you, you can\'t build a response strategy. Calling 5 customers this week comes first.',
          hidden_assumptions: [
            'What you think your strength is and what customers actually feel may be very different',
            'Call 5 customers and ask: "Why do you use us? Would you stay if a competitor was 30% cheaper?" — the answer appears',
            'These conversations become the foundation data for your response strategy',
          ],
          skeleton: [
            'Today — pull a list of 5 existing customers. Mix large, small, and recent',
            'Tomorrow — call them. Be direct: "A competitor cut prices significantly. Would you stay with us?" ',
            'From the answers — you\'ll see patterns: price-sensitive / quality-loyal / relationship-based',
            'Based on the pattern — the direction becomes clear: blanket cut / selective discount / double down on value',
            'When reporting — "Customer interview results + recommended response." Data-backed arguments are persuasive',
          ],
          insight: 'Asking customers directly is the fastest path. "Why do you use us?" and "Would you stay if someone was 30% cheaper?" — these two questions decide the strategy.',
        },
      },
    },
  },

  q2: {
    question: {
      id: 'demo-q2-3',
      text: 'What\'s your biggest concern right now?',
      subtext: 'This sets the priority for your strategy.',
      options: ['Customers might leave', 'Matching the cut would destroy our margins', 'They could cut even more', 'I don\'t know what makes us different'],
      type: 'select',
      engine_phase: 'reframe',
    },
    effects: {
      'Customers might leave': {
        snapshotPatch: {
          insight: 'If churn is your worry, check the actual numbers first. It may be less than you think. And the customers leaving on price alone are often your lowest-margin accounts.',
          hidden_assumptions: [
            'Reacting without real churn data risks overreaction',
            'Customers who leave over price alone are often your lowest-margin accounts',
            'Core customers likely stay for quality and relationships, not price',
          ],
        },
      },
      'Matching the cut would destroy our margins': {
        snapshotPatch: {
          insight: 'If margins can\'t survive a match, then matching isn\'t the answer. "Keep the price, raise the value customers feel" is the realistic path.',
          hidden_assumptions: [
            'Matching the cut may preserve revenue but profits can plummet',
            'If there\'s no margin cushion, a price war is unwinnable',
            'Adding value to justify the current price is the more sustainable strategy',
          ],
        },
      },
      'They could cut even more': {
        snapshotPatch: {
          insight: 'If the price war could escalate, you can\'t fight on the same battlefield. Competing on value instead of price is the only lasting defense.',
          hidden_assumptions: [
            'Price wars are won by whoever has deeper pockets — it\'s a war of attrition',
            'First analyze whether the competitor can even sustain further cuts',
            'Building differentiation beyond price is the only real moat',
          ],
        },
      },
      'I don\'t know what makes us different': {
        snapshotPatch: {
          insight: 'If you don\'t know your strengths, ask your customers directly. "Why do you use us?" — what they say is your real differentiator.',
          hidden_assumptions: [
            'What you think your strength is and what customers feel may be very different',
            'Ask 5 existing customers "why haven\'t you switched?" — the answer emerges fast',
            'What customers say = the core of your strategy',
          ],
        },
      },
    },
  },

  workers: [
    {
      persona: SUJIN,
      task: 'Analyze the competitor\'s price cut rationale and market impact',
      completionNote: 'Background is clear.',
      result: '**Bottom line: The competitor\'s 30% cut is a land-grab after a funding round — likely unsustainable long-term.**\n\n- Competitor recently raised funding and is aggressively expanding — classic "burn cash for share" strategy\n- This is NOT a market-wide price decline — it\'s one player\'s move\n- Actual churn inquiries from our customers: still small (estimated under 5% of total)',
    },
    {
      persona: HYUNWOO,
      task: 'Develop response strategy scenarios',
      completionNote: 'Three scenarios mapped out.',
      result: '**Bottom line: "Don\'t cut prices — raise value" is the winning strategy.**\n\n- Scenario A (Match the cut): Revenue holds, margins drop 75%, near-breakeven within months\n- Scenario B (Differentiate): Accept 5-10% churn, maintain margins, increase per-customer value\n- Scenario C (Selective discounts): 15% discount only for at-risk customers, minimize margin impact',
    },
    {
      persona: DONGHYUK,
      task: 'Risk analysis for each scenario',
      completionNote: 'A few things to flag.',
      result: '**Bottom line: A price war is a war of attrition. Our runway is 6 months at best.**\n\n- Scenario A risk: If they cut again, we can\'t respond — it\'s a trap\n- Scenario B risk: Churn could be higher than expected — monitoring is essential\n- Scenario C risk: If the discount criteria are subjective, other customers will ask "why are we paying more?"',
    },
  ],

  draft: {
    title: 'Competitor Price Cut Response Strategy',
    executive_summary: 'The competitor\'s 30% price cut is a funding-fueled land grab — unlikely to be sustained long-term. **We recommend not matching the cut and instead raising our value.** Selective discounts for at-risk customers will be applied alongside this approach.',
    sections: [
      { heading: 'Competitor Analysis', content: 'The 30% cut follows a recent funding round — it\'s a market share play. **Prices are expected to normalize once funding burns through.** This is not a market-wide decline.' },
      { heading: 'Recommended Strategy: Differentiate + Selective Discounts', content: 'Instead of a blanket price cut, we respond with **service differentiation.** A targeted 15% discount applies only to high-churn-risk customers (price-sensitive segment). This minimizes margin impact while retaining key accounts.' },
      { heading: 'Projected Impact', content: 'Accept 5-10% churn, maintain margin structure. In 6 months, when the competitor\'s prices normalize, we\'ll be in the stronger position.' },
    ],
    key_assumptions: [
      'Competitor price cut won\'t last beyond 12 months',
      '70%+ of our customers prioritize quality/service over price',
      'Selective discounts can be contained without spreading to all customers',
    ],
    next_steps: [
      'Extract at-risk customer list immediately',
      'Finalize selective discount criteria + process (this week)',
      'Design the differentiation package (next week)',
    ],
  },

  dmVariants: {
    ceo: {
      persona_name: 'Mr. Kim',
      persona_role: 'CEO',
      first_reaction: 'The differentiation direction is right, but "what specific value are we adding?" isn\'t concrete enough. Think from the customer\'s perspective.',
      good_parts: [
        'Competitor analysis is clear-eyed and objective',
        'The 3-scenario comparison is genuinely helpful for decision-making',
      ],
      concerns: [
        {
          text: '"Differentiation" is too abstract. What tangible value does the customer actually feel?',
          severity: 'critical',
          fix_suggestion: 'Specify 3 concrete customer-facing value adds (dedicated account manager, fast response, custom features, etc.)',
          applied: false,
        },
        {
          text: 'You said 5-10% churn — what does that mean in revenue? Show me the number.',
          severity: 'important',
          fix_suggestion: 'Quantify the churn impact by scenario (monthly revenue basis)',
          applied: false,
        },
      ],
      would_ask: [
        'What\'s the criteria for selective discounts?',
        'What if the competitor holds the price for over 6 months?',
      ],
      approval_condition: 'If the differentiation is specific and the churn impact is quantified, I\'ll greenlight execution immediately.',
    },
    meeting: {
      persona_name: 'Leadership Meeting',
      persona_role: 'Executive Team',
      first_reaction: 'We agree on the direction, but each department will have different questions. Sales wants churn data, finance wants margins, product wants the differentiation plan.',
      good_parts: [
        'The scenario comparison is objective and well-structured',
        '"No price war" direction is sound and rational',
      ],
      concerns: [
        {
          text: 'Sales needs a customer-facing script they can use immediately. They need to explain "why we cost more."',
          severity: 'critical',
          fix_suggestion: 'Add a customer response FAQ: "Why are you more expensive?" with 3 value-based answers',
          applied: false,
        },
        {
          text: 'If selective discount criteria are subjective, the field teams will be confused. We need a clear decision matrix.',
          severity: 'important',
          fix_suggestion: 'Add a discount eligibility matrix (customer size x churn risk level)',
          applied: false,
        },
      ],
      would_ask: [
        'What\'s the impact on this quarter\'s revenue target?',
        'How much does the differentiation package cost to build?',
      ],
      approval_condition: 'With a customer response script and clear discount criteria, we can approve execution this week.',
    },
  },

  finalBase: `# Competitor Price Cut Response Strategy

> Competitor's 30% cut is a funding-fueled short-term play. We compete on value, not price.

## Competitor Analysis

The competitor's 30% price cut follows a recent funding round — it's a market share grab.

- Prices expected to normalize once funding burns through
- This is NOT a market-wide decline — it's one player's move
- Customer churn inquiries from our side: currently under 5%

## Recommended Strategy: Differentiate + Selective Discounts

Instead of a blanket price cut, we respond with **service differentiation.** Targeted 15% discount only for high-churn-risk customers.
<!-- PATCH_0 -->

## Scenario Comparison

| | Match the Cut | Differentiate (Recommended) | Selective Discounts |
|--|--------------|---------------------------|-------------------|
| Churn | Minimal | 5-10% | 3-5% |
| Margins | 75% decline | Maintained | Slight decline |
| In 6 months | Risk of losses | Stronger position | Stable |
<!-- PATCH_1 -->

## Risks

- If churn exceeds expectations: Monthly monitoring for immediate detection
- If competitor cuts further: Maintain "no price war" principle, accelerate differentiation

## Immediate Action Items

1. Extract at-risk customer list (today)
2. Finalize selective discount criteria + process (this week)
3. Design differentiation package (next week)`,

  finalPatches: [
    `

### Customer-Facing Value (Differentiation Specifics)

The value our customers get that justifies the premium:

1. **Dedicated account manager**: Competitor uses a call center; we give you a direct line to your person
2. **Custom configuration**: Industry-specific pre-optimization — results from week one
3. **Fast response**: Under 4 hours to respond (competitor average: 24 hours)`,
    `

### Churn Impact Quantified

| Churn Rate | Monthly Revenue Loss | Annual Impact |
|------------|---------------------|---------------|
| 5% | ~$5,000 | $60,000 |
| 10% | ~$10,000 | $120,000 |
| 15% | ~$15,000 | $180,000 |

At the estimated 5-10% churn rate, **annual impact is $60K-$120K.** The goal is to keep churn below 5% through the differentiation strategy.`,
  ],
};

// ─── Export ───

export const DEMO_SCENARIOS_EN: DemoScenario[] = [scenario1, scenario2, scenario3];
