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

  'tool.decompose': 'Score Reading',
  'tool.decompose.subtitle': 'Problem Reframing',
  'tool.orchestrate': 'Arrangement',
  'tool.orchestrate.subtitle': 'Execution Design',
  'tool.rehearsal': 'Rehearsal',
  'tool.rehearsal.subtitle': 'Persona Feedback',
  'tool.ensemble': 'Ensemble',
  'tool.ensemble.subtitle': 'Convergence Practice',

  'decompose.placeholder': 'Enter the challenge you want to solve',
  'decompose.analyzing': 'Reading the score...',
  'decompose.direction': 'Which direction would you take?',
  'decompose.reframe': 'Reframe Question',
  'decompose.reframing': 'Reframing the question...',
  'decompose.assumptions': 'Assumptions to Verify',
  'decompose.aiLimitations': 'AI Limitations',

  'orchestrate.placeholder': 'Select context and enter your goal',
  'orchestrate.analyzing': 'Arranging...',
  'orchestrate.governingIdea': 'Governing Idea',
  // orchestrate.review removed (multi-lens review replaced by auto-persona + rehearsal)

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

  'settings.language': 'Language',
  'settings.apiKey': 'API Key',
  'settings.mode': 'LLM Mode',
};
