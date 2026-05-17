# Gifd App-Builder — Design Spec (Phase A, V1)

> **Status:** Draft pending user review.
> **Scope:** Implementation of `extensions/gifd-builder/`.
> **Predecessors:** `docs/groundwork/platform-design-checkpoint.md` (platform-level context).

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
- Full code generation (no DSL ceiling)
- Schema migrations allowed
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

| Subsystem              | Source                                                 | What it provides                                    |
| ---------------------- | ------------------------------------------------------ | --------------------------------------------------- |
| Agent runtime          | `src/agents/`                                          | LLM tool-use loop, streaming, session state         |
| Gateway                | `src/gateway/`                                         | Control plane for sessions, channels, tools, events |
| Sessions               | `src/sessions/`                                        | Per-session isolation, history, dirs                |
| Plugin SDK             | `packages/plugin-sdk/`, `packages/sdk/`                | The integration surface we consume                  |
| Model providers        | `extensions/anthropic/`, `extensions/openai/`, etc.    | LLM calls (we use Anthropic)                        |
| Sandboxing primitives  | `src/agents/agent-scope.ts`, Docker/SSH options        | Capability whitelisting per session                 |
| Workspace prompt files | OpenClaw convention (`AGENTS.md`/`SOUL.md`/`TOOLS.md`) | System-prompt injection per workspace               |
| Memory                 | `extensions/memory-core` (optional V1)                 | Cross-session memory (not load-bearing yet)         |
| Channel routing        | `src/channels/`, `src/routing/`                        | Where chat input arrives from                       |

### 3.2 What we add (`extensions/gifd-builder/`)

| Component           | File                         | Role                                                              |
| ------------------- | ---------------------------- | ----------------------------------------------------------------- |
| Plugin entry        | `index.ts`                   | `definePluginEntry` default export                                |
| Plugin manifest     | `openclaw.plugin.json`       | id, activation, contracts, configSchema                           |
| Plugin registration | `src/plugin.ts`              | `registerGifdBuilderPlugin(api)`                                  |
| Config schema       | `src/config.ts`              | Zod schema for groundworkRoot, draftsRoot, models, tokenBudget    |
| Agent definition    | `src/agent.ts`               | System prompt + tool list + clarifying-question templates         |
| Tool: read_schema   | `src/tools/read-schema.ts`   | Introspect SQLite schema with redaction allowlist                 |
| Tool: build_draft   | `src/tools/build-draft.ts`   | Run `next build` against draft worktree, return structured errors |
| Tool: record_intent | `src/tools/record-intent.ts` | Append structured entry to `intents` SQLite table                 |
| Tool: draft_create  | `src/tools/draft-create.ts`  | `git worktree add` + SQLite snapshot                              |
| Tool: draft_accept  | `src/tools/draft-accept.ts`  | Atomic pipeline (see §5.3)                                        |
| Tool: draft_discard | `src/tools/draft-discard.ts` | Worktree removal + cleanup                                        |
| Hook: PreToolUse    | `src/hooks/pre-tool-use.ts`  | Enforce draft-branch path boundary + redaction allowlist          |
| Hook: PostToolUse   | `src/hooks/post-tool-use.ts` | Append code-change events to intent log                           |
| Draft engine        | `src/workspace.ts`           | Worktree + snapshot lifecycle                                     |
| Intent log          | `src/intent-log.ts`          | SQLite-backed event store (table `intents`)                       |
| Query auditor       | `src/query-auditor.ts`       | Parse new SQL/ORM calls in generated code; build consent prompt   |
| HTTP routes         | `src/http.ts`                | `/plugins/gifd-builder/drafts/{id}/{accept,discard,status}`       |
| Skill files         | `skills/*.md`                | Workspace prompt-injection conventions (OpenClaw pattern)         |

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

Privacy is a **runtime guarantee**, not a draft-time guarantee. The agent writes the query layer, so it influences what runtime queries do. Two-layer protection:

### 4.1 Schema-read redaction (input side)

`read_schema` filters its output through an allowlist. Hidden by default:

- Any table or column matching `^secret|token|password|api_key`
- Any column suffix `_body` or `_content` if longer than 1024 chars (notes/journals)
- Any column explicitly marked `private: true` in the schema migration

The agent literally doesn't see these columns. If it asks "what's in tasks.notes," the answer is "you don't have access; ask the user to grant a per-draft permission."

### 4.2 Query auditing on accept (output side)

Before accept, `QueryAuditor` parses queries in agent-generated code (SQL strings + ORM call patterns) and produces a structured "this change reads {table.column…}" report. Presented to user as a consent prompt:

> _This change adds code that reads `tasks.notes`. Approve?_

User can:

- **Approve** — query added to the per-draft allowlist; accept proceeds
- **Approve always** — query added to the schema's `private` flag override
- **Deny** — accept blocked; user can ask agent to rewrite without that field

**Why this matters:** prompt injection in user-generated content (e.g., a maliciously crafted task title) could otherwise influence what generated code SELECTs. The auditor adds a deliberate user-in-the-loop gate.

## 5. The draft sandbox model

### 5.1 Draft creation

```
draft_create(targetApp = "groundwork-web") =>
  1. Generate ULID draftId
  2. git worktree add <draftsRoot>/<draftId>/web HEAD     // git-aware worktree, hardlinked
  3. Snapshot SQLite via APFS clonefile (fallback: sqlite backup API)
     → <draftsRoot>/<draftId>/data.sqlite
  4. Spawn next dev server scoped to the worktree on port 3002+
  5. Insert row in drafts(id, target_app, status="active", created_at, port, …)
  6. Return draftId + draft_url
```

### 5.2 Live data continues during the session

The user's real GroundWork app keeps receiving writes through the session. The draft sees a frozen snapshot. Writes the user makes inside the draft (test data) are discarded on accept or discard.

### 5.3 Accept pipeline (atomicity invariant)

The accept operation is the load-bearing guarantee of the system.

```
draft_accept(draftId) =>
  1. validate_draft:
       - Run `next build` against worktree (final guard)
       - Run QueryAuditor → present consent UI → user clears or rejects
     (any failure here: nothing modified, draft preserved)

  2. BEGIN TRANSACTION on live SQLite

  3. apply_migration:
       Compute schema diff from live → draft
       Apply migrations in transaction

  4. append_intents:
       Insert all draft's intent rows into live `intents` table

  5. COMMIT TRANSACTION
     ← POINT OF NO RETURN for data layer

  6. fs_swap:
       Atomic symlink swap: apps/groundwork-web → releases/<releaseId>/
     (uses rename(2); atomic on local FS)

  7. reload:
       SIGUSR2 to live groundwork-web Next.js process to pick up symlink target

  8. cleanup:
       Remove worktree + snapshot + draft port allocation
       Mark drafts.status = "accepted"
```

**Failure handling per step:**

| Step | Failure                                        | Recovery                                                                                                                                                                         |
| ---- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Build fails / user denies consent              | Nothing modified; draft preserved; agent can retry                                                                                                                               |
| 2-5  | Migration fails or transaction aborts          | ROLLBACK; live untouched; draft preserved                                                                                                                                        |
| 6    | Symlink swap fails (rare — `rename` is atomic) | Migration committed but symlink not swapped → retry symlink; if persistently failing, alert. State is consistent (live DB on new schema, code on previous release) but degraded. |
| 7    | Reload signal fails                            | Non-fatal; next request picks up the new target                                                                                                                                  |
| 8    | Cleanup fails                                  | Janitor job retries; not fatal                                                                                                                                                   |

### 5.4 Discard

```
draft_discard(draftId) =>
  - Kill the draft's Next.js dev server
  - git worktree remove <draftsRoot>/<draftId>/web --force
  - rm <draftsRoot>/<draftId>/data.sqlite
  - Mark drafts.status = "discarded"
```

Live is untouched. No transaction. Idempotent.

## 6. The agent loop

`gifd-builder` exposes one user-facing tool — `gifd_builder` — that wraps the full loop. When invoked from chat, the loop runs as a single LLM session with multiple turns.

```
[Turn 1: clarify — SKIPPABLE]
  Model: Haiku 4.5
  System: clarifying-question template
  If intent is fully specified: emit 0 questions and proceed to plan
  Otherwise: emit 1-5 questions in chat
  Wait for user reply via OpenClaw's standard chat back-channel

[Turn 2: plan]
  Model: Opus 4.7
  Tool: read_schema (with redaction)
  Tool: glob/grep/read_file (scoped to draft after draft_create)
  Output: short plan in chat ("I'm going to add a new route /weekly-review …")

[Turn 3: edit]
  Model: Opus 4.7
  Tool: draft_create (called once)
  Tool: read_file / write_file / glob / grep
  Tool: record_intent (called per code change)
  PostToolUse hook appends to intent log automatically

[Turn 4: build]
  Tool: build_draft
  If errors: agent loops back to edit (up to 3 retries)
  If still failing: report to user with structured errors

[Turn 5: respond]
  Output in chat: "Done. Open draft in App tab to test."
  Inline action buttons: [Open Draft] [Accept] [Discard]
```

**Per-session token budget:** Configurable cap (default $5 USD). If exceeded mid-loop, agent halts and reports to user with option to increase budget or discard.

**Cancellation:** If the user sends a new chat message mid-loop, the current generation cancels (Anthropic SDK supports stream cancellation) and the new context replaces the prior. Draft state survives.

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

### 7.4 `src/intent-log.ts`

SQLite-backed event store. Schema:

```sql
CREATE TABLE intents (
  id TEXT PRIMARY KEY,                    -- ULID
  user_id TEXT NOT NULL,                  -- placeholder for V1 (single user)
  draft_id TEXT NOT NULL,
  kind TEXT NOT NULL,                     -- 'clarify_qa' | 'plan' | 'file_write' | 'file_edit' | 'migration' | 'accept' | 'discard'
  target_app TEXT NOT NULL,
  payload_json TEXT NOT NULL,             -- typed per kind
  created_at TEXT NOT NULL                -- ISO 8601
);
CREATE INDEX idx_intents_draft ON intents(draft_id);
CREATE INDEX idx_intents_user_created ON intents(user_id, created_at);
```

Inserted in the same transaction as schema migrations on accept (so code and log can't drift).

Export to JSONL is available via a script but not the source of truth.

### 7.5 `src/query-auditor.ts`

Functions:

- `parseQueries(filePath): QueryRef[]` — extracts SQL string literals + ORM call patterns from the changed file
- `diffQueries(beforeFiles, afterFiles): { added, removed, changed }`
- `summarizeForConsent(queries): ConsentPrompt` — produces "this change reads X" structured prompt

V1 implementation: regex + simple AST parsing for the patterns GroundWork uses. Not a full SQL parser — we cover ~95% of common patterns and require explicit consent for anything ambiguous.

### 7.6 Hooks

**`PreToolUse` (`src/hooks/pre-tool-use.ts`)** — fires before any tool call:

- For `Write`/`Edit` with a path argument: resolve absolute path, verify it's inside `<draftsRoot>/<draftId>/`. Deny with explanation if not.
- For `Read`/`Glob`/`Grep`: allow paths inside the draft AND inside read-only reference paths (the live `apps/groundwork-web/` for style reference, `packages/groundwork-shared/` for types). Deny `Read` on anything else (e.g., `extensions/`, `src/`, other apps).
- For `read_schema`: pass through (already filters via allowlist).

**`PostToolUse` (`src/hooks/post-tool-use.ts`)** — fires after any tool call returns:

- For `Write`/`Edit` in a draft: insert intent log row `{ kind: 'file_write', payload: { path, before_size, after_size, hash } }`.

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

5. **Token budget on a per-user, not per-session, basis** — V1 is per-session ($5). A per-user monthly cap is reasonable later but out of V1.

6. **Skill files in `skills/`** — V1 ships empty `skills/` directory (OpenClaw convention). Skill auto-learning is V1.5 work.

## 10. Pattern attribution

Adapted from snapshots in `~/Desktop/apps/_reference/`:

- **OpenClaw `extensions/diffs/`** — plugin SDK shape, tool registration, HTTP routes pattern
- **OpenClaw `src/agents/agent-scope.ts`** — capability whitelisting concept (we apply to tool paths)
- **OpenClaw workspace prompt files** (`AGENTS.md`/`SOUL.md`/`TOOLS.md` convention) — system-prompt injection layer
- **Hermes Agent `agent/skills/` + Autonomous Curator** — skill-from-experience pattern (deferred to V1.5; noted here for planning)

See `docs/groundwork/NOTICES.md` for full attribution policy. No code copied verbatim from either repo — patterns only.

## 11. Implementation plan (high-level)

The detailed implementation plan lives in the writing-plans flow that follows this spec. High-level order:

1. **Slice 1 — DraftEngine + intent log** (foundation: create, discard, accept pipeline without an agent calling it; tested via direct unit tests)
2. **Slice 2 — Custom tools** (read*schema, build_draft, draft*\*; tested with mocked LLM)
3. **Slice 3 — Agent loop** (the gifd_builder tool that orchestrates everything; tested with mocked LLM responses)
4. **Slice 4 — PreToolUse / PostToolUse hooks** (boundary + intent log)
5. **Slice 5 — QueryAuditor + consent UI** (the privacy gate)
6. **Slice 6 — HTTP routes** (drafts/{id}/accept|discard|status|queries)
7. **Slice 7 — End-to-end test on one real customization** (the "Add weekly review" walkthrough)

Each slice is independently testable. Slice 1 is the load-bearing slice — if accept atomicity is wrong, everything else is built on sand.
