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

1. **테스트 확장** — 위 "테스트되지 않은 영역" 참고
2. **테스트 factory 추출** — 파일 수가 10개 넘어가면 shared helpers로 분리
3. **DQ 캐시 무효화** — `computeDecisionQuality` 재계산 메커니즘 설계 검토
4. **기존 깨진 테스트 수정** — context-chain.test.ts (TypeScript 파싱 에러), eval-engine.test.ts / reframing-strategy.test.ts (Supabase URL 누락)
5. **스킬 실행 테스트** — 각 스킬을 실제로 돌려보면서 출력 품질 확인 (Loop 2의 나머지)
