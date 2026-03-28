# 🎯 Reframe

**원래 질문:** 개발자를 위한 AI 코드 리뷰 자동화 SaaS
**진짜 질문:** AI 코드 리뷰 도구가 5개 이상 존재하는 시장에서, 기존 도구가 의도적으로 방치하는 리뷰 마찰은 무엇이며, 독립 SaaS가 들어갈 틈이 있는가?

## 가정
- ✓ 코드 리뷰에 과도한 시간을 쓰고 있다
- ✓ AI 리뷰 코멘트를 신뢰하고 반영할 것이다
- ? 기존 도구(GitHub Copilot, CodeRabbit, Codacy) 대비 틈새가 존재한다
- ? 팀 리드/CTO가 월 구독료를 지불할 의향이 있다

## 먼저 답해야 할 질문
- CodeRabbit/Codacy 사용자 리뷰에서 반복되는 불만 Top 3 조사
- 개발팀 리드 3명에게 "코드 리뷰 도구에 돈 내본 적 있나?" 직접 확인
- GitHub Copilot의 코드 리뷰 로드맵 확인 — 타이밍 검증

> 💡 "코드 리뷰 자동화"를 기술 문제로 보고 있지만, 시니어 개발자에게 코드 리뷰는 멘토링이자 팀 문화다. 자동화의 경쟁자는 다른 도구가 아니라 "리뷰를 통해 주니어를 가르치고 싶은 사람"이다.

---

## Context Contract

context: build
reframed_question: "AI 코드 리뷰 도구가 5개 이상 존재하는 시장에서, 기존 도구가 의도적으로 방치하는 리뷰 마찰은 무엇이며, 독립 SaaS가 들어갈 틈이 있는가?"
assumption_pattern: mixed
strategy: narrow_scope
interview_signals:
  origin: self
  uncertainty: why
  success: measurable
build_signals:
  audience: dev_teams
  success_model: revenue
  scale: saas
assumptions_confirmed:
  - "코드 리뷰에 과도한 시간을 쓰고 있다"
  - "AI 리뷰 코멘트를 신뢰하고 반영할 것이다"
assumptions_uncertain:
  - "기존 도구 대비 틈새가 존재한다" | reason: CodeRabbit/Codacy/Copilot 등 이미 다수 존재
  - "팀 리드/CTO가 월 구독료를 지불할 의향이 있다" | reason: 지불 경험 미확인
assumptions_doubtful: []
ai_limitations:
  - "개발자가 AI 리뷰를 실제로 반영하는지 (행동 vs 의향)"
  - "기존 도구 사용자의 구체적 워크플로우 마찰"
  - "GitHub/Microsoft의 Copilot 확장 전략 내부 결정"
