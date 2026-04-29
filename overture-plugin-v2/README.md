# Overture (Plugin v2)

**Judgment harness for AI.** Decide inside your actual codebase — a team of agents deploys as workers on your real code, PRs, files, or design docs. Output is a **decision scaffold**, not a solution.

## What this is (and isn't)

Overture is NOT:
- A code generator (use Cursor).
- An automated code reviewer (use Copilot Review).
- A "multi-agent AI framework" for you to customize (use CrewAI, LangGraph).

Overture IS:
- A **pipeline** for structuring a decision — from the initial "what am I even deciding?" to a scaffold with preserved trade-offs, hidden assumptions, team contradictions, and human-required checkpoints.
- **Code-native** — agents work on your actual files/PRs, not abstract prose.
- **Version-tree aware** — every decision iteration is a tagged version (`v0.1`, `v0.2`, `v1.0`). Branch freely; return to earlier versions and fork from there.
- **Stored with your code** — `.overture/sessions/` commits alongside your repo. Teams share decision history via `git`.

## Installation

```bash
curl -fsSL https://raw.githubusercontent.com/commet/Overture/main/overture-plugin-v2/install.sh | bash
```

Restart Claude Code.

## Quick start

```bash
# Structure a decision from scratch
/overture:sail "Should we migrate from Firestore to Supabase?"

# Work through a specific PR
/overture:sail @PR#42

# Think about a file you're stuck on
/overture:sail @src/auth/middleware.ts

# See the version tree of your decisions
/overture:chart
```

Each invocation writes to `.overture/sessions/{id}/versions/v0.1/` etc. Commit these to your repo to share decision history with your team.

## The pipeline

`/overture:sail` routes to the right sub-skill based on your intent. The full pipeline:

1. **`/overture:clarify`** — Sharpen the question. Surfaces hidden assumptions, reframes surface request into real question, produces an execution plan.
2. **`/overture:team`** — Deploy 2–4 agents as WORKERS on the actual artifact. Each produces domain-specific output in their voice. Critical-stakes path runs a two-stage pipeline with explicit debate preservation.
3. **`/overture:boss`** — Your configured stakeholder (set via MBTI archetype) reviews the scaffold. Returns concerns with severity + fix suggestions.
4. **`/overture:chart`** — Navigate the version tree. Promote a draft to `v1.0`. Branch from an older version. Switch active draft.

## The 17-agent team

Agents are workers (not critics). Each has a distinct voice, domain, and thinking framework.

| Chain | Agents |
|-------|--------|
| **Research** | 하윤 (intern), 다은 (researcher), 도윤 (director) |
| **Strategy** | 정민 (jr), 현우 (lead), 승현 (chief) |
| **Production** | 서연 (copy), 규민 (numbers), 혜연 (finance), 민서 (marketing), 수진 (people), 준서 (engineer), 예린 (PM) |
| **Validation** | 동혁 (risk), 지은 (UX), 윤석 (legal) |
| **Special** | 악장 (concertmaster — revision worker) |

The `/overture:team` skill auto-selects 2–4 based on task classification. Stakes determines count:
- `routine` → 2 agents (often skipped — see Routing below)
- `important` → 3 agents
- `critical` → 4 agents, two-stage pipeline with mandatory donghyuk review

## Routing — what `/overture:sail` actually does

`/overture:sail "..."` doesn't always run the full pipeline. It auto-routes by `decision_density` and `stakes_confidence` (both produced by clarify):

| Your question shape | Output | Why |
|---|---|---|
| Reversible single-action (rename, label, toggle) with high framing confidence | **MinimalScaffold** — 3 lines: recommendation + 1 quick check + optional caveat. No team, no boss. | A 5-section decision scaffold for a tab-rename is bikeshed-grade over-engineering. (TC1 fail mode from 2026-04-28 reality test.) |
| Important/critical question with confident stakes (≥80) | Auto-chains team → boss → ~15-line consolidated decision card. One-line progress notices between steps. | Asking "어떻게 진행할까요?" when stakes are obviously important wastes the user's first input. |
| Borderline stakes (clarify confidence 60–79) | One AskUserQuestion: "이 결정이 X로 보이는데(N/100) 맞나요?" → user picks → auto-proceeds. | Preserves user agency only where it matters. |
| Anything else | Standard 4-option dialog (full / team-only / quick / pause). | Last-resort fallback. |

Override paths:
- `/overture:sail --full "..."` — force full pipeline regardless of density
- `/overture:sail --quick "..."` — clarify only, regular scaffold (no MinimalScaffold collapse)
- `/overture:sail --no-boss "..."` — skip boss review at end

## Boss personalities

Set once with `/overture:configure`. Choose from 16 MBTI archetypes — each has distinct speech patterns, feedback style, and trigger priorities. Example: ISTJ focuses on process + precedent; ENTJ demands alternatives + decisiveness; INFP reads emotional undertone first.

## Version tree ("해도")

Every completed scaffold is a versioned draft. Drafts form a tree:

```
v0.1 ─┬── v0.2 ──── v0.3 ─── (promoted to v1.0) ← released
      └── v0.1.1 (branch — alternate approach)
```

- `/overture:chart --checkout v0.1` — navigate to an earlier version
- `/overture:chart --promote v0.3` — mark as `v1.0` release
- Branch freely; return to earlier versions and fork new paths

Because `.overture/sessions/` lives in your repo, the decision history ships with your code.

## What makes this different

Three things, in order of importance:

1. **Workers, not critics.** Agents produce domain artifacts (research notes, ROI tables, UX critiques) on the real problem. Critique is one step (boss review), not the whole interaction.
2. **Contradictions preserved.** When agents disagree on critical-stakes decisions, the disagreement is stored in the scaffold, not averaged away. You see the tension; you resolve it.
3. **Decision scaffold, not solution.** Output shape: `reframed_question` + `key_trade_offs[]` + `hidden_assumptions[]` + `human_required_checkpoints[]`. The plugin refuses to tell you what to do; it tells you what you're deciding.

## Configuration

**No setup required for first run.** `/overture:sail` auto-creates `.overture/config.yaml` from the bundled template (ISTJ default boss) on first invocation. Edit the file to change boss MBTI, name, or locale.

```yaml
boss:
  mbti_code: ISTJ        # ISTJ ISFJ INFJ INTJ ISTP ISFP INFP INTP
                         # ESTP ESFP ENFP ENTP ESTJ ESFJ ENFJ ENTJ
  name: "박 팀장"
  gender: 남             # 남 | 여 (KR) or male | female (EN)
  role: "팀장"
locale: ko               # ko | en
```

After editing skill files (development mode): **restart Claude Code** to apply. Skill bodies cache at session start; symlinked file changes don't take effect mid-session.

## Schemas

Plugin artifacts conform to JSON schemas in `data/schemas/`:
- `analysis-snapshot.json` — `/overture:clarify` output (incl. `decision_density`, `stakes_guess`, `stakes_confidence`, `reversibility` for routing)
- `minimal-scaffold.json` — 3-field directive output for routine reversible decisions (recommendation + 1 check + optional caveat)
- `worker-result.json` — individual agent output
- `mix-result.json` — aggregated team output
- `dm-feedback.json` — boss review output
- `final-scaffold.json` — plugin-native decision scaffold for medium/high density
- `draft.json` — version tree node
- `session.json` — top-level session record (incl. `classification.stakes_confidence`, `stakes_user_confirmed`)

## Relationship to the webapp

Overture has a webapp at `overture.so` (Next.js) with a richer UI. The plugin shares:
- Agent identities + capabilities + frameworks (data parity via one-way sync from webapp source)
- Boss MBTI archetypes
- Draft tree model + version numbering

The plugin diverges:
- **Output shape** — scaffold (not markdown doc)
- **Agent role** — workers (not multi-persona reviewers)
- **Environment** — code-native (real files, not abstract prose)
- **Persistence** — filesystem (not Supabase)

## License

MIT
