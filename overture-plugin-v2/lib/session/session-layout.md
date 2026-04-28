# Session Directory Layout

Every Overture session lives in `.overture/sessions/{session-id}/` relative to the repo root.

## Layout

```
.overture/
├── config.yaml                  # User's plugin config (boss MBTI, locale)
├── sessions/
│   └── {session-id}/
│       ├── session.json         # Top-level session record (schema: data/schemas/session.json)
│       ├── versions/
│       │   ├── v0.1/
│       │   │   ├── analysis.json       # AnalysisSnapshot from /overture:clarify
│       │   │   ├── questions_and_answers.json
│       │   │   ├── meta.json           # {triggering_skill, timestamp, notes}
│       │   │   ├── classification.json  # From /overture:team
│       │   │   ├── team_plan.json       # Agent assignments + stages
│       │   │   ├── workers.json         # All WorkerResults
│       │   │   ├── debate.json          # (critical stakes only)
│       │   │   ├── mix.json             # Aggregated MixResult
│       │   │   ├── boss_feedback.json   # From /overture:boss
│       │   │   └── scaffold.json        # FinalScaffold (plugin-native output)
│       │   ├── v0.2/
│       │   │   └── ...
│       │   └── v0.1.1/
│       │       └── ...
│       └── errors.log           # Any skill errors captured during session
```

## Session ID format

`YYYY-MM-DD-{kebab-of-first-5-words-of-problem}`

Collision-safe via `-N` suffix (2, 3, ...). Example:
```
2026-04-24-design-pr-review-workflow
2026-04-24-design-pr-review-workflow-2
```

## File naming conventions

- JSON for machine-readable artifacts (conform to schemas in `data/schemas/`).
- `.log` for append-only text logs.
- `meta.json` in each version dir holds non-artifact metadata (timestamp, triggering skill, user notes).

## What's versioned vs what's session-level

**Session-level** (in `session.json`):
- id, problem_text, repo_path, invoking_context, boss_agent, phase, round
- Pointers: `active_draft_id`, `released_draft_id`, `drafts[]`
- Accumulators across versions: none by design (each version owns its artifacts)

**Version-level** (in `versions/{label}/*.json`):
- The ARTIFACTS produced during that version's lifecycle.
- Immutable once complete (except `meta.json` for annotations).
- A version starts when `/overture:clarify` / `:team` / `:boss` begins a new draft chain.

## Git commitment

The `.overture/` directory is designed to be **committed to the user's repo**. This is the plugin's unique moat vs the webapp: decision history travels with the code, shareable via `git`.

Recommended `.gitignore`:
```
.overture/errors.log
.overture/sessions/*/versions/**/*.stream.partial
```

Everything else should be committed.

## Draft tree semantics

- `drafts[0]` is the root (`parent_draft_id: null`).
- Each subsequent draft has `parent_draft_id` pointing to its parent.
- `active_draft_id` = currently-focused draft (default: latest by `created_at`).
- `released_draft_id` = draft marked as v{major}.0 via `/overture:chart --promote`.

When `active_draft_id` changes (`/overture:chart --checkout`), the session's
surface view (`final_scaffold` at session root) reflects the active draft's scaffold.
This is the "해도" affordance — navigating branches updates what's "current."

## What a version directory contains at each phase

| Skill | Files written |
|---|---|
| `/overture:clarify` | `analysis.json`, `questions_and_answers.json`, `meta.json` |
| `/overture:team` | `classification.json`, `team_plan.json`, `workers.json`, (optional) `debate.json`, `mix.json`, `scaffold.json` |
| `/overture:boss` | `boss_feedback.json`, updated `scaffold.json` (with applied/rejected concerns) |
| `/overture:revise` | New version dir. Copies forward what's unchanged; writes `revise_directive.txt` + new `mix.json` (if revised). |

## Migration from old plugin (v0.5 → v2)

Existing `.overture/journal.md` files from v0.5 are **not migrated**. Plugin-v2 treats them as legacy:
- Statusline still reads them (for DQ trend display).
- No active skill reads/writes them.
- User can delete them when comfortable.

New sessions use this layout. No in-place data conversion.
