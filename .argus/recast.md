# 📋 Recast — AI 코드 리뷰 어시스턴트

## Product Thesis

10인+ 개발팀에서 시니어가 주니어 PR 리뷰 시 반복적 스타일·패턴 지적은 AI가 처리하고, 시니어는 아키텍처·설계 판단에만 집중하게 해주는 리뷰 어시스턴트.

## Product Narrative

**Situation:** 개발팀에서 코드 리뷰는 필수지만 시니어 개발자의 시간을 가장 많이 잡아먹는 작업. 하루 1-2시간을 PR 리뷰에 쓴다.

**Complication:** 기존 AI 리뷰 도구(CodeRabbit, Codacy)는 generic linting 수준. 팀마다 다른 컨벤션을 모르니 noise가 많고, 결국 꺼진다. 시니어는 여전히 스타일 지적과 설계 리뷰를 동시에 해야 한다.

**Resolution:** 팀의 기존 PR 히스토리에서 고유 패턴을 학습하는 AI 리뷰 어시스턴트. 스타일/패턴 이슈는 AI가 잡고, 시니어에게는 설계/로직 이슈만 남긴다. 시니어를 대체하는 게 아니라 시니어의 시간을 되돌려준다.

## User Story

10인 개발팀의 시니어 개발자로서, 주니어 PR에서 반복되는 스타일 지적에 시간을 뺏기고 싶지 않다. AI가 패턴 이슈를 잡아주면 나는 설계 리뷰에만 집중하고 싶다.

## Features

### P0
- **팀 컨벤션 학습 엔진**: 기존 PR 히스토리(최근 100개)에서 팀 고유 패턴/규칙 자동 추출, 새 PR에 자동 적용
- **리뷰 분리 필터**: PR diff 분석 후 코멘트를 "스타일/패턴(AI 자동)" vs "설계/로직(시니어 집중)" 두 카테고리로 자동 분류

### P1
- **리뷰 시간 대시보드**: 리뷰어별 리뷰 시간 추적, AI 처리 비율, 월간 ROI 시각화 (CTO 리포트용)

### P2
- **온보딩 가속기**: 새 팀원 첫 10개 PR에 팀 컨벤션 가이드 자동 첨부

## Scope Cuts
CI/CD 연동, 보안 취약점 스캔(Snyk 영역), 코드 자동 수정/자동 머지, IDE 플러그인, 다국어 지원

## Key Assumptions
1. ? 기존 도구 대비 "팀 컨벤션 학습" 틈새가 있다 [from reframe]
2. ? CTO가 리뷰 시간 절약에 월 구독료를 낼 것이다 [from reframe]
3. ? 시니어가 AI 스타일 지적을 위협이 아닌 도움으로 받아들일 것이다 [new]
4. ✓ 코드 리뷰에 과도한 시간이 든다 [from reframe, confirmed]

## Success Metric
3개 팀이 2주 사용 후 시니어 리뷰 시간 30% 감소

---

## Context Contract

context: build
product_thesis: "10인+ 개발팀에서 시니어가 주니어 PR 리뷰 시 반복적 스타일·패턴 지적은 AI가 처리하고, 시니어는 아키텍처·설계 판단에만 집중하게 해주는 리뷰 어시스턴트"
storyline:
  situation: "시니어 개발자가 하루 1-2시간 PR 리뷰에 소비, 코드 리뷰는 필수"
  complication: "기존 AI 도구는 generic linting 수준, 팀 컨벤션을 모르니 noise → 꺼짐"
  resolution: "팀 PR 히스토리에서 고유 패턴 학습, 스타일은 AI가, 설계는 시니어가"
user_story: "10인 개발팀 시니어로서 주니어 PR 스타일 지적에 시간 뺏기지 않고 설계 리뷰에 집중하고 싶다"
features:
  p0:
    - name: "팀 컨벤션 학습 엔진"
      behavior: "기존 PR 히스토리에서 팀 고유 패턴 자동 추출 · 새 PR에 자동 적용"
    - name: "리뷰 분리 필터"
      behavior: "PR 코멘트를 스타일/패턴(AI) vs 설계/로직(시니어) 자동 분류"
  p1:
    - name: "리뷰 시간 대시보드"
      behavior: "리뷰어별 시간 절약 지표 · ROI 시각화"
  p2:
    - name: "온보딩 가속기"
      behavior: "새 팀원 첫 10개 PR에 컨벤션 가이드 자동 첨부"
scope_cuts: ["CI/CD 연동", "보안 취약점 스캔", "코드 자동 수정/자동 머지", "IDE 플러그인", "다국어 지원"]
key_assumptions:
  - assumption: "기존 도구 대비 팀 컨벤션 학습 틈새가 있다"
    importance: M
    certainty: L
    if_wrong: "CodeRabbit과 차별화 불가, 가격 경쟁으로 전락"
    source: reframe
  - assumption: "CTO가 리뷰 시간 절약에 월 구독료를 낼 것이다"
    importance: M
    certainty: L
    if_wrong: "수익 모델 붕괴, 무료 도구와 경쟁 불가"
    source: reframe
  - assumption: "시니어가 AI 스타일 지적을 위협이 아닌 도움으로 받아들인다"
    importance: H
    certainty: L
    if_wrong: "핵심 유저가 채택 거부, 도구가 팀 내 갈등 유발"
    source: new
inherited_assumptions: ["기존 도구 대비 틈새", "지불 의향"]
target_user:
  name: 준호
  context: "시니어 백엔드 개발자, 10인 팀, 하루 1-2시간 리뷰"
  current_solution: "CodeRabbit 무료 + 수동 리뷰 병행"
  switch_threshold: "팀 컨벤션을 이해하는 리뷰가 나오면"
  dealbreaker: "false positive가 많아서 리뷰 시간이 오히려 늘면"
skeptic:
  name: 수진
  context: "DevOps, 이전 팀에서 Codacy 6개월 쓰다 해지"
  alternative: "CodeRabbit + ESLint/Prettier 조합"
  objection: "AI 리뷰는 noise가 너무 많아서 결국 끈다. 팀 컨벤션 학습이라고 뭐가 다른가?"
success_metric: "3개 팀이 2주 사용 후 시니어 리뷰 시간 30% 감소"
ai_limitations: ["개발자가 AI 리뷰를 실제로 반영하는지", "기존 도구 사용자의 워크플로우 마찰", "GitHub/Microsoft Copilot 확장 전략"]
