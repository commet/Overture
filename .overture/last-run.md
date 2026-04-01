# 신사업 기획안: [영역명] 진입 전략 및 실행 계획

> 본 기획안은 [영역]에 대한 신사업 진입 여부를 판단하기 위한 자료다. 핵심 질문은 "지금 우리가 진입해야 하는 구체적 이유가 있는가, 그리고 2주 안에 그걸 검증할 수 있는가"이다.

## TL;DR
백엔드 개발자가 2주 안에 신사업 기획안을 써야 하는 상황 — 형식이 아니라 대표님의 Go/No-Go 판단 구조를 설계하는 것이 진짜 과제다.

## 대표님 피드백 반영 사항
1. "왜 우리인가" → 기술 자산 기반 비용 비교표 추가
2. "왜 우리인가" → 구체적 기술 자산명 명시
3. 2주 뒤 산출물 형태 명확화 → 데이터 요약 1장 + 고객 반응 3건 + Go/No-Go 체크리스트

---

```yaml
context: decide
judge: 대표님/CEO
reframed_question: "대표님이 이미 정한 영역에서, 지금 우리가 진입해야 하는 이유와 2주 안에 검증 가능한 것을 어떻게 분리해서 보여줄 것인가"
assumption_pattern: mixed
assumptions_doubtful:
  - "대표님이 원하는 건 완성된 기획안이다 — 실은 하지 않을 이유도 원할 수 있음"
assumptions_confirmed:
  - "대표님이 직접 판단한다"
  - "영역이 정해져 있다"
assumptions_uncertain:
  - "시장 데이터 양보다 해석의 질이 중요하다"
  - "2주 안에 의미 있는 검증이 가능한가"
simulation_risks_critical:
  - text: "왜 우리인가의 답이 추상적"
    fix: "기술 자산 기반 비용 비교표 추가"
  - text: "비용 우위 근거 부재"
    fix: "기존 인프라 재활용 범위 기술적 산정"
simulation_risks_unspoken:
  - "대표님이 이걸 시킨 건 하지 않을 이유를 찾으라는 뜻일 수 있다"
judge_approval_condition: "왜 우리여야 하는지가 기술 자산 기반으로 구체적이면 통과"
deliverable_type: plan
```
