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

  'settings.language': 'Language',
  'settings.apiKey': 'API Key',
  'settings.mode': 'LLM Mode',
};
