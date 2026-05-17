# Platform Design Checkpoint — 2026-05-14

This document captures the current state of the gtfd platform design conversation. It is **not** a finalized spec — it is a checkpoint before final convergence on V1 product framing and topology.

---

## The thesis

People will increasingly build their own apps with AI rather than subscribing to SaaS. The platform lets a user:

1. Describe an app idea in chat
2. The agent asks 1-5 clarifying questions
3. The agent generates a working web app the user can test in a "draft" sandbox
4. The user accepts → the app joins their personal portfolio
5. Each user gets per-user APIs to selectively share data with other users who opt in

**Core architectural bet:** if we have the right data tables, we can build anything on top of them. Data is the foundation; UI/behavior is malleable code the agent generates.

**First app-within-the-app:** the productivity app **GroundWork**, which already exists in this repo — 15-entity GTD-style data model (domains, projects, tasks, inbox, daily plans, time blocks, materials, etc.), Next.js + Node + Express + SQLite, 150 features passing across 5 phases.

---

## Sub-project decomposition (build order)

The vision is decomposed into sub-projects that ship sequentially. Each gets its own spec → plan → implementation cycle.

1. **#1a — Agent customizes GroundWork (Phase A: PWA)** ← V1, current focus
2. **#1b — Native iOS shell + iCloud** (Swift shell + WKWebView + CloudKit/SwiftData)
3. **#1c — External data integration framework** (HealthKit + OAuth APIs like Oura/Strava + schema registry + sync engine)
4. **#2 — Multi-app portfolio shell** (user owns N apps; agent spins up new apps from templates)
5. **#3 — Per-user APIs** (each user exposes a scoped API; user decides what's queryable)
6. **#4 — Opt-in cross-user sharing** (users grant others access to selected APIs)

---

## Phase A scope (V1)

**Goal:** Validate the agent thesis end-to-end on a phone.

**User-visible behavior:**

- Open the PWA on phone (installed to home screen)
- Two bottom tabs: **App** (the GroundWork app) and **Agent** (chat with the agent)
- User chats: _"Add a weekly review screen that shows what I completed this week"_
- Agent asks 1-5 clarifying questions
- Agent generates a working draft (new TSX components in a draft branch)
- User toggles to "Draft" view in the App tab, tests with a snapshot of their data
- User taps **Accept** (changes ship to live app) or **Discard**

**Explicitly out of scope for Phase A:**

- Native iOS shell (Phase B)
- iCloud sync (requires native — Phase B)
- HealthKit / OAuth integrations (Phase C / #1c)
- Multi-app portfolio (#2)
- Sharing (#4)
- Multi-agent runtime
- Personal-assistant features (deferred — see open questions)

---

## Architecture (Phase A)

### Topology

- **iOS client:** Next.js PWA (manifest + service worker, installable to home screen). Mobile-first responsive UI.
- **Backend:** Existing Node + Express server
- **Data:** server-side SQLite (`server/data/groundwork.db`) — explicitly temporary; Phase B migrates private data to device

### Process separation

Two Next.js processes on the server, hard-isolated:

| Process            | Port  | Code                              | Editable by agent?          |
| ------------------ | ----- | --------------------------------- | --------------------------- |
| Agent host         | 3000  | `apps/agent-shell/`               | No                          |
| User app (Live)    | 3001  | symlink → `releases/<latest>/`    | Yes (via draft → accept)    |
| User app (Draft N) | 3002+ | `drafts/<id>/web/` (git worktree) | Active during draft session |

### Agent stack

- **Custom thin orchestrator on `@anthropic-ai/sdk` Messages API** (~500 LoC target)
- Rejected: `@anthropic-ai/claude-agent-sdk` (subprocess overhead ~12s/call; designed for interactive CLI, not server backends)
- Models: **Claude Opus 4.7** for code generation, **Claude Haiku 4.5** for clarifying-question turns
- Patterns borrowed from OpenClaw: declarative workspace prompt files (`AGENTS.md`, `SOUL.md`, `TOOLS.md`), capability whitelisting per session, sandboxed worktree per session

### Privacy boundary (runtime-enforced)

- `read_schema` tool redacts sensitive columns/tables on an allowlist (matches `secret|token|password|*.body` etc.)
- `QueryAuditor` parses queries in generated code on accept; surfaces consent UI: _"This change reads `tasks.notes`. Approve?"_
- Agent has no tool that reads user data rows

### Draft → Accept atomicity

- Draft created via `git worktree add drafts/<id>/web HEAD` + SQLite snapshot (APFS clonefile / SQLite backup API)
- Draft preview via Next.js dev mode (HMR) — no per-edit build
- Accept sequence:
  1. Final `next build` against draft
  2. Run `QueryAuditor` → present consent UI
  3. `BEGIN TRANSACTION` on live SQLite
  4. Apply schema migration
  5. Append draft intent log rows to live intent log table
  6. `COMMIT`
  7. Symlink swap: `apps/web → releases/<id>/`
  8. Trigger user-app process reload
  9. Cleanup draft worktree

### Custom tools exposed to the agent

- `read_schema` (with redaction)
- `read_file`, `write_file`, `glob`, `grep` (scoped to draft worktree)
- `build_draft` (returns structured errors)
- `record_intent` (logs to `intents` SQLite table)
- `draft_create`, `draft_accept`, `draft_discard`

---

## Tech stack (Phase A locked-in)

| Layer               | Choice                                                                                         |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| Mobile delivery     | Next.js PWA (installable via Add to Home Screen on iOS)                                        |
| Frontend            | Existing Next.js 14, React 18, TailwindCSS, TypeScript                                         |
| Backend             | Node 22 LTS + Express                                                                          |
| Server data         | better-sqlite3 (single-user-at-a-time for V1; worker-thread refactor planned for multi-tenant) |
| Draft sandbox       | git worktrees + APFS clonefile for SQLite snapshot                                             |
| Code rollout        | symlink swap with transaction-wrapped migration                                                |
| Agent runtime       | `@anthropic-ai/sdk` (Messages API) — custom thin orchestrator                                  |
| LLM models          | Opus 4.7 (codegen) + Haiku 4.5 (chat)                                                          |
| Intent log          | SQLite table (JSONL only as export format)                                                     |
| Build orchestration | Existing pnpm monorepo                                                                         |

---

## Phase B preview (for context)

After Phase A validates the thesis, Phase B wraps it natively:

- **SwiftUI shell** — native chat UI in Agent tab, native bottom tabs, native navigation
- **WKWebView pocket** in the App tab renders the existing Next.js code as-is
- **CloudKit + SwiftData** for private user data (data migrates from server SQLite → device)
- **JS bridge** from WebView to native data (typed API the agent generates against)
- Unlocks widgets, Live Activities, Shortcuts, Apple Watch potential

Native is deferred because the App Store rule against downloading/executing native code at runtime would break the "agent updates my app live" thesis. Web inside a native shell sidesteps the rule.

---

## Decisions locked in this conversation

1. Agent operating model: **Hybrid Coder + Spec** — agent generates real code AND records structured intent log entries
2. Commit model: **Draft branch + accept** — code copy + data snapshot, live data continues during session
3. **Mobile-first design**, **iOS-only V1**
4. Chat surface: **Bottom tabs (App | Agent)** with top banner for Live/Draft toggle
5. Long-term canonical data: **Hybrid** — private device-canonical (Phase B+), shared server-canonical
6. **Phased V1** — Phase A as PWA, Phase B as Swift shell + WKWebView
7. **Senior code review applied** — C1-C4 critical findings adopted (orchestrator swap, runtime privacy, git-worktree sandbox, process separation), M1-M5 major findings adopted (Opus 4.7, SQLite intent log, no offline promise, etc.)

---

## Open questions (block design finalization)

1. **V1 product framing.** User has expressed both "personal assistant" and "app portfolio" as V1 ambitions equally. Two arguably different products in one surface. Need to converge on what V1's home screen actually looks like and what success means.

2. **V1 topology.** Three options on the table:
   - **A. Centralized server** (current design) — fastest V1, standard SaaS
   - **B. Local daemon** (OpenClaw + Claude Agent SDK) — multi-channel + multi-agent built-in, but developer-only (Tailscale setup), hard cross-user sharing
   - **C. Hybrid cloud + local agent** — most flexible long-term, ~2x V1 effort

3. **What "multi-agent" means for V1.** Specialized customization agents (one per app type) vs personal-assistant agents (scheduler, summarizer) vs both — depends on (1).

---

## Next steps once open questions resolve

1. Finalize Section 5 of the design (Testing strategy)
2. Write the design spec to `docs/superpowers/specs/2026-05-14-gtfd-phase-a-design.md`
3. Spec self-review (placeholders, contradictions, scope, ambiguity)
4. User reviews the spec
5. Invoke `superpowers:writing-plans` to create implementation plan
6. Begin Phase A implementation

---

## Repo state at checkpoint

```
gtfd/
├── apps/
│   ├── web/        ← Next.js 14 GroundWork app (existing, 150 features)
│   └── desktop/    ← Electron wrapper (existing, not Phase A focus)
├── server/         ← Node + Express + better-sqlite3
│   ├── data/groundwork.db
│   ├── src/routes/ ← 17 entity routes (tasks, projects, domains, etc.)
│   └── src/db/
├── packages/shared/   ← shared types
├── docs/
│   ├── feature-exploration-app-within-app.md   ← original prompt + thesis seed
│   └── platform-design-checkpoint.md           ← this file
├── tests/          ← Playwright suite (119 tests passing)
└── feature_list.json
```

---

## Memory references (saved during this conversation)

For future sessions, the following memories were saved to `~/.claude/projects/-Users-yerx-Desktop-apps-gtfd/memory/`:

- `project_thesis.md` — core platform thesis (build-your-own-apps, share via per-user APIs)
- `project_mobile_first.md` — mobile-first design constraint
- `project_agent_stack.md` — custom orchestrator on `@anthropic-ai/sdk`; Claude Agent SDK rejected
- `project_phased_v1.md` — Phase A (PWA) + Phase B (Swift shell + WKWebView)
- `project_data_strategy.md` — hybrid private-device + shared-server canonical data model
