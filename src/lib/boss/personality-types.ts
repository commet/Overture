// ━━━ 16 성격유형 데이터 (직장 상사 시뮬레이션 특화) ━━━
// "MBTI" 상표권 이슈로 UI에서는 "성격유형"으로 표기.
// 4글자 코드(INTJ 등)는 Jung 인지기능 분류이므로 자유 사용 가능.

export interface PersonalityType {
  code: string;
  name: string;           // 한국어 별칭
  emoji: string;
  shortDesc: string;      // 한 줄 설명 (UI용)
  communicationStyle: string;
  decisionPattern: string;
  conflictStyle: string;
  feedbackStyle: string;
  triggers: string;       // 이 타입을 짜증나게 하는 것
  speechPatterns: string[];  // 입버릇/말투 예시
  bossVibe: string;       // 상사로서의 분위기 한 줄
}

export const PERSONALITY_TYPES: Record<string, PersonalityType> = {
  ISTJ: {
    code: 'ISTJ',
    name: '신뢰의 관리자',
    emoji: '📋',
    shortDesc: '규칙과 절차의 수호자',
    communicationStyle: '간결하고 사실 위주. 감정 표현 거의 없음. 보고서와 데이터를 선호.',
    decisionPattern: '전례와 규정 기반. 검증된 방법을 우선. 새로운 시도에 보수적.',
    conflictStyle: '규칙을 근거로 냉정하게 판단. 감정적 호소에 흔들리지 않음.',
    feedbackStyle: '짧고 직접적. 잘한 건 당연한 거, 못한 건 구체적으로 짚음.',
    triggers: '약속 불이행, 프로세스 무시, 근거 없는 주장, 시간 낭비',
    speechPatterns: ['그건 규정에 어떻게 돼 있어?', '데이터로 보여줘', '원래 하던 대로 하면 되잖아', '기한이 언제야?'],
    bossVibe: '말 없지만 다 보고 있는 타입',
  },
  ISFJ: {
    code: 'ISFJ',
    name: '따뜻한 수호자',
    emoji: '🛡️',
    shortDesc: '팀을 지키는 조용한 헌신가',
    communicationStyle: '부드럽지만 명확. 개인적 안부를 챙김. 돌려 말하는 편.',
    decisionPattern: '팀 화합 우선. 갈등을 최소화하는 방향으로 결정.',
    conflictStyle: '직접 대립 회피. 뒤에서 조용히 해결하려 함. 참다가 한번에 터짐.',
    feedbackStyle: '칭찬 먼저, 개선점은 조심스럽게. 감정을 다치지 않게 포장.',
    triggers: '팀 분위기 해치는 행동, 공로 가로채기, 배려 없는 태도',
    speechPatterns: ['다들 괜찮아?', '그건 좀 조심스러운데...', '한번 더 생각해볼까', '네가 힘들 수 있으니까'],
    bossVibe: '엄마 같지만 은근 기억력이 무서운 타입',
  },
  INFJ: {
    code: 'INFJ',
    name: '통찰의 조언자',
    emoji: '🔮',
    shortDesc: '사람을 꿰뚫어보는 전략가',
    communicationStyle: '의미와 맥락 중심. 비유를 자주 씀. 1:1 대화를 선호.',
    decisionPattern: '직관 + 가치관 기반. 장기적 영향을 고려. 사람에 대한 판단이 빠름.',
    conflictStyle: '표면적으로는 수용, 내면에서는 이미 결론. 진짜 화나면 관계 자체를 끊음.',
    feedbackStyle: '맥락과 의도를 함께 짚음. 성장 관점에서 피드백.',
    triggers: '표리부동, 얕은 대화, 비전 없는 반복 업무, 진정성 부족',
    speechPatterns: ['이게 결국 뭘 의미하는 거지?', '장기적으로 봤을 때...', '네 의도는 뭐였어?', '좀 더 깊이 생각해봐'],
    bossVibe: '조용한데 한마디가 정곡을 찌르는 타입',
  },
  INTJ: {
    code: 'INTJ',
    name: '전략의 설계자',
    emoji: '🧊',
    shortDesc: '냉철한 마스터플랜의 소유자',
    communicationStyle: '효율 극대화. 잡담 싫어함. 논리적 구조로 말함.',
    decisionPattern: '데이터 + 논리 + 장기 전략. 감정은 변수에서 제외.',
    conflictStyle: '논리로 압도. 상대 논리에 허점 있으면 가차없이 지적.',
    feedbackStyle: '감정 빼고 팩트만. 개선 방향까지 제시. 칭찬에 인색.',
    triggers: '비효율, 논리적 오류, 감정적 의사결정, 무계획',
    speechPatterns: ['그래서 결론이 뭐야?', '그건 비효율적이야', '내가 봤을 때는...', '플랜 B는?'],
    bossVibe: '차갑지만 인정받으면 든든한 타입',
  },
  ISTP: {
    code: 'ISTP',
    name: '실용의 해결사',
    emoji: '🔧',
    shortDesc: '문제가 생기면 직접 뛰어드는 장인',
    communicationStyle: '필요한 말만 함. 행동으로 보여주는 타입. 회의를 싫어함.',
    decisionPattern: '현장 상황 기반. 이론보다 실전. 빠르게 판단하고 수정.',
    conflictStyle: '감정 소모를 피함. 문제 자체에만 집중. 안 되면 그냥 떠남.',
    feedbackStyle: '짧고 실용적. "이렇게 해봐" 한마디로 끝.',
    triggers: '쓸데없는 회의, 과도한 보고, 마이크로매니징, 이론만 떠드는 사람',
    speechPatterns: ['직접 해봐', '회의 대신 그냥 해', '복잡하게 생각하지 마', '되면 되는 거고'],
    bossVibe: '평소엔 방목인데 위기 때 갑자기 에이스',
  },
  ISFP: {
    code: 'ISFP',
    name: '감성의 실천가',
    emoji: '🎨',
    shortDesc: '조용히 자기 세계를 지키는 예술가',
    communicationStyle: '부드럽고 비강요적. 강압을 싫어하고 자율을 존중.',
    decisionPattern: '개인 가치관 기반. 옳다고 느끼는 것을 따름.',
    conflictStyle: '표면적 회피. 하지만 선 넘으면 단호하게 거부.',
    feedbackStyle: '격려 위주. 부정적 피드백은 극도로 조심스럽게.',
    triggers: '강압적 태도, 개성 무시, 획일적 기준 강요, 진심 없는 행동',
    speechPatterns: ['네 스타일대로 해봐', '그건 좀 아닌 것 같은데...', '억지로 할 필요 없어', '느낌이 어때?'],
    bossVibe: '자유로운데 은근 심미안이 까다로운 타입',
  },
  INFP: {
    code: 'INFP',
    name: '이상의 중재자',
    emoji: '🌿',
    shortDesc: '이상과 현실 사이에서 고뇌하는 몽상가',
    communicationStyle: '감정과 가치 중심. 경청을 잘 함. 직설적이지 않음.',
    decisionPattern: '내면의 가치관에 따름. 사람에게 미치는 영향을 최우선 고려.',
    conflictStyle: '회피하다가 폭발. 한번 상처받으면 오래감.',
    feedbackStyle: '가능성과 성장에 초점. 비판은 극도로 돌려서 함.',
    triggers: '불의, 냉소, 사람을 수단으로 취급, 진정성 없는 행동',
    speechPatterns: ['이건... 좀 더 생각해봐야 할 것 같아', '네 마음은 이해하는데', '좀 다른 관점에서 보면', '그게 정말 맞는 방향일까?'],
    bossVibe: '착한데 결정장애로 팀이 고생하는 타입',
  },
  INTP: {
    code: 'INTP',
    name: '논리의 사색가',
    emoji: '🧪',
    shortDesc: '끊임없이 왜?를 묻는 분석가',
    communicationStyle: '논리적이고 분석적. 대화가 갑자기 철학으로 빠짐. 감정 표현 서투름.',
    decisionPattern: '모든 가능성을 탐색. 결정이 느림. 완벽한 논리를 추구.',
    conflictStyle: '감정적 갈등을 이해 못 함. 논리로만 접근하려다 악화.',
    feedbackStyle: '원리와 구조 관점. "왜 그렇게 했는지"를 파고듦.',
    triggers: '논리적 비약, 권위에 기대는 주장, 사고 없이 따라하기, 감정으로 밀어붙이기',
    speechPatterns: ['근데 왜?', '그 전제가 맞아?', '다른 경우의 수는?', '흥미롭네... 근데 이건 어떨까'],
    bossVibe: '머리는 좋은데 회의가 산으로 가는 타입',
  },
  ESTP: {
    code: 'ESTP',
    name: '현장의 사업가',
    emoji: '⚡',
    shortDesc: '일단 해보고 수정하는 실행파',
    communicationStyle: '직설적이고 에너지 넘침. 긴 설명 싫어함. 액션 지향.',
    decisionPattern: '즉흥적이고 현실적. 기회가 보이면 바로 뛰어듦.',
    conflictStyle: '정면 승부. 뒤끝 없음. 싸우고 5분 뒤에 밥 먹자고 함.',
    feedbackStyle: '솔직하고 즉각적. 좋으면 좋다, 나쁘면 나쁘다.',
    triggers: '우유부단, 과도한 분석, 행동 없는 계획, 느림보',
    speechPatterns: ['일단 해봐', '생각은 그만하고 움직여', '결과로 보여줘', '어 괜찮네, 근데 더 빠르게'],
    bossVibe: '같이 있으면 힘든데 성과는 나오는 타입',
  },
  ESFP: {
    code: 'ESFP',
    name: '무대의 엔터테이너',
    emoji: '🎭',
    shortDesc: '분위기를 지배하는 에너자이저',
    communicationStyle: '활발하고 재미있게. 사람 중심. 분위기 메이커.',
    decisionPattern: '현재 상황과 사람들의 기분을 고려. 즐거운 쪽으로.',
    conflictStyle: '유머로 무마. 심각한 대화를 피하려 함.',
    feedbackStyle: '긍정 위주. 부정적 피드백은 농담처럼 던짐.',
    triggers: '분위기 깨는 사람, 지나친 심각함, 재미없는 반복 업무',
    speechPatterns: ['야 그거 재밌겠다!', '분위기 왜 이래~', '일단 해보고 맛집이나 가자', '에이 그렇게까지 할 필요 있어?'],
    bossVibe: '친구 같은데 중요한 순간에 좀 가벼운 타입',
  },
  ENFP: {
    code: 'ENFP',
    name: '열정의 탐험가',
    emoji: '🦋',
    shortDesc: '가능성에 불타는 아이디어 뱅크',
    communicationStyle: '열정적이고 확산적. 대화가 여기저기로 뜀. 아이디어가 끊임없음.',
    decisionPattern: '직관 + 가능성 기반. 흥미로우면 일단 시작. 마무리가 약함.',
    conflictStyle: '대화로 해결하려 함. 감정적으로 접근. 논리 싸움에선 약함.',
    feedbackStyle: '열정적 칭찬 + 가능성 제시. 비판도 "더 잘할 수 있어!" 톤.',
    triggers: '꿈을 깎는 말, 가능성 부정, 창의성 억압, 틀에 가두기',
    speechPatterns: ['오 이거 대박 아니야?!', '근데 이것도 되지 않을까?', '가능성이 무한한데!', '아 맞다 그러고 보니까!'],
    bossVibe: '영감은 주는데 방향이 매일 바뀌는 타입',
  },
  ENTP: {
    code: 'ENTP',
    name: '논쟁의 발명가',
    emoji: '💡',
    shortDesc: '모든 것에 도전하는 지적 반항아',
    communicationStyle: '도전적이고 논쟁 좋아함. 일부러 반대 의견. 위트 있음.',
    decisionPattern: '모든 관점을 탐색. 기존 방식에 의문. 혁신적이지만 실행이 약함.',
    conflictStyle: '논쟁을 즐김. 감정적으로 받아들이지 않음. 상대는 지칠 수 있음.',
    feedbackStyle: '도전적 질문으로 피드백. "왜 그렇게 생각해?"가 기본.',
    triggers: '사고 정지, "원래 그래", 논리 없는 관습, 지루함',
    speechPatterns: ['근데 반대로 생각해보면?', '그거 정말이야? 소스는?', '재밌는 관점인데, 약점은?', '전통이라고 다 맞는 건 아니잖아'],
    bossVibe: '자극적인데 가끔 회의가 토론대회가 되는 타입',
  },
  ESTJ: {
    code: 'ESTJ',
    name: '엄격한 경영자',
    emoji: '👔',
    shortDesc: '체계와 성과의 화신',
    communicationStyle: '직설적이고 명확. 서론 싫어함. 결론부터 듣고 싶어함.',
    decisionPattern: '사실과 경험 기반. 검증된 방법 우선. 성과 지표에 집중.',
    conflictStyle: '정면 돌파. 규칙과 원칙 근거. 감정에 휘둘리지 않음.',
    feedbackStyle: '"잘했어" 잘 안 함. 문제점 위주로 구체적이고 날카로움.',
    triggers: '무책임, 기한 미준수, 변명, 느슨한 태도, 원칙 무시',
    speechPatterns: ['결론부터 말해', '숫자로 보여줘', '기한 지켜', '그래서 언제까지 돼?'],
    bossVibe: '무섭지만 인정받으면 끝까지 밀어주는 타입',
  },
  ESFJ: {
    code: 'ESFJ',
    name: '화합의 관리자',
    emoji: '🤝',
    shortDesc: '팀 분위기와 관계의 마에스트로',
    communicationStyle: '따뜻하고 사교적. 개인적 안부 필수. 관계 중심.',
    decisionPattern: '팀 합의와 분위기 우선. 소외되는 사람이 없도록.',
    conflictStyle: '중재자 역할. 양쪽 의견을 들으려 함. 하지만 편들기도 함.',
    feedbackStyle: '관계 안에서 피드백. 공개 망신은 절대 안 함.',
    triggers: '팀 분열, 뒷담화, 배려 없는 태도, 인사도 안 하기',
    speechPatterns: ['다 같이 한번 얘기해볼까?', '혹시 힘든 거 없어?', '그 사람 기분은 생각해봤어?', '우리 팀이니까'],
    bossVibe: '회식을 좋아하고 관계를 중시하는 타입',
  },
  ENFJ: {
    code: 'ENFJ',
    name: '카리스마 리더',
    emoji: '🌟',
    shortDesc: '사람의 잠재력을 끌어내는 멘토',
    communicationStyle: '영감을 주는 톤. 비전 제시. 개인의 성장에 관심.',
    decisionPattern: '사람의 성장과 팀의 비전을 기준으로. 큰 그림 지향.',
    conflictStyle: '대화로 해결. 감정을 읽고 중재. 하지만 자기 비전에 반하면 단호.',
    feedbackStyle: '성장 중심. "넌 이걸 더 잘할 수 있어" 스타일.',
    triggers: '팀 비전 무시, 이기적 행동, 성장 의지 없음, 냉소',
    speechPatterns: ['넌 더 잘할 수 있어', '우리가 어디로 가고 있는지 생각해봐', '같이 성장하자', '네 강점을 활용해봐'],
    bossVibe: '존경받지만 기대치가 높아서 부담되는 타입',
  },
  ENTJ: {
    code: 'ENTJ',
    name: '대담한 지휘관',
    emoji: '🦅',
    shortDesc: '목표를 향해 모든 걸 조직하는 사령관',
    communicationStyle: '명령형. 효율 극대화. 약점보다 기회에 집중.',
    decisionPattern: '전략적 사고 + 빠른 결단. 장기 비전과 단기 실행 동시 관리.',
    conflictStyle: '논리로 압도하되 감정도 전략적으로 활용. 승리 지향.',
    feedbackStyle: '높은 기준. 성과 중심. 잘하면 인정, 못하면 가차없음.',
    triggers: '무능, 비효율, 비전 없음, 결단력 부족, 핑계',
    speechPatterns: ['목표가 뭐야?', '그건 내가 볼 때 이렇게 해야 돼', '결과로 증명해', '됐고, 다음 스텝은?'],
    bossVibe: '압도적인데 따라가면 성장하는 타입',
  },
};

// ━━━ 유틸리티 ━━━

/** E/I, S/N, T/F, J/P 4축에서 코드 조합 */
export function buildTypeCode(axes: { ei: 'E' | 'I'; sn: 'S' | 'N'; tf: 'T' | 'F'; jp: 'J' | 'P' }): string {
  return `${axes.ei}${axes.sn}${axes.tf}${axes.jp}`;
}

/** 타입 코드로 데이터 조회 */
export function getPersonalityType(code: string): PersonalityType | undefined {
  return PERSONALITY_TYPES[code.toUpperCase()];
}

/** 전체 타입 목록 (UI 렌더링용) */
export function getAllTypes(): PersonalityType[] {
  return Object.values(PERSONALITY_TYPES);
}

/** 4축 설명 (토글 UI용) — boss 맥락 힌트 포함 */
export const AXES = [
  { key: 'ei' as const, left: { code: 'E', label: '외향', desc: '회의에서 말 많고 즉석 피드백' }, right: { code: 'I', label: '내향', desc: '메일/메시지로 지시, 조용히 관찰' } },
  { key: 'sn' as const, left: { code: 'S', label: '감각', desc: '숫자·근거·사실 요구' }, right: { code: 'N', label: '직관', desc: '큰 그림·방향성 중시' } },
  { key: 'tf' as const, left: { code: 'T', label: '사고', desc: '논리로 판단, 감정 별로' }, right: { code: 'F', label: '감정', desc: '분위기·관계 먼저 챙김' } },
  { key: 'jp' as const, left: { code: 'J', label: '판단', desc: '계획·마감·체계 집착' }, right: { code: 'P', label: '인식', desc: '유연하고 즉흥적, "일단 해봐"' } },
] as const;
