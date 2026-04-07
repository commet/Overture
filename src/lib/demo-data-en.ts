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
    real_question: 'New business planning — build the case for "is this worth doing?" within 2 weeks',
    hidden_assumptions: [
      'A proposal isn\'t a perfect report — it\'s the process of gathering the materials needed to make a judgment call',
      'Two weeks usually means a first draft + feedback, not a polished final document',
      'Dev experience is actually an advantage — you can judge technical feasibility more accurately than any planning expert',
    ],
    skeleton: [
      'Who reads this and what do they decide? — This determines the structure',
      'Is it technically feasible? — The dev team can answer this most accurately',
      'Do people actually want it? — Even 3 conversations are enough to validate',
      'Do the numbers work? — Even rough estimates are better than none',
      'When to stop — Having kill criteria upfront builds credibility',
    ],
    insight: 'A proposal isn\'t about writing the right answer. It\'s about gathering the materials needed to make a judgment call.',
  },

  // ─── Q1: Understanding the context ───
  q1: {
    question: {
      id: 'demo-q1',
      text: 'Why do you think the CEO assigned this?',
      subtext: 'The reason completely changes where your proposal should focus.',
      options: ['A competitor beat us to the punch', 'Revenue growth has stalled', 'The CEO has a personal conviction', 'I\'m not sure'],
      type: 'select',
      engine_phase: 'reframe',
    },
    effects: {
      'A competitor beat us to the punch': {
        dmKey: 'ceo',
        snapshotPatch: {
          real_question: 'Competitive response plan — find our entry point in the market the competitor just validated',
          hidden_assumptions: [
            'A competitor going first means the market exists — they saved you the validation cost',
            'Building the same thing puts you at a late-mover disadvantage — find what you can do differently',
            'Spending 2 weeks on competitive analysis leaves no time for the actual plan',
          ],
          skeleton: [
            'Try the competitor\'s product yourself — skip the press, use the real thing (1 hour)',
            'Check direction with the CEO — "Same thing, or go different?"',
            'Ask 3 customers — "Have you tried theirs? What do you think?" Their reaction is your market validation',
            'One thing only we can do — A technical differentiator (your team\'s domain)',
            'Core of the plan — "Here\'s what they did, here\'s how we\'re different" comparison',
          ],
          insight: 'The competitor opened the market for you. What you need now isn\'t an analysis report — it\'s one thing you can do that they can\'t.',
        },
      },
      'Revenue growth has stalled': {
        dmKey: 'executive',
        snapshotPatch: {
          real_question: 'Growth breakthrough plan — is the new business big enough to move the needle, or is fixing the existing business faster?',
          hidden_assumptions: [
            'Whether the plateau is market saturation vs. execution issues completely changes the plan',
            'A new venture without synergy to the existing business is a much harder sell',
            'A proposal without numbers won\'t get past the first review',
          ],
          skeleton: [
            'Why isn\'t current revenue growing? — Market issue or execution? (Getting this wrong repeats the mistake)',
            'Projected scale of the new business — Is it meaningful at the 1-year mark? (Even rough estimates)',
            'The "improve existing business" option — Having a comparison doubles the proposal\'s persuasiveness',
            'Can the current team handle it? — If hiring is needed, the timeline changes completely',
            'Core of the plan — "New venture vs. existing improvement" comparison table + recommendation',
          ],
          insight: 'The most powerful slide in a new venture proposal is the one showing "this is a better bet than improving what we have."',
        },
      },
      'The CEO has a personal conviction': {
        dmKey: 'ceo',
        snapshotPatch: {
          real_question: 'Execution plan — if the direction is already decided, the question isn\'t "should we?" but "how do we start?"',
          hidden_assumptions: [
            'When the decision is made, the proposal becomes an execution roadmap, not a pitch for approval',
            'Focus on "how" — but if there\'s a genuine dealbreaker, it\'s better to flag it now than later',
            'Understanding what convinced the CEO gives you the starting point for the plan',
          ],
          skeleton: [
            'The CEO\'s conviction — "What made you feel this would work?" (This is your starting point)',
            'One way to validate that conviction — the CEO will want confirmation too',
            'First month execution plan — headcount, budget, what to build, specifically',
            'One-month checkpoint — "If this works, continue. If not, stop."',
            'One honest risk — including this actually raises the proposal\'s credibility',
          ],
          insight: 'If the direction is set, the proposal\'s value is in showing a concrete, feasible first step.',
        },
      },
      'I\'m not sure': {
        dmKey: 'ceo',
        snapshotPatch: {
          real_question: 'Direction first — without knowing the reason, you can\'t set the plan\'s direction. Asking is the fastest path',
          hidden_assumptions: [
            'Asking "why are we doing this?" is a normal first step in planning',
            'Writing without knowing the reason risks producing something that misses the mark entirely',
            'The CEO may not have fully articulated it either — the conversation helps both sides',
          ],
          skeleton: [
            'Today — ask the CEO "Why this, and why now?" (Slack or text is fine)',
            'Based on the answer — it\'ll be one of: competition, revenue, or conviction. Direction follows from there',
            'If you can\'t ask directly — check with others: "What has the CEO been talking about lately?"',
            'While you wait — check technical feasibility first (needed regardless of the reason)',
            'Lock direction within 3 days — the remaining 11 days are your actual planning time',
          ],
          insight: 'A proposal written without knowing the "why" has a high chance of missing the mark. A 15-minute conversation saves 2 weeks.',
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
    real_question: 'When competing against a big company, you need an answer to "why should we pick the small guys?"',
    hidden_assumptions: [
      'The client is holding a pitch because they\'re NOT sure the big company is the right choice',
      'Big company weaknesses: slow, expensive, you\'re just another account to them',
      'It\'s not about price — it\'s about "we actually care about this project"',
    ],
    skeleton: [
      'The client\'s real problem — What they said vs. what they actually need',
      'Why us? — What the big company can\'t do',
      'Execution plan — Specific and fast timeline',
      'Risk management — Address the "small company = risky" anxiety',
      'Pricing — Value-based, not cheap-based',
    ],
    insight: 'Winning a competitive pitch isn\'t about proving "we\'re better" — it\'s about making them feel "this project belongs with us."',
  },

  q1: {
    question: {
      id: 'demo-q1-2',
      text: 'Who makes the final decision on the proposal?',
      subtext: 'The same proposal lands completely differently depending on who\'s in the room.',
      options: ['The hands-on project lead', 'A department head / team lead', 'C-level executive', 'Not sure yet'],
      type: 'select',
      engine_phase: 'reframe',
    },
    effects: {
      'The hands-on project lead': {
        dmKey: 'manager',
        snapshotPatch: {
          real_question: 'If the project lead decides — you need to make them feel "working with this team would be easy"',
          hidden_assumptions: [
            'Project leads want a team that\'s easy to work with — communication is everything',
            'Big company proposals usually mean PM rotations and subcontractors doing the real work — that\'s their weakness',
            'Project leads care more about actual deliverable samples than polished slides',
          ],
          insight: 'For a hands-on project lead, "a team that talks directly to you" is your most powerful weapon.',
        },
      },
      'A department head / team lead': {
        dmKey: 'manager',
        snapshotPatch: {
          real_question: 'If a middle manager decides — you need to make it easy for them to justify the choice to their boss',
          hidden_assumptions: [
            'Department heads need to report upward — they need to be able to explain "why this vendor"',
            'A quantitative comparison table makes their internal pitch much easier',
            'A clear risk mitigation plan gives the manager confidence to sign off',
          ],
          insight: 'If a department head decides, the real audience for your proposal isn\'t them — it\'s their boss.',
        },
      },
      'C-level executive': {
        dmKey: 'clevel',
        snapshotPatch: {
          real_question: 'If a C-level is watching — you need to sell vision and trust, not details',
          hidden_assumptions: [
            'C-levels don\'t evaluate features — they evaluate "can I trust this team?"',
            'Success stories from similar projects are the strongest evidence',
            'Frame everything as ROI, not price',
          ],
          insight: 'You get 15 minutes with a C-level. If you don\'t create a "these are the right people" feeling in the first 5, the rest won\'t matter.',
        },
      },
      'Not sure yet': {
        dmKey: 'manager',
        snapshotPatch: {
          real_question: 'If you don\'t know the decision-maker — finding out is more important than prepping the pitch',
          hidden_assumptions: [
            'Preparing a pitch without knowing the decision-maker means you\'ll probably miss the mark',
            'Ask the contact: "What does the final decision process look like?"',
            'Usually the person who requested the pitch is NOT the final decision-maker',
          ],
          insight: '"Who makes the final call?" is a question you\'re absolutely supposed to ask. It\'s the professional thing to do.',
        },
      },
    },
  },

  q2: {
    question: {
      id: 'demo-q2-2',
      text: 'What worries you most against the big competitor?',
      subtext: 'You need to know your weakness to build a strategy around it.',
      options: ['We look too small', 'Not enough references', 'Can\'t compete on price', 'Brand recognition gap'],
      type: 'select',
      engine_phase: 'reframe',
    },
    effects: {
      'We look too small': {
        snapshotPatch: {
          insight: 'Turn "small" from a weakness into a strength: "Fast decisions, and our founder is personally involved."',
          hidden_assumptions: [
            'Reframe "small team = risky" as "small team = focused"',
            'Big companies rotate PMs and subcontract the real work — contrast this directly',
            'Senior people being hands-on is your strongest card',
          ],
        },
      },
      'Not enough references': {
        snapshotPatch: {
          insight: 'Instead of references, show "how much we\'ve already invested in understanding YOUR project." That\'s more powerful.',
          hidden_assumptions: [
            'Without references, compete on depth of preparation',
            'Showing deep understanding of the client\'s industry during the pitch beats any reference list',
            'Offering a free pilot or prototype is also a strong move',
          ],
        },
      },
      'Can\'t compete on price': {
        snapshotPatch: {
          insight: 'Competing on price against a big company is a losing game. Reframe to "value you get for the same money."',
          hidden_assumptions: [
            'You need to shift from price comparison to value comparison',
            'Not "we\'re cheaper" but "you get more for this budget"',
            'Big companies have high overhead — make that visible and the math reverses',
          ],
        },
      },
      'Brand recognition gap': {
        snapshotPatch: {
          insight: 'Fight with "understanding of this project," not brand. Generic proposal vs. custom-built proposal.',
          hidden_assumptions: [
            'Big companies usually recycle a generic template — a tailored proposal stands out',
            'If the client\'s name appears 20+ times in your proposal, it feels "made for us"',
            'Even one pre-pitch interview with the client changes the perception completely',
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
    real_question: 'The question isn\'t "should we match the price cut?" — it\'s "is price actually our competitive advantage?"',
    hidden_assumptions: [
      'First check whether the competitor\'s price cut is even sustainable',
      'If we match the cut, run the numbers on whether margins can survive',
      'What makes us different beyond price is the real question',
    ],
    skeleton: [
      'Competitor analysis — Why did they cut 30%? Can they sustain it?',
      'Our position — Margin structure, customer churn data',
      'Options — Match the cut vs. differentiate vs. hybrid',
      'Scenario simulation — Revenue/margin impact for each option',
      'Recommendation + decision criteria',
    ],
    insight: 'Nobody wins a price war. "We don\'t compete on price" can itself be the strategy.',
  },

  q1: {
    question: {
      id: 'demo-q1-3',
      text: 'Who makes the final call on this response strategy?',
      subtext: 'The decision-maker determines the depth and format of your analysis.',
      options: ['The CEO directly', 'Leadership meeting', 'Board-level agenda', 'Not sure yet'],
      type: 'select',
      engine_phase: 'reframe',
    },
    effects: {
      'The CEO directly': {
        dmKey: 'ceo',
        snapshotPatch: {
          real_question: 'If the CEO decides — you need to show "what happens if we match" vs. "what happens if we don\'t" side by side',
          hidden_assumptions: [
            'CEOs may lean on gut instinct — compress to 3 key numbers',
            'Matching the price keeps revenue but shrinks margins — present this tradeoff clearly',
            '"Do nothing" must also be presented as a valid option',
          ],
          insight: 'For the CEO: three options + the consequences of each, on a single page. That\'s what works.',
        },
      },
      'Leadership meeting': {
        dmKey: 'meeting',
        snapshotPatch: {
          real_question: 'For a leadership meeting — each executive will ask from their org\'s perspective. Prepare answers in advance.',
          hidden_assumptions: [
            'Sales exec: "How much churn?" / CFO: "Can our margins handle it?"',
            'To drive consensus in a room of execs, data must lead over emotion',
            'One recommended option + "if not this, then Plan B" structure accelerates decisions',
          ],
          insight: 'In a leadership meeting, it\'s not "the right answer" that wins — it\'s "once you see this data, there\'s only one answer."',
        },
      },
      'Board-level agenda': {
        dmKey: 'meeting',
        snapshotPatch: {
          real_question: 'At board level — you need a long-term competitive strategy frame, not just a price response',
          hidden_assumptions: [
            'The board looks at long-term market positioning, not short-term tactics',
            'A price response is tactical — what the board wants is strategic',
            'You also need to analyze the competitor\'s price cut impact on the overall market',
          ],
          insight: 'For the board, the question isn\'t "should we cut prices?" — it\'s "what\'s our long-term position in this market?"',
        },
      },
      'Not sure yet': {
        dmKey: 'ceo',
        snapshotPatch: {
          real_question: 'If you don\'t know the decision structure — prepare for the CEO but keep detailed data ready for a leadership meeting',
          hidden_assumptions: [
            'Urgent responses are usually decided by the CEO directly',
            'But a major pricing change may need executive consensus',
            'Preparing two formats is wasteful — CEO-level summary + data appendix covers all scenarios',
          ],
          insight: 'A one-page CEO summary + a detailed data appendix handles any decision structure.',
        },
      },
    },
  },

  q2: {
    question: {
      id: 'demo-q2-3',
      text: 'What\'s your biggest concern?',
      subtext: 'This shapes the strategy direction.',
      options: ['Customers might leave', 'Matching the cut would destroy our margins', 'They could cut even more', 'I don\'t know what makes us different'],
      type: 'select',
      engine_phase: 'reframe',
    },
    effects: {
      'Customers might leave': {
        snapshotPatch: {
          insight: 'If churn is your worry — first check the actual churn numbers. Perception and reality are often very different.',
          hidden_assumptions: [
            'Reacting without real churn data risks overreaction',
            'Customers who leave over price alone are often your lowest-margin accounts',
            'Core customers likely stay for quality and relationships, not price',
          ],
        },
      },
      'Matching the cut would destroy our margins': {
        snapshotPatch: {
          insight: 'If margins are the worry, the answer is "find a way to NOT match the cut." Raise the value instead.',
          hidden_assumptions: [
            'Matching the cut may preserve revenue but profits can plummet',
            'If there\'s no margin cushion, a price war is unwinnable',
            'Adding value to justify the current price is the more realistic strategy',
          ],
        },
      },
      'They could cut even more': {
        snapshotPatch: {
          insight: 'If the price war could escalate, the answer is to fight on a completely different battlefield.',
          hidden_assumptions: [
            'Price wars are won by whoever has deeper pockets — it\'s a war of attrition',
            'Analyze whether the competitor can sustain further cuts',
            'Building differentiation beyond price is the only real moat',
          ],
        },
      },
      'I don\'t know what makes us different': {
        snapshotPatch: {
          insight: 'If you don\'t know your strengths, ask your customers. "Why do you stick with us?" — the answer is right there.',
          hidden_assumptions: [
            'What you think your strength is and what customers feel may be very different',
            'Ask 5 existing customers "why haven\'t you switched to a competitor?" — the answer emerges',
            'What customers say = the real differentiation',
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
      result: '**Bottom line: "Don\'t cut prices — raise value" is the winning strategy.**\n\n- Scenario A (Match the cut): Revenue holds, margins drop 40%, risk of losses within 6 months\n- Scenario B (Differentiate): Accept 5-10% churn, maintain margins, increase per-customer value\n- Scenario C (Selective discounts): 15% discount only for at-risk customers, minimize margin impact',
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
| Margins | 40% decline | Maintained | Slight decline |
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
