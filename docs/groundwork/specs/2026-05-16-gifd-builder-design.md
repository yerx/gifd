# Gifd App-Builder — Design Spec (Phase A, V1)

> **Status:** Revised after senior review (2026-05-16). Pending user re-review before implementation plan.
> **Scope:** Implementation of `extensions/gifd-builder/`.
> **Predecessors:** `docs/groundwork/platform-design-checkpoint.md` (platform-level context).
> **Revision history:** See §12.

---

## 1. Goal

Build the **app-builder agent** that lets a user customize their personal Gifd apps from chat. V1 targets one app (GroundWork, our GTD-style productivity template) and one agent (`gifd-builder`). The agent:

1. Receives an intent in chat (e.g. _"Add a weekly review screen that shows what I completed this week, grouped by project."_)
2. Asks 1-5 clarifying questions
3. Creates a sandboxed draft branch of `apps/groundwork-web/`
4. Generates/edits code in the draft (full code generation in scope — new views, components, routes, behavior, schema migrations)
5. Builds the draft and verifies it compiles
6. Surfaces the draft to the user for testing
7. On Accept: atomically migrates schema + swaps live code; persists structured intent log entries
8. On Discard: cleans up draft; live is untouched

## 2. Scope

**In V1:**

- Single target app: `apps/groundwork-web` (Next.js + React + Tailwind)
- Single agent: `gifd-builder`
- Single user (you), hosted daemon model
- Models: Claude Opus 4.7 (codegen + planning), Claude Haiku 4.5 (clarifying turns)
- **Prompt caching required** on system prompt + read-only file context (per Anthropic best practice — caches 60-80% of input tokens across edit turns)
- Full code generation (no DSL ceiling on UI/behavior code)
- **Expand-only schema migrations** — DROP COLUMN / RENAME COLUMN / type-change rejected by accept-time auditor (the migrate-then-swap window cannot produce a destructive break). Destructive changes deferred to V1.5 with a 2-phase pattern.
- **Generated data access goes through a single typed repo module** (`apps/groundwork-server/src/db/repo.ts`) — this is the surface QueryAuditor inspects for the privacy gate (M4). Free-form SQL outside that module is denied at accept.
- One draft session at a time per user

**Out of V1** (each becomes its own sub-project later):

- Multi-app portfolio (#2)
- Per-user APIs (#3)
- Cross-user sharing (#4)
- External data integrations (HealthKit, OAuth APIs) (#1c)
- Self-host daemon path (Phase C)
- Multi-agent (scheduler, etc.)
- Skill auto-learning loop (Hermes-inspired, V1.5)
- Concurrent drafts per user

## 3. Architecture

### 3.1 What we use from OpenClaw (unchanged)

| Subsystem              | Source                                                 | What it provides                                                                                                       |
| ---------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Agent runtime          | `src/agents/` + `api.runtime.agent.runEmbeddedPiAgent` | Multi-turn embedded agent session; we invoke ONCE from our top-level tool handler; OpenClaw drives the autonomous loop |
| Gateway                | `src/gateway/`                                         | Control plane for sessions, channels, tools, events                                                                    |
| Sessions               | `src/sessions/`                                        | Per-session isolation, history, dirs                                                                                   |
| Plugin SDK             | `packages/plugin-sdk/`, `packages/sdk/`                | The integration surface we consume                                                                                     |
| Model providers        | `extensions/anthropic/`, `extensions/openai/`, etc.    | LLM calls (we use Anthropic)                                                                                           |
| Sandboxing primitives  | `src/agents/agent-scope.ts`, Docker/SSH options        | Capability whitelisting per session                                                                                    |
| Workspace prompt files | OpenClaw convention (`AGENTS.md`/`SOUL.md`/`TOOLS.md`) | System-prompt injection per workspace                                                                                  |
| Memory                 | `extensions/memory-core` (optional V1)                 | Cross-session memory (not load-bearing yet)                                                                            |
| Channel routing        | `src/channels/`, `src/routing/`                        | Where chat input arrives from                                                                                          |

### 3.2 What we add (`extensions/gifd-builder/`)

| Component                | File                            | Role                                                                                                                                         |
| ------------------------ | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Plugin entry             | `index.ts`                      | `definePluginEntry` default export                                                                                                           |
| Plugin manifest          | `openclaw.plugin.json`          | id, activation, contracts, configSchema                                                                                                      |
| Plugin registration      | `src/plugin.ts`                 | `registerGifdBuilderPlugin(api)`                                                                                                             |
| Config schema            | `src/config.ts`                 | Zod schema for groundworkRoot, draftsRoot, models, tokenBudget                                                                               |
| Agent definition         | `src/agent.ts`                  | System prompt + tool list + clarifying-question templates                                                                                    |
| Tool: read_schema        | `src/tools/read-schema.ts`      | Introspect SQLite schema with redaction allowlist                                                                                            |
| Tool: build_draft        | `src/tools/build-draft.ts`      | Run `next build` against draft worktree, return structured errors                                                                            |
| Tool: record_intent      | `src/tools/record-intent.ts`    | Append structured entry to `intents` SQLite table                                                                                            |
| Tool: draft_create       | `src/tools/draft-create.ts`     | `git worktree add` + SQLite snapshot                                                                                                         |
| Tool: draft_accept       | `src/tools/draft-accept.ts`     | Atomic pipeline (see §5.3)                                                                                                                   |
| Tool: draft_discard      | `src/tools/draft-discard.ts`    | Worktree removal + cleanup                                                                                                                   |
| Hook: before_tool_call   | `src/hooks/before-tool-call.ts` | Enforce draft-branch path boundary (glob whitelist for Read; strict for Write/Edit)                                                          |
| Hook: after_tool_call    | `src/hooks/after-tool-call.ts`  | Append code-change events to intent log; run post-edit exfiltration scan                                                                     |
| Draft engine             | `src/workspace.ts`              | Worktree + snapshot lifecycle                                                                                                                |
| Intent log               | `src/intent-log.ts`             | SQLite-backed event store (table `intents`)                                                                                                  |
| Query auditor            | `src/query-auditor.ts`          | Audit the single typed repo module (`apps/groundwork-server/src/db/repo.ts`); build consent prompt; reject SQL/ORM calls outside that module |
| Port pool                | `src/port-pool.ts`              | Allocate/release ports for per-draft Next.js + Express servers (pool: 3002-3010, 4002-4010); persisted in `drafts.port_*`                    |
| Schema migration auditor | `src/migration-auditor.ts`      | Reject DROP COLUMN / RENAME COLUMN / type changes (expand-only V1)                                                                           |
| Daemon recovery          | `src/recovery.ts`               | On daemon start, scan `drafts` table for stuck states (`accepting`, `validating`) and resume or roll back                                    |
| HTTP routes              | `src/http.ts`                   | `/plugins/gifd-builder/drafts/{id}/{accept,discard,status}`                                                                                  |
| Skill files              | `skills/*.md`                   | Workspace prompt-injection conventions (OpenClaw pattern)                                                                                    |

### 3.3 Process layout (Phase A hosted)

```
[Gifd daemon process (Node, OpenClaw runtime)]
  ├─ Channels (WebChat, future: iMessage/Slack/etc.)
  ├─ gifd-builder extension (this spec)
  │    └─ Tools, hooks, draft engine, intent log
  └─ Other OpenClaw extensions (model providers, memory, etc.)

[groundwork-web — Next.js dev server, port 3001]
  ↑ pointed at `apps/groundwork-web/` (LIVE) via symlink

[groundwork-server — Express, port 4001]
  ↑ owns the SQLite database the user's GroundWork app reads/writes

[Per-active-draft: groundwork-web dev server, port 3002+]
  ↑ pointed at `<draftsRoot>/<draftId>/web/` (the worktree)

[Per-active-draft: groundwork-server, port 4002+]
  ↑ pointed at `<draftsRoot>/<draftId>/data.sqlite` (the snapshot)
```

**Why per-draft Express servers:** each draft gets its own isolated server pointed at its own SQLite snapshot. No `?draftId=` parameter routing needed in `groundwork-server` — the server is the same code, just spawned with a different `--data-path` flag. Simpler, cleaner isolation, no shared-state risk between live and draft.

**Port allocation (M2):** Bounded pools — `3002-3010` for Next.js dev, `4002-4010` for Express. Allocator backed by `drafts.next_port` + `drafts.api_port` columns. On daemon start, recovery (see component table) reconciles allocated ports against running processes. Hard cap: 9 concurrent drafts per pool (V1 enforces 1 active draft per user; pool gives headroom for cleanup races).

**Memory budget per active draft (M1):** ~600 MB-1.2 GB (Next.js dev ~500-1000 MB + Express ~50-100 MB + Node overhead). Hosted daemon sizing assumption: at least 4 GB RAM headroom above the daemon's own footprint. Caps documented per environment.

**Critical isolation invariants:**

1. The agent's filesystem scope is strictly `<draftsRoot>/<draftId>/`. Enforced by:
   - `cwd` passed to all file tools
   - PreToolUse hook double-check on Write/Edit paths
2. The agent cannot edit:
   - `extensions/gifd-builder/` itself (its own code)
   - `src/` (OpenClaw core)
   - `apps/ios/`, `apps/macos/`, `apps/android/`
   - The live `apps/groundwork-web/` directly (only via draft → accept)
3. The agent has no tool that reads user data rows. `read_schema` returns schema only.

## 4. Privacy & Consent (runtime-enforced)

Privacy is a **runtime guarantee**, not a draft-time guarantee. The agent writes the query layer, so it influences what runtime queries do. **Three-layer** protection (revised from 2 after review):

### 4.1 Schema-read redaction (input side)

`read_schema` filters its output through an allowlist. Hidden by default:

- Any table or column matching `^secret|token|password|api_key`
- Any column suffix `_body` or `_content` if longer than 1024 chars (notes/journals)
- Any column explicitly marked `private: true` in the schema migration

The agent literally doesn't see these columns. If it asks "what's in tasks.notes," the answer is "you don't have access; ask the user to grant a per-draft permission."

### 4.2 Typed repo module — the only audited surface

All agent-generated data access flows through **one typed repository module** at `apps/groundwork-server/src/db/repo.ts`. The agent generates code that calls `repo.tasksForWeek(...)`, `repo.projectsByDomain(...)`, etc. — never raw SQL strings in components, route handlers, or business logic.

QueryAuditor inspects ONLY this file at accept time. Coverage is 100% by construction. The PreToolUse hook (§7.6) denies `Write`/`Edit` on any file containing SQL string literals or DB-client method calls outside `repo.ts`.

If the agent needs a new query, it adds a method to `repo.ts` AND calls it from the consumer code. The auditor sees the new method, surfaces the columns it touches.

**This is a meaningful architectural constraint on the codebase.** Today's GroundWork doesn't fully follow it. Slice 0/1 of implementation includes refactoring GroundWork's existing data access into `repo.ts`.

### 4.3 Query auditing on accept (output side)

`QueryAuditor` parses `repo.ts` using a real AST visitor (Babel for ORM calls + `node-sql-parser` if any raw SQL is used). Produces a structured "this change reads {table.column…}" report. Default-deny on any unparseable pattern.

Presented to user as a consent prompt:

> _This change adds code that reads `tasks.notes`. Approve?_

User can:

- **Approve** — query added to the per-draft allowlist; accept proceeds
- **Approve always** — column moved off the `private` allowlist for future sessions
- **Deny** — accept blocked; user can ask agent to rewrite without that field

### 4.4 Content exfiltration scan (added after C6)

The agent has `Read` access to `apps/groundwork-web/` (live) and `packages/groundwork-shared/` for style/type reference. The `after_tool_call` hook scans every `Write`/`Edit` payload for content that looks copied from a file the agent recently read (large literal blocks matching recently-read content, .env-style key=value runs, base64-looking strings). Hits are blocked with a denial reason. Threat model: prompt injection in user-generated content trying to exfiltrate secrets via the generated code.

### 4.5 Read path whitelist (replaces "directory allowlist")

`Read`/`Glob`/`Grep` paths are matched against an **explicit glob whitelist** (not a directory allowlist). Allowed:

- `<draftsRoot>/<draftId>/**` — full draft access
- `apps/groundwork-web/**/*.{tsx,ts,css,json,md}` — style reference
- `packages/groundwork-shared/src/**/*.ts` — shared types
- `package.json`, `tsconfig*.json` at draft root only

Explicitly denied (even though some are in allowed parent dirs):

- `.env*`, `.envrc`, `.npmrc`, `*.pem`, `*.key`
- `**/fixtures/**`, `**/__snapshots__/**`
- `*.sqlite*`, `*.db*`
- `**/*.test.*` data, `node_modules/**`, `dist/**`, `.next/**`

**Why this matters:** prompt injection in user-generated content (e.g., a maliciously crafted task title) could otherwise influence what generated code reads or copies. Layers 4.1-4.5 are a defense-in-depth gate.

## 5. The draft sandbox model

### 5.1 Draft creation

```
draft_create(targetApp = "groundwork-web") =>
  1. Generate ULID draftId
  2. Record current live HEAD SHA → drafts.base_sha (for drift detection at accept; C7)
  3. git worktree add <draftsRoot>/<draftId>/web HEAD     // git-aware worktree, hardlinked
  4. Snapshot SQLite via SQLite backup API (M7):
       - PRAGMA wal_checkpoint(TRUNCATE) on live DB first
       - sqlite3_backup_init → step → finish → <draftsRoot>/<draftId>/data.sqlite
       - Snapshot opened in WAL mode (same as live) to match runtime semantics
  5. Allocate ports from pool → drafts.next_port, drafts.api_port
  6. Spawn next dev server scoped to the worktree on next_port
  7. Spawn groundwork-server scoped to the snapshot on api_port
  8. Insert row in drafts(id, target_app, status="active", base_sha, next_port, api_port, created_at)
  9. Return draftId + draft_url
```

**Why not APFS clonefile:** SQLite in WAL mode has three files (`.sqlite`, `.sqlite-wal`, `.sqlite-shm`). `clonefile` is per-file; cloning only `data.sqlite` while WAL is non-empty produces a snapshot missing recent committed writes. SQLite's backup API is the right primitive — it accounts for WAL, handles concurrent writers, and is portable.

### 5.2 Live data continues during the session

The user's real GroundWork app keeps receiving writes through the session. The draft sees a frozen snapshot. Writes the user makes inside the draft (test data) are discarded on accept or discard.

### 5.3 Accept pipeline (atomicity invariant)

The accept operation is the load-bearing guarantee of the system. Revised after review (C5, C7) — the migrate-then-swap window can produce real broken state if migrations are destructive, so we enforce expand-only at validation and add drift detection.

```
draft_accept(draftId) =>
  1. validate_draft:
       a. Live-drift check (C7):
          if git rev-parse HEAD on apps/groundwork-web/ != drafts.base_sha:
             → reject accept; surface "live moved; rebase draft or discard"
       b. MigrationAuditor: compute schema diff live→draft
          if any DROP COLUMN / RENAME COLUMN / type-change:
             → reject accept; surface "expand-only V1; reshape change as additive"
       c. Run `next build` against worktree (final guard)
       d. Run QueryAuditor on apps/groundwork-server/src/db/repo.ts (the typed surface)
          → present consent UI → user clears or rejects
       e. Mark drafts.status = "validating"
     (any failure here: nothing modified, draft preserved, status reset to "active")

  2. Mark drafts.status = "accepting"

  3. BEGIN TRANSACTION on live SQLite

  4. apply_migration:
       Apply additive migrations (CREATE TABLE / ADD COLUMN nullable / CREATE INDEX)
       All migrations safe to run while old code is serving (old code ignores new columns)

  5. append_intents:
       Insert all draft's intent rows into live `intents` table
       Mark drafts.status_pending_swap = TRUE (durable marker for daemon-restart recovery)

  6. COMMIT TRANSACTION
     ← data layer is now forward; old code still tolerates because migrations are expand-only

  7. fs_swap:
       Atomic symlink swap: apps/groundwork-web → releases/<releaseId>/
       (uses rename(2); atomic on local FS)

  8. reload:
       SIGUSR2 to live groundwork-web Next.js process to pick up symlink target

  9. mark_accepted:
       drafts.status = "accepted"
       drafts.status_pending_swap = FALSE

  10. cleanup:
        Remove worktree (git worktree remove + git worktree prune)
        Remove snapshot, release port allocations
        (best-effort; janitor reconciles)
```

**Why the expand-only constraint matters:** between COMMIT (step 6) and reload (step 8) is a brief window where the live DB is on the new schema and the live Next.js process is serving old code. With expand-only changes, the old code's queries still work — it just doesn't reference the new columns/tables. No 500s, no user-visible breakage. The window is "consistent and serving" — not just "degraded."

**Failure handling per step:**

| Step  | Failure                                        | Recovery                                                                                                                                                                        |
| ----- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1a    | Live drift detected                            | Reject; user discards or rebases worktree (rebase = `git pull` in worktree + re-run validation)                                                                                 |
| 1b    | Destructive migration                          | Reject; user reshapes change as additive or defers to V1.5                                                                                                                      |
| 1c-1d | Build / consent fail                           | Nothing modified; draft preserved; status reset to "active"                                                                                                                     |
| 3-6   | Transaction fails                              | ROLLBACK; live untouched; status reset to "active"                                                                                                                              |
| 7     | Symlink swap fails (rare — `rename` is atomic) | Migration committed (forward) + code on previous release. **Because migrations are expand-only, the old code continues serving correctly.** Retry symlink; alert if persistent. |
| 8     | Reload signal fails                            | Non-fatal; next request picks up the new target                                                                                                                                 |
| 9-10  | Cleanup fails                                  | Janitor job retries; not fatal. `drafts.status_pending_swap` lets daemon recovery (§3.2 component) finish a partial accept on restart.                                          |

### 5.4 Discard

```
draft_discard(draftId) =>
  - Kill the draft's Next.js dev server
  - git worktree remove <draftsRoot>/<draftId>/web --force
  - rm <draftsRoot>/<draftId>/data.sqlite
  - Mark drafts.status = "discarded"
```

Live is untouched. No transaction. Idempotent.

## 6. The agent loop (revised after C2)

`gifd-builder` registers one user-facing tool — `gifd_builder` — via `api.registerTool`. The handler invokes **`api.runtime.agent.runEmbeddedPiAgent({...})`** exactly once per user intent. OpenClaw drives the autonomous multi-turn loop (clarify → plan → edit → build → respond). We do not orchestrate turns ourselves.

This is the correct primitive — confirmed against `extensions/skill-workshop/src/reviewer.ts:251` and `extensions/google-meet/src/agent-consult.ts:61`, which both use `runEmbeddedPiAgent` for the same shape of problem.

### 6.1 Top-level tool handler

```typescript
// src/agent.ts (sketch)
api.registerTool((ctx) => createGifdBuilderTool({ api, ctx }), { name: "gifd_builder" });

// Handler invokes the embedded agent
async function runBuilderSession({ api, ctx, intent }) {
  const session = await api.runtime.agent.runEmbeddedPiAgent({
    sessionId: `gifd-builder-${ulid()}`,
    sessionKey: ctx.sessionKey,
    agentId: ctx.agentId,
    messageProvider: ctx.messageProvider,
    messageChannel: ctx.channelId,
    sessionFile: path.join(stateDir, "gifd-builder", `${sessionId}.json`),
    workspaceDir: ctx.workspaceDir,
    agentDir: api.runtime.agent.resolveAgentDir(api.config, ctx.agentId),
    config: api.config,
    prompt: buildSystemPrompt({ intent, workspaceFiles }),
    provider: "anthropic",
    model: pluginConfig.models.codegen, // claude-opus-4-7 by default
    fallbackModel: pluginConfig.models.clarify, // claude-haiku-4-5 for cheap turns
    timeoutMs: 15 * 60 * 1000, // 15 min hard ceiling
    runId: sessionId,
    trigger: "user",
    toolsAllow: TOOLSET, // see §6.3
    bootstrapContextMode: "lightweight",
    verboseLevel: "low",
    reasoningLevel: "medium",
    promptCaching: {
      // C4: required (added)
      systemPrompt: "ephemeral",
      readFileResults: "ephemeral",
    },
    taskBudget: {
      // C3: $15 default
      maxUsd: pluginConfig.tokenBudget.perSessionUsd,
    },
  });
  return summarize(session);
}
```

### 6.2 Expected agent behavior (driven by system prompt, not orchestrated)

The system prompt instructs the agent to:

1. **Clarify if needed** (skippable) — emit 0-5 questions before proceeding; if intent is fully specified, skip
2. **Plan** — read schema (`read_schema`), read existing similar code (`Glob`/`Read` scoped per §4.5), output a short plan in chat
3. **Create draft** — call `draft_create`
4. **Edit** — call `Write`/`Edit` for new components/views/routes; add to `repo.ts` for any new data access (§4.2)
5. **Build** — call `build_draft`. On structured errors, self-correct. Hard ceiling: 3 retries (configurable). On exhaustion, surface structured error report to user (M6: see §6.4)
6. **Respond** — final chat message: short summary + inline action buttons `[Open Draft] [Accept] [Discard]`

The "turn" structure is descriptive, not prescriptive. The agent uses tools as the system prompt directs.

### 6.3 Tool allowlist (`TOOLSET`)

```typescript
const TOOLSET = [
  // OpenClaw built-ins (scoped by before_tool_call hook per §7.6):
  "Read",
  "Write",
  "Edit",
  "Glob",
  "Grep",
  // Our custom tools:
  "gifd_builder:read_schema",
  "gifd_builder:build_draft",
  "gifd_builder:record_intent",
  "gifd_builder:draft_create",
  // draft_accept / draft_discard are NOT exposed to the agent.
  // They're invoked by the HTTP route handlers triggered by the
  // user's Accept / Discard button taps.
];
```

### 6.4 `build_draft` structured error contract (M6)

When `next build` fails, `build_draft` returns:

```typescript
type BuildResult =
  | { ok: true; durationMs: number; bundleStats: {...} }
  | {
      ok: false;
      durationMs: number;
      errors: Array<{
        file: string;             // path relative to draft worktree
        line: number;
        column: number;
        category: "ts" | "lint" | "next-routing" | "module-not-found" | "other";
        message: string;          // 1-line summary
        diagnostic: string;       // full diagnostic, capped at 4 KB
      }>;
      mostLikelyCause: string;    // heuristic summary for the agent
    };
```

The agent reads `mostLikelyCause` first to plan the fix. Cap on retries = 3; after exhaustion, the agent surfaces a chat message:

> _"I couldn't get this to build after 3 attempts. Here's what I tried: [3 bullet summaries]. The remaining error is in `path/to/file.tsx:42` — can you help, or want me to discard?"_

### 6.5 Cancellation

User sending a new chat message mid-session triggers OpenClaw's `subagent_ended` hook on the embedded session. Our top-level tool handler observes this and returns. **Draft state survives** — the worktree, snapshot, and port allocations are intact for the next session to pick up (or for explicit discard).

### 6.6 Token budget (revised after C3)

Default: **$15 USD per session** (was $5). Rationale: realistic codegen sessions at Opus 4.7 pricing ($5/M input, $25/M output) with output-heavy turns + retries can hit $1-3 per session uncached. Prompt caching (§6.1) reduces input cost 60-80% across turns, but extended reasoning + retries still consume output. $15 gives headroom for the medium-difficulty changes that the agent will need to be useful, without giving runaway sessions free rein.

When the cap fires:

- Embedded agent halts mid-turn
- Top-level tool handler sees a partially-completed draft
- Surfaces to user: _"Hit token budget. Draft is in [state]. Increase budget by $10 / discard / accept-as-is?"_
- Draft worktree + snapshot preserved either way

## 7. Components — detail

### 7.1 Plugin manifest (`openclaw.plugin.json`)

Already scaffolded; complete contents in the existing file. Key fields:

- `"id": "gifd-builder"`
- `"activation": { "onStartup": true }`
- `"contracts": { "tools": ["gifd_builder"] }`
- `configSchema`: groundworkRoot, draftsRoot, models, tokenBudget

### 7.2 `src/agent.ts`

Defines the `gifd_builder` tool registration. Composes the per-turn system prompts. Pulls workspace `AGENTS.md`/`SOUL.md`/`TOOLS.md` if present and concatenates into the system prompt (OpenClaw pattern).

### 7.3 `src/workspace.ts`

`DraftEngine` class with methods:

- `create(targetApp): Promise<DraftHandle>`
- `accept(draftId): Promise<AcceptResult>`
- `discard(draftId): Promise<void>`
- `getActive(): DraftHandle | null` (V1 supports one active draft per user)
- `getById(draftId): DraftHandle | null`

`DraftHandle` exposes: `{ id, targetApp, path, snapshotPath, port, createdAt }`.

### 7.4 `src/intent-log.ts` (revised after M3)

SQLite-backed event store. Schema includes versioning + query-targeted indexes:

```sql
CREATE TABLE intents (
  id TEXT PRIMARY KEY,                    -- ULID
  user_id TEXT NOT NULL DEFAULT 'local',  -- 'local' sentinel for V1 (single user); real user IDs in #3
  draft_id TEXT NOT NULL,
  kind TEXT NOT NULL,                     -- 'clarify_qa' | 'plan' | 'file_write' | 'file_edit' | 'migration' | 'accept' | 'discard' | 'consent_grant'
  schema_version INTEGER NOT NULL,        -- per-kind payload schema version; bumped when payload shape changes
  target_app TEXT NOT NULL,
  payload_json TEXT NOT NULL,             -- discriminated union per (kind, schema_version)
  -- Generated columns indexed for the hot query patterns:
  payload_target_table TEXT GENERATED ALWAYS AS (json_extract(payload_json, '$.targetTable')) STORED,
  payload_route TEXT GENERATED ALWAYS AS (json_extract(payload_json, '$.route')) STORED,
  created_at TEXT NOT NULL                -- ISO 8601
);
CREATE INDEX idx_intents_draft ON intents(draft_id);
CREATE INDEX idx_intents_user_created ON intents(user_id, created_at);
CREATE INDEX idx_intents_kind_target ON intents(kind, payload_target_table);
CREATE INDEX idx_intents_route ON intents(payload_route) WHERE payload_route IS NOT NULL;
```

**Payload schemas** are TypeScript discriminated unions in `src/intent-log.ts`, one per `(kind, schema_version)` pair. New payload shape = new `schema_version`; old rows readable forever.

**Query patterns this serves:**

- "What intents touched `tasks.notes`?" → `WHERE kind='file_write' AND payload_target_table='tasks'`
- "What's the most recent change to the weekly-review route?" → `WHERE payload_route='/weekly-review' ORDER BY created_at DESC`
- "Reconstruct a draft's history" → `WHERE draft_id=? ORDER BY created_at`
- "Export this app's customization history for sharing (#3-#4)" → all rows for `target_app`, with deterministic schema versioning

Inserted in the same transaction as schema migrations on accept (so code and log can't drift). Export to JSONL is available via a script but not the source of truth.

### 7.5 `src/query-auditor.ts` (revised after M4)

QueryAuditor inspects ONLY the typed repo module (`apps/groundwork-server/src/db/repo.ts`). This is the architectural commitment from §4.2: agent-generated data access is constrained to this surface, so 100% coverage is achievable.

Functions:

- `parseRepoModule(filePath): RepoQueryRef[]` — Babel AST visitor extracts:
  - Method signatures: `tasksForWeek(domainId): Task[]` → `{ method: 'tasksForWeek', tables: ['tasks'], columns: extracted from method body }`
  - Embedded SQL: `node-sql-parser` over any tagged-template SQL strings
  - ORM patterns: known shapes from `better-sqlite3` `.prepare(...)` + `.run/all/get`
- `diffRepoModule(beforeFile, afterFile): { added: RepoQueryRef[], removed: RepoQueryRef[], changed: RepoQueryRef[] }`
- `summarizeForConsent(diff): ConsentPrompt` — "this change reads X, Y, Z" with table/column granularity

**Default-deny:** any unparseable construct (string concatenation in SQL, dynamic property access on the DB client, `eval`, etc.) is treated as **unauthorized**. Accept blocked with a denial reason: "auditor cannot statically verify queries in `repo.ts`; rewrite to use the typed methods or `prepare(...)` with literal SQL."

**Cross-file enforcement:** the `before_tool_call` hook (§7.6) denies `Write`/`Edit` to files outside `repo.ts` that contain SQL string literals or DB-client method calls. This is a static-time gate; the auditor is the accept-time gate.

### 7.6 Hooks (revised after C1, C6)

OpenClaw's canonical hook names are `before_tool_call` / `after_tool_call` (per `src/plugins/hook-types.ts:87-126`). Registered via `api.on("hook_name", handler)`. Earlier draft used the Claude-Code-SDK names (`PreToolUse`/`PostToolUse`) — fixed.

**`before_tool_call` (`src/hooks/before-tool-call.ts`)** — fires before any tool call:

- For `Write`/`Edit` with a path argument:
  - Resolve absolute path; verify it's inside `<draftsRoot>/<draftId>/`. Deny if not.
  - **Additional check (M4 cross-file):** if the file is outside `apps/groundwork-server/src/db/repo.ts` within the draft, scan the new content for SQL string literals or DB-client method calls. If found, deny — "all data access must go through repo.ts."
- For `Read`/`Glob`/`Grep`: match the path against the **explicit glob whitelist** (§4.5). Reject anything not on the whitelist, including paths in allowed parent dirs that hit the deny rules (`.env*`, `**/fixtures/**`, `*.sqlite*`, etc.).
- For `read_schema`: pass through (already filters via §4.1 allowlist).
- Return shape: `{ block: true, blockReason: "..." }` to deny (per `extensions/anthropic/...`'s pattern); empty object/return to pass.

**`after_tool_call` (`src/hooks/after-tool-call.ts`)** — fires after any tool call returns:

- For `Write`/`Edit` in a draft: insert intent log row `{ kind: 'file_write', schema_version: 1, payload: { path, before_size, after_size, content_hash, route?: string, targetTable?: string } }`.
- **Content exfiltration scan (C6):** for `Write`/`Edit` payloads, scan content against the last N read-file results in this session. If a substring ≥256 chars matches a file read from outside the draft (e.g., copied from live `groundwork-web/.env.local.example` or `packages/groundwork-shared/fixtures/`), block with denial reason. Implementation: rolling hash on read-file buffers, content scan with size threshold.

### 7.7 HTTP routes

OpenClaw extensions can register HTTP routes scoped to `/plugins/<id>/`. We add:

- `GET /plugins/gifd-builder/drafts/{id}/status` — current state, last build, last error
- `POST /plugins/gifd-builder/drafts/{id}/accept` — triggers accept pipeline; streams progress
- `POST /plugins/gifd-builder/drafts/{id}/discard` — triggers discard
- `GET /plugins/gifd-builder/drafts/{id}/queries` — for the consent UI

All auth via OpenClaw's plugin auth contract.

## 8. Testing strategy

| Layer       | What we test                                               | Tool                               |
| ----------- | ---------------------------------------------------------- | ---------------------------------- |
| Unit        | DraftEngine (create/accept/discard/recovery)               | Vitest                             |
| Unit        | QueryAuditor (parse, diff, consent summary)                | Vitest                             |
| Unit        | Schema redaction filter                                    | Vitest                             |
| Unit        | PreToolUse hook boundary enforcement                       | Vitest                             |
| Integration | Accept pipeline atomicity (failure injection at each step) | Vitest + tmp dirs                  |
| Integration | Full agent loop with mocked LLM                            | Vitest + Anthropic SDK mock        |
| E2E         | "Add weekly review" happy path                             | Playwright (groundwork-web/tests/) |
| Manual      | Actual LLM behavior (codegen quality)                      | Not automated                      |

**Failure-injection cases** (the load-bearing tests):

- Build fails mid-accept → live untouched, draft preserved
- Migration fails mid-transaction → ROLLBACK, live untouched
- Symlink swap fails after commit → live DB on new schema + code on old release → recoverable retry
- Process crash mid-accept → on restart, drafts.status = "accepting" detected; resume or rollback

**Coverage target V1:** 80% on src/workspace.ts + src/intent-log.ts + accept pipeline (the load-bearing surface). Lower elsewhere is acceptable.

## 9. Open questions / decisions deferred

1. **`agent.ts` clarifying-question authoring style** — wizard-like (always asks 3-5) vs adaptive (sometimes 0, sometimes more). V1: start adaptive, let the system prompt do the work, iterate based on UX.

2. **Draft preview surface in the OpenClaw iOS app** — does it open in WebView, browser, or a native preview? Deferred; resolves when iOS customization spec is written.

3. **Intent log retention policy** — Forever? 90 days? V1: keep forever, revisit when storage is a problem.

4. **`groundwork-server` per-draft snapshot serving** — resolved: each draft gets its own `groundwork-server` process on its own port, pointed at its own SQLite snapshot via a `--data-path` flag. No shared-server routing complexity. Considered `?draftId=` query routing on a single shared server but rejected as fragile (shared connection pool, easier to leak between drafts).

5. **Token budget on a per-user, not per-session, basis** — V1 is per-session ($15, revised after C3). A per-user monthly cap is reasonable later but out of V1.

6. **Skill files in `skills/`** — V1 ships empty `skills/` directory (OpenClaw convention). Skill auto-learning is V1.5 work.

## 10. Pattern attribution

Adapted from snapshots in `~/Desktop/apps/_reference/`:

- **OpenClaw `extensions/diffs/`** — plugin SDK shape, tool registration, HTTP routes pattern
- **OpenClaw `src/agents/agent-scope.ts`** — capability whitelisting concept (we apply to tool paths)
- **OpenClaw workspace prompt files** (`AGENTS.md`/`SOUL.md`/`TOOLS.md` convention) — system-prompt injection layer
- **Hermes Agent `agent/skills/` + Autonomous Curator** — skill-from-experience pattern (deferred to V1.5; noted here for planning)

See `docs/groundwork/NOTICES.md` for full attribution policy. No code copied verbatim from either repo — patterns only.

## 11. Implementation plan (high-level, revised after m5)

The detailed implementation plan lives in the writing-plans flow that follows this spec. High-level order:

0. **Slice 0 — `repo.ts` refactor + daemon recovery** (preconditions)
   - Refactor GroundWork's existing data access into `apps/groundwork-server/src/db/repo.ts` (the audited surface §4.2)
   - Implement daemon-restart recovery (`src/recovery.ts`): scan `drafts` table for stuck statuses on boot, reconcile or rollback
   - Implement port pool (`src/port-pool.ts`) with persistent allocation in `drafts`
1. **Slice 1 — DraftEngine + intent log + accept pipeline** (the load-bearing core)
   - `src/workspace.ts` create/discard/accept logic with SQLite backup API (M7)
   - `src/intent-log.ts` with versioned payloads (M3)
   - MigrationAuditor (expand-only enforcement, C5)
   - Drift detection (C7)
   - Tested via failure-injection at each accept step, no agent involvement
2. **Slice 2 — Custom tools** (read_schema, build_draft with structured errors per M6, record_intent, draft_create)
3. **Slice 3 — Hooks** (`before_tool_call`, `after_tool_call`) — boundary + intent log + content exfiltration scan (C6)
4. **Slice 4 — QueryAuditor + consent UI** — Babel AST + node-sql-parser on `repo.ts`; default-deny on unparseable (M4)
5. **Slice 5 — Agent loop** (`runEmbeddedPiAgent` integration per §6) — happens AFTER hooks + auditor so end-to-end tests run the real privacy path
6. **Slice 6 — HTTP routes** (drafts/{id}/accept|discard|status|queries)
7. **Slice 7 — End-to-end test on one real customization** (the "Add weekly review" walkthrough)

Each slice is independently testable. **Slice 1 is the load-bearing slice** — if accept atomicity or expand-only enforcement is wrong, everything else is built on sand. Slice 0 is a precondition because the `repo.ts` refactor must land before Slice 4 can audit anything meaningful, and daemon recovery must exist before we ever leave the daemon running with a draft mid-flight.

## 12. Revision history

- **2026-05-16 (initial draft)** — 11 sections, hosted-only Phase A scope, two-layer privacy, draft sandbox model
- **2026-05-16 (after senior review)** — 7 Critical + 7 Major findings addressed inline:
  - **C1:** Hook names corrected to OpenClaw canonical (`before_tool_call`/`after_tool_call`)
  - **C2:** Agent loop reframed around `runEmbeddedPiAgent`; we invoke once, OpenClaw drives autonomous turns
  - **C3:** Token budget raised from $5 → $15 per session; rationale added in §6.6
  - **C4:** Prompt caching now required (§6.1); rationale in §2 and §6.6
  - **C5:** Expand-only migration constraint adopted; MigrationAuditor enforces; "consistent and serving" window claim now accurate
  - **C6:** Read path enforcement upgraded to explicit glob whitelist; content exfiltration scan added to `after_tool_call`
  - **C7:** Live-drift detection added to accept pipeline (`drafts.base_sha` vs current live HEAD)
  - **M1-M2:** Memory budget per draft + port pool scheme documented in §3.3
  - **M3:** Intent log schema gained `schema_version` + indexed generated columns
  - **M4:** Typed repo module commitment (`repo.ts` as the single audited surface); QueryAuditor reframed
  - **M5:** Implementation plan reordered (auditor before agent loop); added Slice 0 for preconditions
  - **M6:** Structured `BuildResult` contract in §6.4
  - **M7:** SQLite backup API as primary snapshot mechanism (not clonefile fallback)
  - **Minor:** `user_id 'local'` sentinel, `auth: "plugin"` documented, daemon recovery + `git worktree prune` janitor
