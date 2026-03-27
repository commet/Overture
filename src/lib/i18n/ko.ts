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

  // Coaching — Reframe
  'coaching.reframe.firstUse': '첫 분석입니다. 과제를 입력하면 숨은 가정을 찾아드립니다.',
  'coaching.reframe.firstUseDetail': '만약 문제를 입력하기 전에 "이 질문에서 내가 당연하게 여기는 것은 무엇인가?"를 먼저 떠올려보면, 더 날카로운 가정을 발견할 수 있습니다.',
  'coaching.reframe.demoAllAccepted': '데모에서 전제를 모두 수락하셨습니다.',
  'coaching.reframe.demoAllAcceptedDetail': '이번에는 "정말 그런가?"라고 전제 하나를 의심해보세요. 전제를 의심하면 질문 자체가 달라집니다.',
  'coaching.reframe.demoAllDoubted': '데모에서 전제 {total}개를 모두 의심하셨습니다 — 비판적 관점이 강합니다.',
  'coaching.reframe.demoAllDoubtedDetail': '이번에도 그 날카로움을 적용해보세요. 어떤 전제가 가장 위험한지 표시하면 실행 설계에 반영됩니다.',
  'coaching.reframe.demoPartialDoubted': '데모에서 전제 {total}개 중 {doubted}개를 의심하셨습니다.',
  'coaching.reframe.demoPartialDoubtedDetail': '이번에도 같은 기준을 적용해보세요. 의심스러운 가정을 "의심됨"으로 마킹하면 이후 단계에서 검증됩니다.',
  'coaching.reframe.assumptionGrowth': '가정 발견 수가 증가하고 있습니다 (평균 {old}건 → {new}건).',
  'coaching.reframe.assumptionGrowthDetail': '문제를 더 깊이 파고드는 습관이 형성되고 있습니다.',
  'coaching.reframe.strategyRepetition': '\'{strategy}\' 접근을 자주 사용하고 있습니다. 다른 관점도 시도해보세요.',
  'coaching.reframe.assumptionEngage': '가정 평가를 더 적극적으로 해보세요.',
  'coaching.reframe.assumptionEngageDetail': '가정에 "확인됨" 마킹을 하면 분석 품질이 올라갑니다.',
  'coaching.reframe.highPassRate': '분석 활용률 {pct}% — 분석 결과를 실제로 활용하고 있습니다.',

  // Coaching — Recast
  'coaching.recast.firstUse': '실행 설계 단계입니다.',
  'coaching.recast.firstUseDetail': '만약 각 단계에서 "이게 실패하면 누가 알아차리는가?"를 적어두면, 체크포인트 배치가 더 정확해집니다.',
  'coaching.recast.demoAiHeavy': '데모에서 대부분을 AI에 위임하셨습니다.',
  'coaching.recast.demoAiHeavyDetail': '이번에는 핵심 판단 단계에 "사람" 또는 "협업"을 배치해보세요. 체크포인트가 실패를 조기에 잡아줍니다.',
  'coaching.recast.demoHumanHeavy': '데모에서 대부분을 사람이 직접 하도록 배치하셨습니다.',
  'coaching.recast.demoHumanHeavyDetail': '반복적인 단계는 AI에 위임하고, 판단이 필요한 곳에 집중하면 효율이 올라갑니다.',
  'coaching.recast.demoBalanced': '데모에서 AI와 사람의 역할을 균형 있게 배분하셨습니다.',
  'coaching.recast.demoBalancedDetail': '이번에도 "이 단계는 누가 해야 가장 효과적인가?"를 기준으로 배치해보세요.',
  'coaching.recast.overrideHigh': 'AI 제안을 자주 수정하고 있습니다 ({pct}%). 이 패턴이 반영됩니다.',
  'coaching.recast.prefersHuman': '사람이 직접 하는 것을 선호하는 패턴입니다.',
  'coaching.recast.prefersAi': 'AI에 많이 위임하는 편입니다. 체크포인트를 충분히 두세요.',
  'coaching.recast.uncertainAssumptions': '악보 해석에서 불확실한 가정 {count}건 — 실행 설계에 검증 단계를 포함하세요.',

  // Coaching — Rehearse
  'coaching.rehearse.firstUse': '페르소나가 당신의 계획을 검증합니다.',
  'coaching.rehearse.firstUseDetail': '만약 리허설 전에 "가장 불편한 질문이 뭘까?"를 먼저 떠올려보면, 페르소나의 피드백을 더 깊이 받아들일 수 있습니다.',
  'coaching.rehearse.accuracyImproving': '페르소나 정확도가 향상되고 있습니다 ({from} → {to}).',
  'coaching.rehearse.accuracyImprovingDetail': '페르소나의 피드백을 반영한 결과, 시뮬레이션 품질이 올라가고 있습니다.',
  'coaching.rehearse.keyAssumptions': '편곡에서 중요도 높은 가정 {count}건 — 페르소나에게 검증 요청하세요.',
  'coaching.rehearse.personaAccuracy': '페르소나 정확도 {score}/5 ({count}회 평가)',

  // Coaching — Refine
  'coaching.refine.firstUse': '피드백을 반영하며 수렴하는 단계입니다.',
  'coaching.refine.firstUseDetail': '만약 수정할 때 "이 변경이 다른 단계에 어떤 영향을 주는가?"를 함께 생각하면, 1회 반복으로 수렴할 가능성이 높아집니다.',
  'coaching.refine.dqImproving': '판단 품질이 개선되고 있습니다 ({prev} → {current}).',
  'coaching.refine.dqDeclining': '판단 품질이 하락했습니다 ({prev} → {current}). 이번엔 가정 검토를 더 꼼꼼히 해보세요.',
  'coaching.refine.biggestGain': '가장 큰 개선: {element}',
  'coaching.refine.biggestDrop': '하락 원인: {element}',
  'coaching.refine.iterationStatus': '현재 {count}회 반복. 위협이 줄어들고 있다면 수렴에 가까워지고 있습니다.',

  // Learning Curve
  'learning.trendImproving': '향상',
  'learning.trendStable': '안정',
  'learning.trendDeclining': '하락',
  'learning.trendNoData': '데이터 수집 중',
  'learning.dqTrend': '판단 품질 추이',
  'learning.exploredAxes': '탐색된 관점',
  'learning.axisGap': '{axis} 관점이 아직 탐색되지 않았습니다',
  'learning.tierLabel': 'Tier {tier}',

  // Settings
  'settings.language': '언어',
  'settings.apiKey': 'API 키',
  'settings.mode': 'LLM 모드',
} as const;

export type TranslationKey = keyof typeof ko;
