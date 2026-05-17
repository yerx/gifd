# Third-Party Attribution

This file records third-party open-source projects whose patterns, code, or designs have influenced gtfd. Inspiration alone (i.e., "we read it and re-implemented the idea") does not legally require attribution, but we list everything we learned from here for archaeology.

If we ever copy actual code (function bodies, schemas, config formats), the original license is preserved inline AND added to the "Code copied" section below.

## Patterns drawn from (inspiration only — no code copied)

### OpenClaw — https://github.com/openclaw/openclaw

- **License:** MIT
- **Snapshot referenced:** `445c7d050ad1e2be43f715cd683bbe870f1bc3b8` (2026-05-16) — see `~/Desktop/apps/_reference/openclaw/`
- **Patterns adopted (re-implemented from scratch in TS):**
  - Workspace-level prompt injection via convention files (`AGENTS.md` / `SOUL.md` / `TOOLS.md`)
  - Capability whitelisting per session (allow/deny enforced at the tool dispatch layer)
  - Sandboxed worktree-per-session for code-editing agents
  - Gateway-as-control-plane separation of concerns (sessions, channels, tools, events)

### Hermes Agent — https://github.com/NousResearch/hermes-agent

- **License:** MIT
- **Snapshot referenced:** `c7db6a58000c89b18717eef80e4842f114761fe9` (2026-05-15) — see `~/Desktop/apps/_reference/hermes-agent/`
- **Patterns adopted (re-implemented from scratch in TS):**
  - Post-task reflection → skill file generation
  - FTS5 SQLite session search with LLM summarization
  - Autonomous skill Curator (background grading/consolidation/pruning)
  - Profile pattern for multi-instance agent personalities

## Code copied (with preserved license)

_None yet._

When code is copied verbatim, add an entry here including:

- The file path in our repo where it landed
- The upstream source path + SHA
- The original MIT license text reproduced under the entry

## How to add an entry

If you copy code from one of the snapshots:

1. Add the source path + SHA as an inline comment in the file:
   ```ts
   // Adapted from openclaw/packages/gateway/src/sessions.ts at 445c7d05
   // Original MIT (c) OpenClaw — see docs/NOTICES.md
   ```
2. Add an entry to "Code copied" above with the destination path, source path/SHA, and the MIT license text.
3. If our adaptation diverges substantively, note "originally based on, since modified."
