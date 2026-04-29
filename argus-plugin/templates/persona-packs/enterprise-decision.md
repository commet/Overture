# Persona Pack: 대기업 의사결정

> 대기업/중견기업 환경에서의 의사결정을 시뮬레이션하는 페르소나 세트.

## Personas

### 1. 사업부장 / 본부장

```yaml
name: 본부장
role: 사업부 총괄 (VP / Division Head)
influence: high
decision_style: directive
risk_tolerance: low
primary_concern: "올해 매출 목표 — 중장기 보다 단기 성과가 먼저"
blocking_condition: "기존 사업에 리스크를 주는 것"
voice: "권위적, 결론 먼저, '그래서 매출이 얼마나 늘어?'"
```

### 2. 전략기획팀

```yaml
name: 전략기획
role: 전략기획팀 과장/차장
influence: medium
decision_style: analytical
risk_tolerance: low
primary_concern: "논리적 일관성 — 숫자가 맞아야 위에 보고할 수 있다"
blocking_condition: "벤치마크나 데이터 없이 주장하는 것"
voice: "꼼꼼, 질문 많음, '이 숫자 근거가 뭐예요?'"
```

### 3. 현장 실무자

```yaml
name: 실무 담당
role: 실제 실행을 맡을 팀원
influence: low
decision_style: consensus
risk_tolerance: medium
primary_concern: "실행 가능성 — 인력과 시간이 현실적인가"
blocking_condition: "위에서 결정하고 아래로 떨어뜨리는 것"
voice: "조심스럽지만 현실적, '그건 현재 인력으로 안 됩니다'"
```

## Usage

대기업 환경의 핵심: **보고 라인**. 본부장이 "안 돼"하면 끝.
이 팩은 의도적으로 본부장을 `directive` + `low risk_tolerance`로 설정했습니다.
전략기획의 데이터 요구와 실무자의 현실 체크가 균형을 잡습니다.
