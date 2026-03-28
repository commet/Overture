# 👥 Rehearse — AI 코드 리뷰 어시스턴트

## Bottom Line

1. "팀 컨벤션 학습"이 기존 linter 조합과 실제로 다르다는 증거를 만들어라
2. 시니어가 "빼앗기는 느낌"이 아닌 "돌려받는 느낌"을 받는 온보딩 설계 필요
3. false positive 비율에 대한 구체적 목표 세울 것

## 준호 — 시니어 백엔드 · 10인 팀

**First reaction:** "팀 컨벤션 학습이라는 게 우리 PR 100개를 진짜 이해하는 수준이면 혁명이지. 근데 ESLint 규칙 뽑아내는 수준이면 내가 왜 돈을 내."

**Risks:**
- [critical] false positive가 20% 넘으면 알림 피로로 결국 끔
- [unspoken] 스타일 지적하면서 주니어 가르치는 게 뿌듯한데, AI가 하면 내 역할이 뭐지?

**Approve if:** 1주일 내 "이건 ESLint로 못 잡는 건데"라는 순간이 3번 이상

## 수진 — DevOps · Codacy 해지 경험자

**First reaction:** "CodeRabbit + ESLint + Prettier면 스타일은 이미 90% 잡힌다. 남은 10%를 위해 새 SaaS를 도입하고 PR 히스토리까지 넘길 팀이 있을까?"

**Risks:**
- [critical] "팀 컨벤션 학습"은 마케팅 용어, 실제로는 패턴 매칭 — Codacy와 차별화 불가
- [unspoken] 시니어는 도입 결정권자이면서 역할 축소 당사자 — 셀프 디스럽션을 자발적으로 할 리 없음

**Approve if:** "Codacy랑 뭐가 다른지" 10초 안에 설명 가능

## Devil's Advocate

- **Most realistic failure:** 3개 팀 파일럿, 2주 후 1개만 남음. 학습이 아니라 초기 패턴 캐시였음.
- **Silent problem:** CTO(구매자)는 리뷰 시간 절약 원하지만, 시니어(사용자)는 리뷰 시간이 영향력의 원천. 인센티브 충돌.
- **1-year regret:** GitHub Copilot이 팀 컨벤션 학습 기능 출시. 독립 SaaS 존재 이유 소멸.

---

## Context Contract

classified_risks:
  critical:
    - "false positive 20% 넘으면 알림 피로로 끔" — 준호
    - "'팀 컨벤션 학습'이 패턴 매칭과 다른 점 증명 불가" — 수진
    - "CTO(구매자)와 시니어(사용자)의 인센티브 충돌" — Devil's Advocate
  manageable:
    - "PR 히스토리 접근 권한에 대한 보안 우려" — 수진
  unspoken:
    - "시니어에게 코드 리뷰는 비용이 아니라 영향력 행사 시간" — 준호
    - "셀프 디스럽션을 자발적으로 하는 사람은 없다" — 수진
untested_assumptions:
  - "팀 컨벤션 학습이 generic linting과 실질적으로 다른 결과를 내는가"
approval_conditions:
  준호: "1주 내 ESLint로 못 잡는 이슈 3회 이상 탐지"
  수진: "Codacy 대비 차별점 10초 내 설명 가능"
persona_profiles:
  - name: 준호
    context: "시니어 백엔드, 10인 팀, 하루 1-2h 리뷰"
    current_solution: "CodeRabbit 무료 + 수동 리뷰"
    switch_threshold: "팀 컨벤션 이해 수준의 리뷰"
    dealbreaker: "false positive로 리뷰 시간 증가"
  - name: 수진
    context: "DevOps, Codacy 6개월 해지 경험"
    alternative: "CodeRabbit + ESLint + Prettier"
    objection: "AI 리뷰는 noise가 많아 결국 끈다"
devils_advocate:
  realistic_failure: "파일럿 2주 후 이탈 — 학습이 아닌 캐시"
  silent_problem: "구매자-사용자 인센티브 충돌"
  regret: "GitHub Copilot의 컨벤션 학습 기능 출시"
