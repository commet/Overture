# Testing & Skill Audit Log — 2026-03-28

## 개요

Loop 1 (시뮬레이션 테스트) + Loop 2 (스킬 점검/정리) 수행.
기존 309개 테스트 → **290개 신규 추가** → 총 ~599개 테스트.

---

## Loop 1: 시뮬레이션 테스트

concertmaster-simulation.test.ts 패턴을 전체 핵심 lib으로 확장.

### 작성한 테스트 파일

| 파일 | 테스트 수 | 커버 대상 | 발견 사항 |
|------|----------|----------|----------|
| `decision-quality-simulation.test.ts` | 77 | DQ 6요소 계산, 트렌드 분석, DQ-Outcome 상관관계, Confidence Calibration, Eval Criteria Validation, Defensive Data Access | 평탄 이슈 트렌드 `[5,5,5]`를 non-increasing으로 판정 (설계 의도인지 확인 필요), idempotency 캐시가 score refresh 불가 (의도적일 수 있으나 주의) |
| `auto-persona-simulation.test.ts` | 59 | extractPersonasFromContext (LLM mock), recommendBlindSpotPersona (축 분포 아키타입 10종), autoPersonaToFull (AutoPersona/SuggestedReviewer 변환), sanitizeForPrompt | 깨끗 |
| `context-builder-simulation.test.ts` | 50 | buildEnhancedSystemPrompt 7개 섹션 조립, 1200자 상한, buildProjectItemsContext, buildPersonaAccuracyContext (aspect-level + calibration), buildConvergencePatterns, CLAUDE.md "참고:" 가이드라인 준수 | 깨끗 |
| `signal-recorder-simulation.test.ts` | 28 | recordSignal FIFO 500개 상한, getSignals AND 필터, getSignalsByType 최신순 정렬 + limit, malformed data 방어 | 깨끗 |
| `process-summary-simulation.test.ts` | 24 | buildProcessSummary ref-based lookup vs fallback, 축 커버리지, 리스크 분류 카운팅, DQ 요소 min/max, 완성도 카운팅 | 깨끗 |
| `persona-prompt-simulation.test.ts` | 43 | buildPersonaProfileBlock (프로필 블록 구성, decision_style/risk_tolerance 매핑, sanitization), buildFeedbackSystemPrompt (perspective×intensity 전 조합, influence 분기, reReview, feedback_logs, accuracy injection) | 깨끗 |
| `store-schema-sync.test.ts` | 16 | 6개 Zustand 스토어 creator (Persona, Reframe, Recast, Refine, Project, Judgment), DEFAULT_PERSONAS 완성도 (3명, 전 필드), Settings 기본값 | Zustand getState() 스냅샷이 mutation 후 stale — 반드시 재호출 필요 |

### 테스트되지 않은 영역 (다음 세션에서 추가 대상)

**핵심 lib (테스트 0):**
- `llm.ts` — LLM 클라이언트 추상화, 에러 핸들링, 재시도
- `retrospective.ts` — 회고/인사이트 생성
- `learning-health.ts` — 학습 건강 메트릭
- `prompt-chain.ts` — 프롬프트 체이닝
- `workflow-review.ts` — 워크플로우 리뷰
- `slack-blocks.ts` — Slack 블록 포맷팅
- `sanitize.ts` — HTML sanitization (DOM 의존성으로 jsdom 필요)

**Store mutation 테스트:**
- updatePersona, deletePersona, addFeedbackLog 등 mutation 검증
- Store 간 데이터 정합성 (e.g., persona 삭제 시 feedbackRecord 영향)

**API Route 테스트:**
- `/api/llm/route.ts` 전체 request/response cycle
- `/api/slack/*` 라우트들

**UI 컴포넌트 테스트:**
- ReframeStep, RecastStep 등 주요 워크스페이스 컴포넌트

### 리뷰에서 발견된 개선점 (보류)

- **테스트 factory helpers 중복**: `makeReframe()`, `makeRecast()` 등이 4+ 파일에 각각 정의됨. 테스트 30개+ 추가 시 `__tests__/helpers/factories.ts`로 추출 권장.
- **DQ idempotency 캐시**: `computeDecisionQuality`가 같은 projectId로 호출되면 캐시 반환. 프로젝트 진행 후 재계산이 불가한 구조. 캐시 무효화 메커니즘 검토 필요.
- **`as any` 캐스트**: context-builder 테스트에서 mock 반환값에 `as any` 사용. 소스 타입 변경 시 테스트가 못 잡을 수 있음.

---

## Loop 2: 스킬 점검

### 검증 결과 — 오디트 보고서 vs 실제

| 보고서 지적 | 실제 확인 결과 |
|------------|---------------|
| Plugin/CLI /reframe 불일치 | **동일** — 477줄 완전 일치 |
| Plugin/CLI /recast 불일치 | **동일** — diff 0 |
| Plugin/CLI /rehearse 불일치 | **동일** |
| Plugin/CLI /refine 불일치 | **동일** |
| 참조 파일 4개 미존재 | **전부 존재** (reframing-strategies.md, execution-design.md, persona-design.md, risk-classification.md) |
| /build Plugin에만 존재 | 맞음 — untracked 파일, 커밋된 적 없음. `/reframe` context:build로 통합됨 |
| autoplay vs overture 차이 | 맞음 — autoplay=구버전, overture=신버전(superset) |

### 수행한 정리 작업

| 작업 | 이유 |
|------|------|
| `.claude/skills/autoplay/` 삭제 | `overture`가 상위 호환. CLI와 Plugin 모두 `overture`로 통일됨 |
| `overture-plugin/skills/build/` 삭제 | 커밋된 적 없는 아카이브 파일. `/reframe` context:build로 기능 통합됨 |
| `overture-plugin/statusline/index.js`에서 `autoplay` 참조 제거 | Clean Removal 원칙 — 삭제한 스킬의 참조 정리 |
| `execution-design.md` 완성 (CLI + Plugin 동기화) | step 설계 패턴, 병렬 실행, 시간 추정, critical path, AI/Human 스코프 가이드 추가 |

### 현재 스킬 구조 (정리 후)

```
.claude/skills/
├── overture/         ← 풀 파이프라인 오케스트레이터
├── reframe/          ← Phase 1: 문제 재정의
│   └── references/reframing-strategies.md
├── recast/           ← Phase 2: 실행 설계
│   └── references/execution-design.md  ← 이번에 완성
├── rehearse/         ← Phase 3: 스트레스 테스트
│   └── references/persona-design.md
│   └── references/risk-classification.md
├── refine/           ← Phase 4: 수렴 반복
├── help/
├── configure/
├── doctor/
├── setup/
├── patterns/
├── output-skill/
├── redesign-skill/
├── soft-skill/
├── taste-skill/
└── (기타 디자인/UI 유틸리티 스킬)

overture-plugin/skills/
├── overture/         ← CLI overture와 동일
├── reframe/          ← CLI와 동일
├── recast/           ← CLI와 동일 (references/ 포함)
├── rehearse/         ← CLI와 동일 (references/ 포함)
├── refine/           ← CLI와 동일
├── help/
├── configure/
├── doctor/
├── setup/
└── patterns/

overture-plugin/agents/
└── devils-advocate.md  ← 완성됨, /rehearse에서 사용
```

### 4R 파이프라인 context 지원 현황

```
/reframe  → context: build | decide  ← 인터뷰 질문, 가정 축, 전략이 분기
/recast   → context 상속              ← governing_idea vs product thesis
/rehearse → context 상속              ← 페르소나 선택에 반영
/refine   → context 상속              ← 수렴 기준 동일
/overture → context 자동 감지         ← 딜리버블이 분기 (Sharpened Prompt vs Implementation Prompt)
```

---

## 다음 세션 TODO

1. ~~**테스트 확장**~~ ✅ Loop 3에서 완료 (7개 신규 파일, 154개 테스트 추가)
2. ~~**테스트 factory 추출**~~ ✅ `__tests__/helpers/factories.ts` 생성 (13개 factory)
3. **DQ 캐시 무효화** — `computeDecisionQuality` 재계산 메커니즘 설계 검토
4. ~~**기존 깨진 테스트 수정**~~ ✅ 3개 모두 수정 완료
5. **스킬 실행 테스트** — 각 스킬을 실제로 돌려보면서 출력 품질 확인 (Loop 2의 나머지)

---

## Loop 3: 핵심 lib 시뮬레이션 테스트 확장 (2026-03-27)

기존 20개 테스트 파일 546 tests → **27개 파일 700 tests**.

### 깨진 테스트 수정

| 파일 | 원인 | 수정 |
|------|------|------|
| `context-chain.test.ts` | `recast?` — 6곳에 stray `?` (TS 파싱 에러) + `미확인 전제` → `전제` (소스 변경 반영) | 구문 수정 + 기대값 업데이트 |
| `eval-engine.test.ts` | Supabase URL 누락 (import chain) + REFRAME_EVALS 4→5개 변경 미반영 | `vi.mock('@/lib/db')` 추가 + eval 개수/pass_rate/assumptions_engaged 기대값 업데이트 |
| `reframing-strategy.test.ts` | Supabase URL 누락 (reframing-strategy→eval-engine→signal-recorder→db→supabase chain) | `vi.mock('@/lib/db')` + `vi.mock('@/lib/storage')` 추가 |

### 신규 시뮬레이션 테스트

| 파일 | 테스트 수 | 커버 대상 | 비고 |
|------|----------|----------|------|
| `llm-simulation.test.ts` | 27 | parseJSON (fences, size limit, non-object 거부, unicode), validateShape (스키마 검증, 옵셔널 필드, 에러 메시지) | 순수 함수만 테스트, callLLM 등 네트워크 의존 함수 제외 |
| `learning-health-simulation.test.ts` | 19 | signal_count, eval_coverage, override_trend (improving/stable/not_enough_data), convergence_trend, learning_tier (1/2/3), recommendations (6개 분기) | 전 분기 커버 |
| `sanitize-simulation.test.ts` | 53 | escapeHtml (5개 엔티티, mixed, Korean), sanitizeHtml server-side fallback (tag strip, XSS 벡터, script/iframe/SVG), 조합 테스트 | DOM 기반 테스트는 jsdom 필요 (미포함) |
| `retrospective-simulation.test.ts` | 23 | generateRetrospectiveQuestions (5개 신호 분기, 카테고리 중복제거, max 4), saveRetrospectiveAnswer (저장+Supabase+200개 제한), getRetrospectiveAnswers, getActionableInsights | 깨끗 |
| `slack-blocks-simulation.test.ts` | 15 | markdownToSlackBlocks (헤더 150자 truncate, 헤딩→bold, 마크다운 변환, 3000자 chunking, 50블록 상한, footer) | 순수 함수, 모킹 불필요 |
| `workflow-review-simulation.test.ts` | 7 | countBySeverity, getStepWarnings (0-based→1-based 인덱스 매핑) | selectDomainType 미export로 간접 테스트만 |
| `prompt-chain-simulation.test.ts` | 10 | generatePromptChain (null 프로젝트, 헤더, AI/human/checkpoint 스텝, footer, reframe context, feedback constraints, decompose-only fallback) | 깨끗 |

### Factory 추출

`src/lib/__tests__/helpers/factories.ts` 생성 — 13개 factory:
makeReframe, makeRecast, makeStep, makePersona, makeFeedbackRecord, makeLoop, makeJudgment, makeSignal, makeAssumption, makeKeyAssumption, makeProject, makeAnswer, makeRating

기존 테스트는 변경 없이 유지. 신규 테스트에서 import하여 사용.

### 테스트되지 않은 영역 (다음 세션)

**DOM 기반 sanitize:**
- `sanitizeHtml` DOM path — jsdom 환경 필요 (tag whitelist, attribute filtering, URL validation, rel/target 강제)

**Store mutation 테스트:**
- updatePersona, deletePersona, addFeedbackLog 등 mutation 검증
- Store 간 데이터 정합성

**API Route 테스트:**
- `/api/llm/route.ts`, `/api/slack/*`

**LLM 의존 함수:**
- ~~`callLLM`, `callLLMStream`~~ ✅ llm-network-simulation.test.ts로 커버
- `runWorkflowReview` — 3 lens 병렬 실행, 실패 처리 (callLLMJson mock 필요)

---

## Loop 4: LLM 네트워크 + Store Mutation + DQ 캐시 수정 (2026-03-27)

기존 27개 파일 702 tests → **29개 파일 739 tests**.

### DQ 캐시 무효화 버그 수정

**문제:** `computeDecisionQuality`가 projectId만으로 캐시하고 무효화 메커니즘 없음. 파이프라인 진행 후 재호출해도 옛날 점수(예: 45) 반환.

**수정:**
- `DQInput`에 `force?: boolean` 옵션 추가
- `force: true`일 때 캐시 무시하고 재계산, 기존 엔트리 replace (중복 방지)
- `RefineStep.tsx`에서 `force: true`로 호출하여 항상 최신 데이터 반영
- 기존 idempotency 동작은 `force` 미지정 시 보존

**테스트:** 2개 추가 (force 재계산 + 캐시 엔트리 교체 검증)

### 신규 테스트

| 파일 | 테스트 수 | 커버 대상 |
|------|----------|----------|
| `llm-network-simulation.test.ts` | 19 | callLLM (proxy/direct 라우팅, 인증 헤더, LOGIN_REQUIRED), callLLMJson (파싱+shape), callLLMStream (SSE 누적, onComplete, onError, [DONE] 스킵, malformed 방어), fetchWithRetry (429 재시도) |
| `store-mutations-simulation.test.ts` | 18 | PersonaStore (CRUD + feedbackLog), ReframeStore (CRUD + setCurrentId), RecastStore (step CRUD + reorder), ProjectStore (CRUD + addRef dedup + getProject) |

### 다음 세션 TODO

1. ~~**runWorkflowReview 통합 테스트**~~ ✅ Loop 5에서 완료
2. ~~**API Route 테스트**~~ ✅ Loop 5에서 완료 (validation 패턴 49개)
3. ~~**RefineStore 특수 테스트**~~ ✅ Loop 5에서 완료
4. ~~**DOM 기반 sanitize**~~ ✅ Loop 5에서 완료 (jsdom 설치 + 28개)

---

## Loop 5: 마무리 — 통합 테스트 + DOM + API + 보안 수정 (2026-03-27)

기존 29개 파일 739 tests → **33개 파일 838 tests**.

### 보안 버그 수정: `safeCompare` (daily-report cron)

**문제:** `b = a` 재할당 후 `a.length !== b.length`가 항상 false → 길이가 다른 문자열도 `true` 반환.
**수정:** `lengthMismatch` 플래그를 재할당 전에 캡처. 비교 대상을 `compareTarget`으로 분리.
**영향:** cron 엔드포인트의 CRON_SECRET 인증이 길이가 다른 토큰에 대해 bypass 가능했음.

### 신규 테스트

| 파일 | 테스트 수 | 커버 대상 |
|------|----------|----------|
| `workflow-review-integration.test.ts` | 10 | runWorkflowReview (3 lens 병렬, domain selection 4종, partial/total failure, findings 매핑) |
| `refine-store-simulation.test.ts` | 12 | createLoop, addIteration (auto created_at, 순서 보존), checkConvergence (위임+빈 loop), getLoopsByProject, getActiveLoop, deleteLoop (activeId 정리) |
| `sanitize-dom-simulation.test.ts` | 28 | jsdom 환경: tag whitelist 6종, 금지 태그 5종, 속성 필터링 7종, 보안 강제 3종, 이벤트 핸들러 2종, 엣지 케이스 5종 |
| `api-validation-simulation.test.ts` | 49 | Channel ID regex, API key format, message validation (20개/50K 제한), system prompt 10K, Content-Type, 입력 truncation, HTML escaping, safeCompare |

### 전체 세션 최종 결과

| 항목 | 시작 | 최종 |
|------|------|------|
| Test files | 20 (3 broken) | **33 (0 broken)** |
| Tests | 480 (+66 failing) | **838 (all pass)** |
| 신규 테스트 | — | **292개** (13 파일) |
| 버그 수정 | — | DQ 캐시 무효화 + safeCompare bypass |

### 남은 영역 (미래 세션)

- **E2E 통합 테스트** — 실제 API route handler 호출 (Next.js test utils)
- **UI 컴포넌트 테스트** — ReframeStep, RecastStep 등 (React Testing Library)
- **Supabase 통합** — rate limiting RPC, Slack OAuth flow (테스트 DB 필요)
