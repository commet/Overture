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
- `routine` → 2 agents
- `important` → 3 agents
- `critical` → 4 agents, two-stage pipeline with mandatory donghyuk review

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

On first run, `/overture:configure` (coming soon in post-MVP) sets up:
- Your boss's MBTI type, name, gender, locale
- Default language (Korean / English)

Until then, create `.overture/config.yaml` manually:

```yaml
boss:
  mbti_code: ISTJ
  name: "박 팀장"
  gender: 남
  locale: ko
locale: ko
```

## Schemas

Plugin artifacts conform to JSON schemas in `data/schemas/`:
- `analysis-snapshot.json` — `/overture:clarify` output
- `worker-result.json` — individual agent output
- `mix-result.json` — aggregated team output
- `dm-feedback.json` — boss review output
- `final-scaffold.json` — plugin-native decision scaffold
- `draft.json` — version tree node
- `session.json` — top-level session record

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
