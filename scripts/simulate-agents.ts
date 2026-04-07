/**
 * Agent System Simulation — 실제 입력으로 라우팅/리드선정 트레이싱
 *
 * Usage: npx tsx scripts/simulate-agents.ts
 */

// ─── Inline Domain Keywords (from orchestrator-classify.ts) ───

type Domain = 'research' | 'strategy' | 'numbers' | 'finance' | 'marketing' | 'hr' | 'legal' | 'ux' | 'tech' | 'copy' | 'pm' | 'risk';
type Stakes = 'routine' | 'important' | 'critical';

const DOMAIN_KEYWORDS: Record<Domain, string[]> = {
  research: ['조사', '리서치', '자료', '사례', '시장 조사', '시장 현황', '트렌드', '벤치마크', '분석', '데이터', '현황', 'research', 'benchmark', 'market research'],
  strategy: ['전략', '방향', '비전', '포지셔닝', '경쟁', '차별화', '로드맵', '진입', 'strategy', 'positioning'],
  numbers: ['숫자', '수치', '비용', '매출', '수익', 'ROI', 'BEP', '단가', '투자', 'TAM', 'revenue', 'unit economics', 'estimate'],
  legal: ['법률', '법적', '규제', '계약', '특허', '라이선스', '컴플라이언스', '약관', '인허가', 'legal', 'compliance', 'regulation'],
  ux: ['UX', 'UI', '사용자', '경험', '인터페이스', '프로토타입', '사용성', '접근성', 'user experience', 'usability'],
  tech: ['기술', '아키텍처', '구현', '인프라', '스택', 'API', '성능', '확장', 'architecture', 'implementation'],
  copy: ['문서', '기획안', '보고서', '카피', '메시지', '슬라이드', '발표', '제안서', '메모', 'document', 'proposal', 'memo'],
  pm: ['일정', '타임라인', '마일스톤', '리소스', '우선순위', '스프린트', '로드맵', 'timeline', 'milestone', 'priority'],
  risk: ['리스크', '위험', '실패', '장애', '취약', '대응', 'risk', 'failure', 'vulnerability'],
  finance: ['재무', '재무제표', '손익', '현금흐름', '회계', '밸류에이션', 'DCF', 'K-IFRS', '세금', '세무', 'financial', 'financial statement', 'cash flow', 'valuation', 'accounting', 'P&L'],
  marketing: ['마케팅', '마케팅 예산', '캠페인', '채널', '퍼널', '그로스', '광고', 'SEO', 'SNS', 'GTM', 'marketing', 'campaign', 'growth', 'funnel', 'brand', 'go-to-market'],
  hr: ['채용', '조직설계', '조직 개편', '변화관리', 'HR', '인사', '평가', '보상', '문화', '온보딩', 'hiring', 'org design', 'culture', 'talent', 'organizational change'],
};

// ─── Lead Domain Map (from lead-agent.ts) ───

const LEAD_DOMAIN_MAP: Record<string, { default: string; critical: string }> = {
  strategy:  { default: 'hyunwoo (현우/Nathan)',    critical: 'chief_strategist (승현/Victor)' },
  research:  { default: 'sujin (다은/Sophie)',      critical: 'research_director (도윤/Marcus)' },
  numbers:   { default: 'minjae (규민/Ethan)',      critical: 'minjae (규민/Ethan)' },
  finance:   { default: 'hyeyeon (혜연/Diana)',     critical: 'hyeyeon (혜연/Diana)' },
  marketing: { default: 'minseo (민서/Stella)',     critical: 'minseo (민서/Stella)' },
  hr:        { default: 'sujin_hr (수진/Harper)',   critical: 'sujin_hr (수진/Harper)' },
  legal:     { default: 'taejun (윤석/Arthur)',     critical: 'taejun (윤석/Arthur)' },
  ux:        { default: 'jieun (지은/Maya)',        critical: 'jieun (지은/Maya)' },
  tech:      { default: 'junseo (준서/Leo)',        critical: 'junseo (준서/Leo)' },
  copy:      { default: 'seoyeon (서연/Claire)',    critical: 'seoyeon (서연/Claire)' },
  pm:        { default: 'yerin (예린/Grace)',       critical: 'yerin (예린/Grace)' },
  risk:      { default: 'donghyuk (동혁/Blake)',    critical: 'donghyuk (동혁/Blake)' },
};

// ─── Task Type Patterns (from task-classifier.ts, simplified) ───

type TaskType = 'research' | 'analysis' | 'synthesis' | 'strategy' | 'calculation' | 'writing' | 'critique' | 'design' | 'legal_review' | 'planning';

const TASK_PATTERNS: Record<TaskType, [string | RegExp, number][]> = {
  research: [['조사', 3], ['리서치', 3], ['수집', 2], ['벤치마크', 3], ['사례', 2], ['현황', 2], ['트렌드', 2], [/research/i, 3], [/benchmark/i, 3]],
  analysis: [['분석', 3], ['파악', 2], ['진단', 2], ['평가', 2], ['검토', 1], [/analy/i, 3], [/assess/i, 2]],
  synthesis: [['종합', 3], ['요약', 3], ['정리', 2], ['초안', 2], ['통합', 2], [/synthe/i, 3], [/summar/i, 3], [/draft/i, 2]],
  strategy: [['전략', 3], ['방향', 2], ['포지셔닝', 3], ['차별화', 3], ['사업 계획', 3], [/strateg/i, 3], [/position/i, 3]],
  calculation: [['계산', 3], ['산출', 3], ['추정', 2], ['모델링', 3], [/ROI/i, 3], [/BEP/i, 3], [/TAM/i, 3], [/calculat/i, 3], [/estimat/i, 2]],
  writing: [['작성', 2], ['문서', 2], ['기획안', 2], ['보고서', 1], ['카피', 3], ['제안서', 2], [/write/i, 2], [/document/i, 2], [/proposal/i, 2]],
  critique: [['비판', 3], ['리스크', 3], ['위험', 3], ['검증', 2], ['반론', 3], [/risk/i, 3], [/critic/i, 3]],
  design: [[/UX/i, 3], [/UI/i, 3], ['설계', 2], ['사용성', 3], [/design/i, 2], [/wireframe/i, 3]],
  legal_review: [['법률', 3], ['규제', 3], ['계약', 3], ['특허', 3], ['컴플라이언스', 3], [/legal/i, 3], [/regulat/i, 3]],
  planning: [['일정', 3], ['타임라인', 3], ['마일스톤', 3], ['리소스', 2], ['우선순위', 2], [/timeline/i, 3], [/schedul/i, 3], [/milestone/i, 3]],
};

// ─── Simulation Functions ───

function extractDomains(text: string): { domain: Domain; score: number }[] {
  const lower = text.toLowerCase();
  const scores: { domain: Domain; score: number }[] = [];
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS) as [Domain, string[]][]) {
    const count = keywords.filter(kw => lower.includes(kw.toLowerCase())).length;
    if (count > 0) scores.push({ domain, score: count });
  }
  scores.sort((a, b) => b.score - a.score);
  return scores;
}

function classifyTaskType(text: string): { type: TaskType; score: number }[] {
  const lower = text.toLowerCase();
  const scores: { type: TaskType; score: number }[] = [];
  for (const [type, patterns] of Object.entries(TASK_PATTERNS) as [TaskType, [string | RegExp, number][]][]) {
    let score = 0;
    for (const [pattern, weight] of patterns) {
      if (typeof pattern === 'string' ? lower.includes(pattern.toLowerCase()) : pattern.test(text)) {
        score += weight;
      }
    }
    if (score > 0) scores.push({ type, score });
  }
  scores.sort((a, b) => b.score - a.score);
  return scores;
}

function selectLead(domains: { domain: Domain; score: number }[], stakes: Stakes): string {
  if (stakes === 'routine') return '❌ No lead (routine)';
  if (domains.length === 0) return '❌ No lead (no domain)';
  const primary = domains[0].domain;
  const map = LEAD_DOMAIN_MAP[primary];
  if (!map) return `❌ No mapping for domain: ${primary}`;
  return stakes === 'critical' ? map.critical : map.default;
}

// ─── Simulations ───

interface Scenario {
  input: string;
  stakes: Stakes;
  expectedLead?: string;
  expectedDomain?: string;
}

const scenarios: Scenario[] = [
  // Korean scenarios
  { input: '우리 회사 AI 전략을 수립해야 해', stakes: 'important', expectedDomain: 'strategy', expectedLead: 'hyunwoo' },
  { input: '재무제표 분석해서 투자 보고서 만들어줘', stakes: 'important', expectedDomain: 'finance', expectedLead: 'hyeyeon' },
  { input: '마케팅 예산을 짜줘', stakes: 'important', expectedDomain: 'marketing', expectedLead: 'minseo' },
  { input: '채용 계획 세워줘. 시리즈 A 받고 팀 키워야 해', stakes: 'important', expectedDomain: 'hr', expectedLead: 'sujin_hr' },
  { input: 'ROI 계산해줘. 이 프로젝트 수익성이 있는지 알아봐', stakes: 'important', expectedDomain: 'numbers', expectedLead: 'minjae' },
  { input: '법적으로 이 사업 해도 되는지 검토해줘', stakes: 'critical', expectedDomain: 'legal', expectedLead: 'taejun' },
  { input: '간단한 메모 써줘', stakes: 'routine', expectedDomain: 'copy' },
  { input: 'GTM 전략 짜줘. 미국 시장 진출', stakes: 'critical', expectedDomain: 'marketing', expectedLead: 'minseo' },
  { input: '기술 아키텍처 리뷰해줘. 마이크로서비스로 갈지 모놀리스로 갈지', stakes: 'important', expectedDomain: 'tech', expectedLead: 'junseo' },
  { input: '조직 개편 해야 해. 변화관리 전략도 같이', stakes: 'critical', expectedDomain: 'hr', expectedLead: 'sujin_hr' },

  // English scenarios
  { input: 'I need to build an AI strategy for my startup', stakes: 'important', expectedDomain: 'strategy', expectedLead: 'hyunwoo' },
  { input: 'Create a marketing campaign plan for Q3 launch', stakes: 'important', expectedDomain: 'marketing', expectedLead: 'minseo' },
  { input: 'Analyze our financial statements and cash flow', stakes: 'important', expectedDomain: 'finance', expectedLead: 'hyeyeon' },
  { input: 'We need a hiring plan for 10 engineers', stakes: 'important', expectedDomain: 'hr', expectedLead: 'sujin_hr' },
  { input: 'Is this business legally compliant with regulations?', stakes: 'critical', expectedDomain: 'legal', expectedLead: 'taejun' },
  { input: 'Estimate the ROI and unit economics for this product', stakes: 'important', expectedDomain: 'numbers', expectedLead: 'minjae' },
];

// ─── Run ───

console.log('═══════════════════════════════════════════════════');
console.log('  OVERTURE AGENT SYSTEM SIMULATION');
console.log('═══════════════════════════════════════════════════\n');

let pass = 0, fail = 0;

for (const s of scenarios) {
  const domains = extractDomains(s.input);
  const tasks = classifyTaskType(s.input);
  const lead = selectLead(domains, s.stakes);

  const domainResult = domains[0]?.domain || 'none';
  const domainOk = !s.expectedDomain || domainResult === s.expectedDomain;
  const leadOk = !s.expectedLead || lead.includes(s.expectedLead);
  const ok = domainOk && (s.stakes === 'routine' ? lead.includes('No lead') : leadOk);

  if (ok) pass++; else fail++;

  console.log(`${ok ? '✅' : '❌'} "${s.input}"`);
  console.log(`   Stakes: ${s.stakes}`);
  console.log(`   Domains: ${domains.slice(0, 3).map(d => `${d.domain}(${d.score})`).join(', ') || 'none'}`);
  if (!domainOk) console.log(`   ⚠ Expected domain: ${s.expectedDomain}, got: ${domainResult}`);
  console.log(`   TaskType: ${tasks.slice(0, 2).map(t => `${t.type}(${t.score})`).join(', ') || 'none'}`);
  console.log(`   Lead: ${lead}`);
  if (!leadOk && s.expectedLead) console.log(`   ⚠ Expected lead: ${s.expectedLead}`);
  console.log('');
}

console.log('═══════════════════════════════════════════════════');
console.log(`  RESULT: ${pass}/${pass + fail} passed (${fail} failed)`);
console.log('═══════════════════════════════════════════════════');
