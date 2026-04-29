---
name: overture-configure
description: "Set up Overture preferences — language, output format, journal settings, and presets. Interactive configuration with presets for quick onboarding. Saves to .overture/config.json."
allowed-tools: Read, Write, AskUserQuestion
---

## When to use

- ✓ First time using Overture and want to set preferences
- ✓ Want to change language, output format, or journal settings
- ✓ Switching between Quick/Standard/Learning modes
- ✗ First installation (use /overture:setup first)
- ✗ Diagnosing issues (use /overture:doctor)

**Always respond in the same language the user uses.**

**No box drawing.** Do NOT use `╭╮╰╯`, `┌│└`, `═══╪`, `───┼`, `━━━`, or any Unicode box characters. Use `---`, `**bold**`, and whitespace for structure.

## Configuration Flow

### Step 0: Detect existing configuration

Check if `.overture/config.json` exists.

**New user (no config):** Run the full setup flow (5 questions).
**Returning user (config exists):** Show current settings and ask what to change.

### For new users: Full setup

Use AskUserQuestion for each step.

**Q1: Preset**

- question: "How do you want to use Overture?"
- header: "Preset (1/5)"
- options:
  - label: "Quick", description: "/reframe only, minimal output — for fast thinkers who want one sharp reframe"
  - label: "Standard", description: "Full pipeline, clean output — for regular use and team sharing"
  - label: "Learning", description: "Full pipeline + journal + pattern tracking — for improving thinking over time (recommended)"

Preset mappings:
- **Quick**: auto_save=false, journal=false, full_pipeline=false, output_format=compact
- **Standard**: auto_save=true, journal=true, full_pipeline=true, output_format=standard
- **Learning**: auto_save=true, journal=true, full_pipeline=true, output_format=detailed, patterns=true

**Q2: Language**

- question: "Preferred language for output?"
- header: "Language (2/5)"
- options:
  - label: "Auto-detect", description: "Match your input language"
  - label: "English", description: "Always English"
  - label: "한국어", description: "Always Korean"
  - label: "日本語", description: "Always Japanese"
  - label: "Other", description: "Type your preferred language"

**Q3: Output location**

- question: "Where to save results?"
- header: "Output (3/5)"
- options:
  - label: ".overture/ in project root", description: "Default location"
  - label: "Custom path", description: "Type your preferred path"
  - label: "Don't save files", description: "Output only, no file saving"

**Q4: Journal**

Only shown if preset is Standard or Learning:

- question: "Track your decision patterns over time?"
- header: "Journal (4/5)"
- options:
  - label: "Yes", description: "Append to .overture/journal.md (recommended)"
  - label: "No", description: "Skip journaling"

**Q5: Persona defaults**

Only shown if preset is Standard or Learning:

- question: "Default persona count for /rehearse?"
- header: "Personas (5/5)"
- options:
  - label: "2 personas", description: "Faster, less thorough"
  - label: "3 personas", description: "Balanced (recommended)"
  - label: "4 personas", description: "Thorough, takes longer"

### For returning users: Quick update

**⚙ Overture · Configure**

**Current settings:**
- Preset: [Learning]
- Language: [auto-detect]
- Output: [.overture/]
- Journal: [enabled]
- Personas: [3]

AskUserQuestion:

- question: "What would you like to change?"
- header: "Settings"
- options:
  - label: "Switch preset", description: "Quick / Standard / Learning"
  - label: "Change language", description: "Output language preference"
  - label: "Change output location", description: "Where results are saved"
  - label: "Toggle journal", description: "Enable/disable pattern tracking"
  - label: "Change persona count", description: "Default reviewers in /rehearse"
  - label: "Reset to defaults", description: "Start fresh"
  - label: "Done", description: "Keep current settings"

Allow multiple changes before saving.

### Save configuration

Save to `.overture/config.json`:

```json
{
  "version": "0.5.0",
  "preset": "learning",
  "language": "auto-detect",
  "output_path": ".overture/",
  "auto_save": true,
  "journal": {
    "enabled": true,
    "path": ".overture/journal.md",
    "max_entries_before_archive_hint": 50
  },
  "rehearse": {
    "default_persona_count": 3
  },
  "pipeline": {
    "full_pipeline_enabled": true,
    "max_refine_rounds": 3,
    "output_format": "detailed"
  },
  "updated_at": "[ISO date]"
}
```

### Confirmation

**✓ Overture · Configured**

- Preset: [Learning]
- Language: [auto-detect]
- Output: [.overture/]
- Journal: [enabled]
- Personas: [3]

Saved to `.overture/config.json`

> Try: `/reframe "your problem"` or `/overture "important decision"`

## How other skills read the config

All Overture skills should check for `.overture/config.json` at startup:

1. If config exists → use settings (language preference, persona count, etc.)
2. If config doesn't exist → use defaults (auto-detect language, 3 personas, save to .overture/)
3. Config is OPTIONAL — Overture works fine without it

Skills should NEVER require configuration to run. Config is a convenience layer.
