# @gifd/builder

The Gifd app-builder agent extension.

**Status: scaffold only.** The plugin registers successfully but exposes no tools yet. Real implementation lands after the design spec is finalized — see `docs/groundwork/platform-design-checkpoint.md`.

## What it will do (planned)

Customize Gifd's apps from chat:

1. User describes an app change in chat (e.g. "Add a weekly review screen")
2. Agent asks 1-5 clarifying questions
3. Agent creates a draft worktree of the target app (e.g. `apps/groundwork-web`)
4. Agent edits code in the draft via `Read`/`Write`/`Edit`/`Glob`/`Grep` tools (scoped to the draft dir)
5. Agent runs `build_draft` to verify the draft compiles
6. User previews the draft in their App view, decides Accept or Discard
7. Accept = atomic migration + symlink swap to live; intent log entry persisted
8. Discard = draft worktree deleted

## Architecture (planned)

- **Tools (custom MCP-style):**
  - `read_schema` — introspect SQLite schema with redaction allowlist (no row data)
  - `build_draft` — run `next build` against draft, return structured errors
  - `record_intent` — append structured entry to intent log SQLite table
  - `draft_create`, `draft_accept`, `draft_discard` — lifecycle ops
- **Hooks:**
  - `PreToolUse` on `Write`/`Edit` — enforce draft-branch path boundary
  - `PostToolUse` on `Write`/`Edit` — record intent log entries
- **Sandbox model:**
  - Each session creates a `git worktree` of the target app under `<draftsRoot>/<draftId>/`
  - SQLite snapshot via APFS clonefile or backup API
  - Accept = transaction-wrapped migration + symlink swap (see design spec)
- **Models (default):**
  - Codegen / planning: Claude Opus 4.7
  - Clarifying turns: Claude Haiku 4.5
  - Configurable via `gifdBuilderConfig.models`

## Layout

```
extensions/gifd-builder/
├── index.ts                  Plugin entry (definePluginEntry)
├── api.ts                    Public SDK re-exports
├── openclaw.plugin.json      Plugin manifest
├── package.json              @gifd/builder package metadata
├── tsconfig.json             Extends OpenClaw's tsconfig.core.json
├── README.md                 This file
└── src/
    ├── plugin.ts             registerGifdBuilderPlugin (scaffold)
    ├── config.ts             Zod config schema
    └── (planned)
        ├── prompt-guidance.ts        System prompts + clarifying-question templates
        ├── tools/                    Custom MCP tools (one file per tool)
        ├── hooks/                    Pre/Post tool-use hooks
        ├── workspace.ts              Draft worktree management
        ├── intent-log.ts             SQLite intent log
        └── query-auditor.ts          Parse generated queries for consent UI
```

## Configuration

See `openclaw.plugin.json` and `src/config.ts` for the full schema. Defaults are reasonable for V1.

| Field                       | Default                           | What it controls                              |
| --------------------------- | --------------------------------- | --------------------------------------------- |
| `groundworkRoot`            | `<workspace>/apps/groundwork-web` | Path to the target app the agent customizes   |
| `draftsRoot`                | `<tmp>/gifd-drafts`               | Where draft worktrees live                    |
| `models.codegen`            | `claude-opus-4-7`                 | Model used for code generation                |
| `models.clarify`            | `claude-haiku-4-5`                | Model used for fast clarifying-question turns |
| `tokenBudget.perSessionUsd` | `5`                               | Hard cap on LLM spend per draft session, USD  |

## Pattern attribution

Plugin scaffolding pattern adapted from `extensions/diffs/` in OpenClaw. See `docs/groundwork/NOTICES.md` for full attribution.
