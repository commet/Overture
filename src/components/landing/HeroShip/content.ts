/**
 * HeroShip 콘텐츠 데이터 — 3-sector 구조
 * Bow (선두) / Midship (선중앙) / Stern (선미)
 */

export type CrewDivision = {
  id: 'scouts' | 'cartographers' | 'artisans' | 'watch' | 'concertmaster';
  label: { ko: string; en: string };
  role: { ko: string; en: string };
  stationLabel: { ko: string; en: string };
  members: { name: string; personaRole: { ko: string; en: string } }[];
};

export const CREW_DIVISIONS: CrewDivision[] = [
  {
    id: 'scouts',
    label: { ko: '탐색조', en: 'Scouts' },
    role: { ko: '먼저 바다로 나가 낯선 해역의 정보를 가져온다', en: 'They sail ahead and read the unknown waters' },
    stationLabel: { ko: '선수 난간', en: 'Forward railing' },
    members: [
      { name: '하윤', personaRole: { ko: '리서치 인턴', en: 'Research intern' } },
      { name: '다은', personaRole: { ko: '리서치 애널리스트', en: 'Research analyst' } },
      { name: '도윤', personaRole: { ko: '리서치 디렉터', en: 'Research director' } },
    ],
  },
  {
    id: 'cartographers',
    label: { ko: '제도사', en: 'Cartographers' },
    role: { ko: '해도를 그리고 어디로 갈지를 정한다', en: 'They chart the course and set the heading' },
    stationLabel: { ko: '메인 마스트 아래 해도 테이블', en: 'Chart table, under the mainmast' },
    members: [
      { name: '정민', personaRole: { ko: '전략 주니어', en: 'Strategy junior' } },
      { name: '현우', personaRole: { ko: '전략 구루', en: 'Strategy lead' } },
      { name: '승현', personaRole: { ko: '수석 전략가', en: 'Chief strategist' } },
    ],
  },
  {
    id: 'artisans',
    label: { ko: '장인들', en: 'Artisans' },
    role: { ko: '각자의 손기술로 항해의 실물을 만든다', en: 'They build the voyage with their own hands' },
    stationLabel: { ko: '메인 갑판', en: 'Main deck' },
    members: [
      { name: '서연', personaRole: { ko: '카피라이터', en: 'Copywriter' } },
      { name: '규민', personaRole: { ko: '숫자 분석가', en: 'Numbers' } },
      { name: '혜연', personaRole: { ko: '재무 전문가', en: 'Finance' } },
      { name: '민서', personaRole: { ko: '마케팅 전략가', en: 'Marketing' } },
      { name: '수진', personaRole: { ko: '조직·문화 전문가', en: 'People & culture' } },
      { name: '준서', personaRole: { ko: '기술 설계자', en: 'Engineering' } },
      { name: '예린', personaRole: { ko: '프로젝트 매니저', en: 'PM' } },
    ],
  },
  {
    id: 'watch',
    label: { ko: '망루', en: 'The Watch' },
    role: { ko: '수평선 너머의 위험을 먼저 본다', en: 'They spot danger before anyone else' },
    stationLabel: { ko: '까마귀 둥지 (crow\'s nest)', en: "Crow's nest" },
    members: [
      { name: '동혁', personaRole: { ko: '리스크 검토자', en: 'Risk reviewer' } },
      { name: '지은', personaRole: { ko: 'UX 설계자', en: 'UX designer' } },
      { name: '윤석', personaRole: { ko: '법률·규정 검토자', en: 'Legal & compliance' } },
    ],
  },
  {
    id: 'concertmaster',
    label: { ko: '악장', en: 'Concertmaster' },
    role: { ko: '모든 선원의 목소리를 하나로 묶어 선장에게 전한다', en: "The captain's first mate — binds every voice into one" },
    stationLabel: { ko: '조타륜', en: 'At the helm' },
    members: [
      { name: '악장', personaRole: { ko: '종합 검토자', en: 'Maestro' } },
    ],
  },
];

export type Stage = {
  id: 'brief' | 'draft' | 'review' | 'refinement' | 'synthesis';
  label: { ko: string; en: string };
  subtitle: { ko: string; en: string };
};

export const STAGES: Stage[] = [
  {
    id: 'brief',
    label: { ko: 'Brief', en: 'Brief' },
    subtitle: { ko: '선장이 받은 지시', en: "The captain's orders" },
  },
  {
    id: 'draft',
    label: { ko: 'Draft', en: 'Draft' },
    subtitle: { ko: '첫 해도가 그려진다', en: 'The first chart is drawn' },
  },
  {
    id: 'review',
    label: { ko: 'Review', en: 'Review' },
    subtitle: { ko: '선원 회의', en: 'Crew council' },
  },
  {
    id: 'refinement',
    label: { ko: 'Refinement', en: 'Refinement' },
    subtitle: { ko: '항로를 다시 잡는다', en: 'Course corrected' },
  },
  {
    id: 'synthesis',
    label: { ko: 'Synthesis', en: 'Synthesis' },
    subtitle: { ko: '이타카가 보인다', en: 'Ithaca in sight' },
  },
];
