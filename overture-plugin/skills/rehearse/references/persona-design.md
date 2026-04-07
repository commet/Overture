# Persona Design Guide

## What makes a good persona

1. **Specific**: Not "an executive" but "VP of Sales, 8 years at the company, got burned by the last international expansion, won't approve anything without a 3-year financial model"
2. **Diverse**: Different thinking styles, different risk appetites, different priorities
3. **Contextual**: Their concerns are specific to THIS project, not generic role descriptions

## Required persona fields

Every persona MUST have these fields:

| Field | Description | Example |
|-------|------------|---------|
| name | Korean-style name | 김부장 |
| role | Job title + context | 영업본부장, 8년차 |
| organization | Company/team | 본사 영업팀 |
| influence | high/medium/low | high |
| decision_style | How they evaluate | analytical |
| risk_tolerance | Risk appetite | low |
| priorities | What they care about | revenue targets, team stability |
| communication_style | How they talk | data-driven, direct |
| known_concerns | Historical worries | burned by last expansion |
| success_metric | What makes them say OK | 3-year financial model with IRR > 15% |
| primary_concern | Top worry for THIS plan | market entry cost |
| blocking_condition | What makes them say NO | no breakeven within 18 months |

## Thinking styles

| Style | How they give feedback | What they look for first |
|-------|----------------------|-------------------------|
| **Analytical** | "Show me the data" | Numbers, models, evidence |
| **Intuitive** | "Something feels off" | Past experience, pattern matching |
| **Consensus** | "What does the team think?" | Buy-in, alignment, process |
| **Directive** | "Give me the conclusion" | Speed, clarity, ownership |

### How thinking style shapes simulation:

- **Analytical** personas must cite numbers/data in their feedback. "매출 예측이 빠져있어" not "좀 더 준비해"
- **Intuitive** personas reference past experience. "작년에 비슷하게 해봤는데 안 됐어"
- **Consensus** personas ask about stakeholder buy-in. "팀원들은 뭐래?"
- **Directive** personas want the bottom line first. "결론부터 말해. 되나 안 되나"

## Risk appetite

| Level | Feedback pattern |
|-------|-----------------|
| **Conservative (low)** | Focuses on what can go wrong. Wants fallbacks. "Plan B 없으면 안 돼" |
| **Balanced (medium)** | Weighs risk vs. opportunity. "위험 대비 기대 수익이 맞나?" |
| **Aggressive (high)** | Focuses on what we'd miss by NOT doing it. "빨리 해보자, 위험은 감수" |

## Diversity checklist

When creating 3 personas:
- [ ] At least 2 different thinking styles
- [ ] At least 1 conservative and 1 aggressive on risk
- [ ] At least 1 with "high" influence (can kill the project)
- [ ] Different functional areas (don't put 3 people from the same department)

## Stakeholder archetypes by situation

| Situation | Who to include |
|-----------|---------------|
| Product launch | Customer champion, Revenue owner, Engineering lead |
| Market expansion | Local market expert, CFO, Operations head |
| Org change | Most affected team lead, HR, Executive sponsor |
| Investment decision | CFO, Board member, Domain expert |
| Partnership deal | Legal, Biz dev, Product owner |

## Persona voice rules

When simulating a persona:

- **You ARE this person.** Drop all AI politeness.
- **First person, conversational.** "이거 빠지면 통과 안 돼" not "이 부분이 보완되면 좋겠습니다."
- **SPECIFIC**: Name the exact section, number, or timeline. Never "좀 더 구체적으로" without saying WHAT.
- **Match the decision_style**: An analytical persona doesn't say "느낌이 안 좋아" and an intuitive persona doesn't ask for spreadsheets.
- **Match the risk_tolerance**: A conservative persona doesn't say "just try it" and an aggressive persona doesn't demand 5 fallback plans.

## Translated approvals

Each persona's approval condition should be mapped to specific plan elements:

| Persona | Approval condition | Translated to plan |
|---------|-------------------|-------------------|
| 김부장 | "매출 예측이 필요하다" | "Step 2에서 3개 시나리오 재무모델 추가" |
| 이사님 | "팀 역량 확인이 먼저" | "Step 1 앞에 팀 역량 assessment 추가" |
| 박실장 | "법적 리스크 검토" | "Step 3에 법무팀 review 체크포인트 추가" |

This mapping tells /refine exactly WHERE to make changes to satisfy each persona.
