# Overture — 프로젝트 컨텍스트 v2

> 다른 기기/세션에서 작업을 이어갈 때 사용하는 핸드오프 문서.
> 마지막 업데이트: 2026-03-21

---

## 1. 최근 작업 요약 (이 세션에서 한 것)

### Phase 0-5: 기술 로드맵 구현 (ROADMAP.md 참조)

| Phase | 상태 | 핵심 파일 |
|---|---|---|
| **0** 타입드 맥락 파이프라인 | 완료 | `src/lib/context-chain.ts` |
| **1** 적응형 악보 해석 | 완료 | `src/lib/reframing-strategy.ts`, `src/lib/eval-engine.ts` |
| **2** 다관점 편곡 검증 | 완료 | `src/lib/workflow-review.ts` |
| **3** 학습하는 리허설 | 완료 | `src/lib/context-builder.ts` (강화) |
| **5** 산출물 혁명 | 완료 | `src/lib/prompt-chain.ts`, `src/lib/agent-spec.ts` |
| **4** 자가 개선 | 기반만 | `eval-engine.ts`가 데이터 축적. 자동 mutation 미구현 |
| **6** 네트워크 효과 | 미착수 | 사용자 기반 확보 후 |

### 악보 해석 2-stage 재설계

**이전**: AI가 한 번에 전부 생성 → 사용자가 방향만 선택
**이후**: 2단계 상호작용
1. Stage 1: AI가 전제 도출 → 사용자가 각 전제를 3-way 평가 (맞음/불확실/의심됨)
2. Stage 2: 사용자 평가 기반으로 AI가 리프레이밍 → 방향 선택

- 프롬프트 분리: `ASSUMPTION_PROMPT` (전제만) + `REFRAMING_PROMPT` (사용자 평가 기반)
- 인터뷰 Q4 추가 (stakeholder), Q5 잠금 (history, 3회 이상 후 해금)
- `reviewStage: 'evaluate' | 'reframe'` 로컬 상태로 관리

### 편곡 재설계

- **좌우 레인 레이아웃**: AI step 왼쪽, 사람 step 오른쪽, 협업 전체 너비
- **역할 비중 대시보드**: 통합 비율 바 (상단)
- **역할 토글**: 3-position pill (`[🤖 AI] [🤝 협업] [🧠 사람]`)
- **인라인 입력**: 클릭 불필요, 항상 보이는 input
- **질문→방향 통합 카드**: 악보 해석 → 편곡 연결이 하나의 카드로
  - 재정의된 질문 → "이 질문을 토대로" → 핵심 방향 → SCR 3-column grid
- **다관점 검증**: "워크플로우 검증" 버튼 → Skeptic/Optimizer/Domain 3-lens 병렬

### 리허설 재설계

- **FeedbackRequest**: 편곡 결과 자동 연결 (raw markdown 붙여넣기 제거)
- **PersonaCard**: 이니셜 아바타 + 영향력 뱃지 + 성향 태그
- **페르소나 관리 탭**: 빈 상태 개선, 목록 레이아웃 정리

### 팀 협업 기능

- Supabase 마이그레이션: `teams`, `team_members`, `team_invites`, `team_review_inputs`
- `projects.team_id` 컬럼 추가
- RLS: `is_team_member()`, `can_access_project()` 함수
- `useTeamStore.ts`: 팀 CRUD, 초대, 구조화된 리뷰 입력
- `/teams` 페이지: 팀 생성, 멤버 관리, 이메일 초대
- `TeamReviewPanel`: 전제 평가 + step 피드백 + anti-groupthink (전원 제출 전 비공개)
- OrchestrateStep에 TeamReviewPanel 통합

### 마이크로 루프

- `getBestStrategy()`: uncertainty 단독 매칭 먼저 (3 샘플이면 충분)
- `getSessionInsights()`: 1세션부터 개인화 피드백
- DecomposeStep 입력 화면에 session insights 칩 표시

### 인프라 수정

- 미들웨어: Supabase가 localStorage 사용 → 모든 앱 라우트 public으로 (RLS가 보안 담당)
- personas 테이블: `influence` 컬럼 마이그레이션
- Rate limit: 5회 (BYOK으로 개발)

---

## 2. 현재 상태 & 알려진 이슈

### 배포

- URL: https://overture-zeta.vercel.app
- 최신 커밋: `c3df051`
- Vercel 환경변수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY` 설정됨

### 커밋되지 않은 변경

다른 세션에서 수정된 파일 (린터/사용자):
- `src/lib/agent-spec.ts` — `project: Project | null` 시그니처 변경
- `src/lib/prompt-chain.ts` — `projectFilter` 헬퍼 사용
- `src/lib/project-brief.ts` — `projectFilter` 헬퍼 사용
- `src/lib/checklist.ts` — 동일
- `src/lib/output-helpers.ts` — 새 파일 (projectFilter, projectName)
- `src/lib/decision-rationale.ts` — 새 파일
- `src/components/workspace/WorkflowGraph.tsx` — 대시보드 통합 바 개선
- `src/components/workspace/WorkspaceSidebar.tsx` — 수정

### 알려진 이슈

1. **eval gaming**: `question_accepted` eval이 copy-paste로 우회 가능 — 향후 수정
2. **재분석 횟수 미추적**: 5번 재분석해도 eval에서 감지 안 됨
3. **리뷰 결과 재분석 시 소실**: 워크플로우 재분석하면 reviews 덮어씀
4. **Supabase 스키마 미동기**: 새 필드들 (reframed_question, evaluation 등) DB 마이그레이션 필요
5. **팀 기능 UI**: TeamReviewPanel이 OrchestrateStep에만 통합됨 — DecomposeStep에도 필요할 수 있음

---

## 3. 다음에 해야 할 것 (우선순위)

### 즉시 (배포 전)
1. **커밋되지 않은 파일 정리** — output-helpers.ts 등 커밋
2. **전체 흐름 E2E 테스트** — 악보 해석 → 편곡 → 리허설 → 합주 전 과정 확인
3. **리허설 결과 화면** — FeedbackResult 컴포넌트 디자인 개선 (현재 구시대)
4. **합주 연습 화면** — RefinementLoopStep 디자인 검토/개선

### 단기
5. **랜딩 페이지** — 새 기능(2-stage, 팀 협업)을 반영한 업데이트
6. **온보딩/가이드** — 새 흐름에 맞는 가이드 페이지 업데이트
7. **Supabase 마이그레이션** — 모든 새 필드 DB에 반영
8. **모바일 반응형** — 좌우 레인 레이아웃 모바일 최적화 확인

### 중기
9. **Claude Code Skill** — /overture 커맨드로 터미널에서 사용
10. **MCP Server** — 다른 AI 도구에서 호출 가능
11. **Slack Bot** — 팀 채택 드라이버
12. **Phase 4 완성** — 프롬프트 자동 mutation + changelog

---

## 4. 기술 스택 (변경 없음)

- **Framework**: Next.js + React + TypeScript
- **Styling**: Tailwind CSS 4
- **State**: Zustand (localStorage + Supabase 이중 저장)
- **LLM**: Anthropic Claude Sonnet 4
- **DB**: Supabase (RLS 적용)
- **배포**: Vercel

---

## 5. 핵심 파일 맵 (새로 추가된 것만)

```
src/lib/
├── context-chain.ts        # Phase 0: 타입드 맥락 파이프라인
├── reframing-strategy.ts   # Phase 1: 4가지 리프레이밍 전략 선택
├── eval-engine.ts          # Phase 1: binary eval + session insights
├── workflow-review.ts      # Phase 2: 3-lens 병렬 워크플로우 검증
├── output-helpers.ts       # 산출물 공통 헬퍼 (projectFilter 등)
└── decision-rationale.ts   # 판단 근거서 생성

src/stores/
├── useTeamStore.ts         # 팀 CRUD + 초대 + 리뷰 입력
└── types.ts                # 추가: HiddenAssumption.evaluation,
                            #       DecomposeContext, OrchestrateContext,
                            #       RehearsalContext, PhaseContext,
                            #       ReviewFinding, WorkflowReview,
                            #       Team, TeamMember, TeamInvite,
                            #       TeamReviewInput

src/components/workspace/
├── TeamReviewPanel.tsx     # 팀 구조화된 리뷰 입력 UI
└── MusicalElements.tsx → src/components/ui/  # 오선지, 마디선 등

src/app/
└── teams/page.tsx          # 팀 관리 페이지

ROADMAP.md                  # 6-phase 기술 로드맵
```

---

## 6. 설계 결정 (이 세션에서 내린 것)

1. **악보 해석은 2-stage**: AI 1회 호출(전제) → 사용자 평가 → AI 2회 호출(리프레이밍). 사용자의 판단이 결과에 직접 영향.
2. **전제는 악보 해석에서 읽기 전용 증거**: 토글/확인 → 제거. 편곡에서 검증 단계로 변환.
3. **팀 모델은 DACI**: Driver(편집) + Contributors(구조화된 입력) + Approver(결정). Design by committee 방지.
4. **팀 리뷰는 anti-groupthink**: 전원 제출 전 서로의 답 비공개. Coda Pulse 패턴.
5. **미들웨어는 UX 가드만**: 실제 보안은 Supabase RLS. localStorage 기반 세션이라 서버 미들웨어에서 검증 불가.
6. **기술적 해자 = 축적**: 프롬프트/UI는 복사 가능. 판단 데이터 축적 → 전략 자동 조정이 진짜 해자. 하지만 현재 루프가 완전히 닫히지 않음 (데이터 기록은 되지만 자동 mutation 미구현).
