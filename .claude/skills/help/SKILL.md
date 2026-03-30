---
name: overture-help
description: "Show available Overture skills and how to use them. Use when the user asks about Overture, asks for help, or seems unsure which skill to use."
allowed-tools: Read
---

**Always respond in the same language the user uses.**

**No box drawing.** Use `---`, `**bold**`, and whitespace for structure.

Display using hybrid rendering:

**Overture — 막막할 때 쓰는 구조화 도구**

내 전문 분야가 아닌 걸 해야 할 때. 질문 하나 던지면 30초 안에 뼈대가 나옵니다.
기획안, 전략 제안서, 비즈니스 케이스... 채울수록 날카로워집니다.

---

**Quick start:**

```
  /overture "개발자인데 대표님이 기획안 짜오라고 했어"

  → 30초 안에 기획안 뼈대 + 숨겨진 전제
  → 질문 2-3개에 답하면 더 날카로워짐
  → "대표님은 뭐라고 할까?" 시뮬레이션
  → 최종 결과물 + 바로 쓸 수 있는 프롬프트
```

```
  개별 스킬 (각각 독립적으로 사용 가능):

  /reframe       문제 재정의 — 숨겨진 전제 발견, 진짜 질문 도출
  /recast        실행 설계 — AI/사람 역할 분배, 기획안 구조화
  /rehearse      사전 검증 — 판단자 반응 시뮬레이션, 약점 발견
  /refine        수정 반영 — 피드백 반영, 수렴까지 반복

  /overture      전체 파이프라인 — 위 4단계를 한 번에

  /reframe → /recast → /rehearse → /refine
  각 스킬은 독립 사용 가능. /overture는 전체를 순차 실행.

  유틸리티:

  /overture:setup       설치 확인
  /overture:doctor      문제 진단
  /overture:configure   설정 (언어, 프리셋, 저널)
  /overture:patterns    사고 패턴 분석 (3회 이상 사용 후)
```

**결과물:**

만드는 것? → Implementation Prompt (Cursor/Claude Code에 바로 붙여넣기) + Product Brief
판단하는 것? → Sharpened Prompt + Thinking Summary + Agent Harness

\+ Decision Quality score (0-100) on every `/overture` run
