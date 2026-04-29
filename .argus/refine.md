# 🔧 Refine — AI 코드 리뷰 어시스턴트

## Round 1

### Changes
1. **Product thesis 피벗**: "시간 절약" → "시니어의 영향력 확장" — 구매자-사용자 인센티브 충돌 해결
2. **P0 재정의**: "팀 컨벤션 학습" → "리뷰어 판단 학습" — 시니어 approve/reject 패턴에서 암묵적 기준 추출. Codacy/패턴 매칭 차별화
3. **false positive 방어**: confidence threshold 85%+ only, dismiss 학습 메커니즘, 목표 <15%
4. **플랫폼 리스크 대응**: 팀 기준 export 기능 — 학습된 기준을 코드 스탠다드 문서로 자동 생성

### Results
- Critical: 3 → 1 (남은 1: "학습이 진짜 판단 수준인지" — 빌드 후 증명 필요)
- 준호: 조건부 → 파일럿 의향
- 수진: 거부 → 조건부 (증거 요구)

### Revised Spec
- Product thesis: "시니어의 리뷰 기준이 모든 PR에 자동 적용 — 시니어의 영향력 확장 도구"
- P0: 리뷰어 판단 학습 (85%+ confidence, dismiss 학습) + 리뷰 분리 필터
- P1: 리뷰 시간 대시보드 + 팀 기준 export
- P2: 온보딩 가속기
- 성공 지표: 3개 팀 파일럿 2주 후, "ESLint로 못 잡는다" 순간 팀당 5회 이상

---

## Context Contract

converged: false
rounds: 1
critical_remaining: 1
approval_conditions:
  met: ["준호: 파일럿 의향 (영향력 확장 프레이밍 수용)"]
  unmet: ["수진: ESLint로 못 잡는 예시 3개 필요"]
key_changes:
  - "product thesis: 시간 절약 → 영향력 확장"
  - "core feature: 컨벤션 학습 → 리뷰어 판단 학습"
  - "false positive defense: 85% threshold + dismiss learning"
  - "platform risk: 팀 기준 export 추가"
governing_idea_preserved: true
sharpest_critique_resolved: "'CodeRabbit + ESLint + Prettier면 90% 잡힌다' → 포지셔닝을 스타일 자동화에서 '리뷰어 판단 학습'으로 이동, linter 영역과 비교 자체를 회피"
