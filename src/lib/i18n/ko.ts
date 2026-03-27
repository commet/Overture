export const ko = {
  // Common UI
  'common.retry': '다시 시도',
  'common.confirm': '확정',
  'common.cancel': '취소',
  'common.delete': '삭제',
  'common.save': '저장',
  'common.loading': '로딩 중...',
  'common.error': '오류가 발생했습니다',
  'common.newStart': '새로 시작',

  // Tools
  'tool.reframe': '악보 해석',
  'tool.reframe.subtitle': '문제 재정의',
  'tool.recast': '편곡',
  'tool.recast.subtitle': '실행 설계',
  'tool.rehearsal': '리허설',
  'tool.rehearsal.subtitle': '페르소나 피드백',
  'tool.ensemble': '합주',
  'tool.ensemble.subtitle': '수렴 연습',

  // Reframe
  'reframe.placeholder': '해결하고 싶은 과제를 입력하세요',
  'reframe.analyzing': '악보를 읽고 있습니다...',
  'reframe.direction': '어떤 방향으로 접근하시겠습니까?',
  'reframe.reframe': '질문 재정의',
  'reframe.reframing': '질문을 재정의하고 있습니다...',
  'reframe.assumptions': '검증 필요한 전제',
  'reframe.aiLimitations': 'AI 한계',

  // Recast
  'recast.placeholder': '맥락을 선택하고 목표를 입력하세요',
  'recast.analyzing': '편곡하고 있습니다...',
  'recast.governingIdea': '핵심 방향',
  // recast.review removed (multi-lens review replaced by auto-persona + rehearsal)

  // Rehearsal
  'rehearsal.title': '리허설',
  'rehearsal.feedback': '피드백 받기',

  // Ensemble
  'ensemble.convergence': '수렴도',
  'ensemble.blocker': '차단 이슈',
  'ensemble.improvement': '개선 이슈',

  // Rate limit
  'rateLimit.remaining': '{remaining}/{total} 남음',
  'rateLimit.exceeded': '일일 무료 사용량을 초과했습니다',
  'rateLimit.useApiKey': 'API 키를 입력하면 제한 없이 사용할 수 있습니다',

  // Errors
  'error.network': '네트워크 연결을 확인해주세요',
  'error.auth': '인증이 필요합니다. 다시 로그인해주세요',
  'error.llm': 'LLM 호출 중 오류가 발생했습니다',
  'error.unexpected': '예기치 않은 오류가 발생했습니다',

  // Concertmaster
  'concertmaster.title': '악장',
  'concertmaster.open': '악장 열기',
  'concertmaster.close': '닫기',
  'concertmaster.noInsights': '새로운 인사이트가 없습니다.',
  'concertmaster.firstSession': '첫 분석을 시작하면 인사이트가 쌓입니다.',
  'concertmaster.sessions': '{count}회 분석',
  'concertmaster.projects': '{count}개 프로젝트',
  'concertmaster.preferredStrategy': '선호 전략: {strategy}',
  'concertmaster.overrideRate': 'AI 수정률: {rate}%',
  'concertmaster.avgPassRate': '평균 활용률: {rate}%',

  // Settings
  'settings.language': '언어',
  'settings.apiKey': 'API 키',
  'settings.mode': 'LLM 모드',
} as const;

export type TranslationKey = keyof typeof ko;
