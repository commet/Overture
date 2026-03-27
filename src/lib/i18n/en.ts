import type { TranslationKey } from './ko';

export const en: Record<TranslationKey, string> = {
  'common.retry': 'Retry',
  'common.confirm': 'Confirm',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.save': 'Save',
  'common.loading': 'Loading...',
  'common.error': 'An error occurred',
  'common.newStart': 'Start Over',

  'tool.reframe': 'Score Reading',
  'tool.reframe.subtitle': 'Problem Reframing',
  'tool.recast': 'Arrangement',
  'tool.recast.subtitle': 'Execution Design',
  'tool.rehearsal': 'Rehearsal',
  'tool.rehearsal.subtitle': 'Persona Feedback',
  'tool.ensemble': 'Ensemble',
  'tool.ensemble.subtitle': 'Convergence Practice',

  'reframe.placeholder': 'Enter the challenge you want to solve',
  'reframe.analyzing': 'Reading the score...',
  'reframe.direction': 'Which direction would you take?',
  'reframe.reframe': 'Reframe Question',
  'reframe.reframing': 'Reframing the question...',
  'reframe.assumptions': 'Assumptions to Verify',
  'reframe.aiLimitations': 'AI Limitations',

  'recast.placeholder': 'Select context and enter your goal',
  'recast.analyzing': 'Arranging...',
  'recast.governingIdea': 'Governing Idea',
  // recast.review removed (multi-lens review replaced by auto-persona + rehearsal)

  'rehearsal.title': 'Rehearsal',
  'rehearsal.feedback': 'Get Feedback',

  'ensemble.convergence': 'Convergence',
  'ensemble.blocker': 'Blockers',
  'ensemble.improvement': 'Improvements',

  'rateLimit.remaining': '{remaining}/{total} remaining',
  'rateLimit.exceeded': 'Daily free usage exceeded',
  'rateLimit.useApiKey': 'Enter your API key for unlimited access',

  'error.network': 'Please check your network connection',
  'error.auth': 'Authentication required. Please log in again',
  'error.llm': 'Error during LLM call',
  'error.unexpected': 'An unexpected error occurred',

  'concertmaster.title': 'Concertmaster',
  'concertmaster.open': 'Open Concertmaster',
  'concertmaster.close': 'Close',
  'concertmaster.noInsights': 'No new insights.',
  'concertmaster.firstSession': 'Insights will accumulate after your first analysis.',
  'concertmaster.sessions': '{count} analyses',
  'concertmaster.projects': '{count} projects',
  'concertmaster.preferredStrategy': 'Preferred strategy: {strategy}',
  'concertmaster.overrideRate': 'AI override rate: {rate}%',
  'concertmaster.avgPassRate': 'Avg utilization: {rate}%',

  // Coaching — Reframe
  'coaching.reframe.firstUse': 'First analysis. Enter your challenge and we\'ll uncover hidden assumptions.',
  'coaching.reframe.firstUseDetail': 'Try asking yourself "What am I taking for granted in this question?" before you begin. It leads to sharper assumptions.',
  'coaching.reframe.demoAllAccepted': 'You accepted all premises in the demo.',
  'coaching.reframe.demoAllAcceptedDetail': 'This time, try questioning at least one assumption. Doubting a premise can reshape the entire question.',
  'coaching.reframe.demoAllDoubted': 'You doubted all {total} premises in the demo — strong critical thinking.',
  'coaching.reframe.demoAllDoubtedDetail': 'Apply that same sharpness here. Mark which assumptions are most risky — they\'ll carry into the execution design.',
  'coaching.reframe.demoPartialDoubted': 'You doubted {doubted} of {total} premises in the demo.',
  'coaching.reframe.demoPartialDoubtedDetail': 'Apply the same standard here. Mark doubtful assumptions and they\'ll be verified in later steps.',
  'coaching.reframe.assumptionGrowth': 'Assumption discovery is increasing (avg {old} → {new}).',
  'coaching.reframe.assumptionGrowthDetail': 'You\'re developing a habit of digging deeper into problems.',
  'coaching.reframe.strategyRepetition': 'You\'ve been using \'{strategy}\' frequently. Try a different angle.',
  'coaching.reframe.assumptionEngage': 'Try evaluating assumptions more actively.',
  'coaching.reframe.assumptionEngageDetail': 'Marking assumptions as "confirmed" or "doubtful" improves analysis quality.',
  'coaching.reframe.highPassRate': 'Analysis utilization at {pct}% — you\'re actively using the results.',

  // Coaching — Recast
  'coaching.recast.firstUse': 'Execution design phase.',
  'coaching.recast.firstUseDetail': 'For each step, ask "If this fails, who would notice?" — it makes checkpoint placement more precise.',
  'coaching.recast.demoAiHeavy': 'You delegated most steps to AI in the demo.',
  'coaching.recast.demoAiHeavyDetail': 'Try placing "human" or "collab" on key judgment steps. Checkpoints catch failures early.',
  'coaching.recast.demoHumanHeavy': 'You assigned most steps to humans in the demo.',
  'coaching.recast.demoHumanHeavyDetail': 'Delegate repetitive steps to AI and focus human effort where judgment matters.',
  'coaching.recast.demoBalanced': 'You balanced AI and human roles well in the demo.',
  'coaching.recast.demoBalancedDetail': 'Apply the same question here: "Who should do this step for the best outcome?"',
  'coaching.recast.overrideHigh': 'You frequently modify AI suggestions ({pct}%). This pattern is being reflected.',
  'coaching.recast.prefersHuman': 'You tend to prefer human execution.',
  'coaching.recast.prefersAi': 'You delegate heavily to AI. Make sure you have enough checkpoints.',
  'coaching.recast.uncertainAssumptions': '{count} uncertain assumptions from reframing — include verification steps in your design.',

  // Coaching — Rehearse
  'coaching.rehearse.firstUse': 'Personas will stress-test your plan.',
  'coaching.rehearse.firstUseDetail': 'Before the rehearsal, ask yourself: "What\'s the most uncomfortable question someone could ask?" It helps you receive feedback more deeply.',
  'coaching.rehearse.accuracyImproving': 'Persona accuracy is improving ({from} → {to}).',
  'coaching.rehearse.accuracyImprovingDetail': 'Simulation quality is increasing as persona feedback gets incorporated.',
  'coaching.rehearse.keyAssumptions': '{count} high-importance assumptions from the design — have personas validate them.',
  'coaching.rehearse.personaAccuracy': 'Persona accuracy {score}/5 ({count} ratings)',

  // Coaching — Refine
  'coaching.refine.firstUse': 'This is the convergence phase.',
  'coaching.refine.firstUseDetail': 'When making changes, ask: "How does this affect other steps?" Thinking holistically increases the chance of converging in one iteration.',
  'coaching.refine.dqImproving': 'Decision quality is improving ({prev} → {current}).',
  'coaching.refine.dqDeclining': 'Decision quality has declined ({prev} → {current}). Review assumptions more carefully this time.',
  'coaching.refine.biggestGain': 'Biggest improvement: {element}',
  'coaching.refine.biggestDrop': 'Decline cause: {element}',
  'coaching.refine.iterationStatus': 'Currently on iteration {count}. If threats are decreasing, convergence is near.',

  // Learning Curve
  'learning.trendImproving': 'Improving',
  'learning.trendStable': 'Stable',
  'learning.trendDeclining': 'Declining',
  'learning.trendNoData': 'Collecting data',
  'learning.dqTrend': 'Decision Quality Trend',
  'learning.exploredAxes': 'Explored Perspectives',
  'learning.axisGap': '{axis} perspective hasn\'t been explored yet',
  'learning.tierLabel': 'Tier {tier}',

  // Settings
  'settings.language': 'Language',
  'settings.apiKey': 'API Key',
  'settings.mode': 'LLM Mode',
};
