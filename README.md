# Gifd

**Build your own apps. Own your own data.**

Gifd is a personal AI platform for building your own apps with an AI agent and selectively sharing data with people you choose. It is a **hard fork of [OpenClaw](https://github.com/openclaw/openclaw)** — a personal AI assistant runtime — extended with first-class app-building capabilities and a starting productivity-app template (GroundWork).

## Status

Early development. Not yet shipping to users.

## Mission

People will increasingly build their own apps with AI rather than subscribing to SaaS. Gifd gives one user:

1. A personal AI agent that can describe-then-build apps from chat ("Add a weekly review screen that shows what I completed this week...")
2. A starting productivity-app template ([GroundWork](apps/groundwork-web/)) — a GTD-style task and time-blocking app, fully customizable by the agent
3. Per-user APIs (planned) to selectively share data with other users who opt in

## Relationship to OpenClaw

Gifd shares OpenClaw's design center — your own personal AI assistant, on your own hardware (or hosted by us, your choice), with multi-channel reach and a sandboxed agent runtime. We extend it with:

- **`apps/groundwork-*`** — the GTD-style productivity app (Next.js + Express + SQLite + Electron desktop wrapper)
- **`extensions/gifd-builder/`** (coming soon) — the app-builder agent
- Customized **iOS** surface (in `apps/ios/`)

We track OpenClaw upstream via the `upstream` git remote. Security patches, model provider updates, and gateway protocol improvements flow to Gifd. Our additions are largely additive (new directories) so merges stay clean.

## What we ship vs. what stays upstream-only

Gifd's shipped surfaces:

- **iOS** — customized fork of OpenClaw's native iOS app (`apps/ios/`)
- **Desktop** — Electron app wrapping the GroundWork Next.js code (`apps/groundwork-desktop/`). Cross-platform: macOS + Windows + Linux from one codebase.

Surfaces we don't develop or ship (kept in tree for upstream-merge safety only):

- **OpenClaw's native macOS app** (`apps/macos/`) — superseded by our Electron wrapper, which gives us macOS + Windows + Linux from one codebase
- **OpenClaw's native Android app** (`apps/android/`)

## Branding

We use Gifd-branded surfaces for user-facing copy (this README, eventual app names), but internal package names (`@openclaw/*`), CLI commands (`openclaw`), and code paths remain as upstream to minimize merge friction. See [BRANDING.md](BRANDING.md).

## Layout

```
gifd/
├── apps/
│   ├── groundwork-web/          ← Gifd: Next.js productivity app (GroundWork)
│   ├── groundwork-server/       ← Gifd: Node + Express + SQLite backend for GroundWork
│   ├── groundwork-desktop/      ← Gifd: Electron wrapper around groundwork-web (Mac/Win/Linux)
│   ├── ios/                     ← Inherited from OpenClaw, customized
│   ├── macos/                   ← Inherited from OpenClaw, unsupported in Gifd (Electron replaces)
│   └── android/                 ← Inherited from OpenClaw, unsupported in Gifd
├── packages/
│   ├── groundwork-shared/       ← Gifd: shared types for GroundWork
│   ├── plugin-sdk/              ← OpenClaw plugin SDK (we consume)
│   └── sdk/                     ← OpenClaw consumer SDK
├── extensions/                  ← OpenClaw's 134 extensions (we inherit and add ours here)
│   └── gifd-builder/            ← Gifd: the app-builder agent (planned)
├── src/                         ← OpenClaw core (gateway, agents, sessions, etc.)
├── docs/
│   └── groundwork/              ← Gifd: design docs, exploration notes, attribution
└── BRANDING.md                  ← Branding policy for the fork
```

## Upstream

This repo's `upstream` remote points at https://github.com/openclaw/openclaw with push disabled. To pull selective upstream changes:

```bash
git fetch upstream
git log HEAD..upstream/main --oneline    # see what's new upstream
# cherry-pick or merge selectively; see docs/groundwork/upstream-tracking.md (coming)
```

## License

MIT — inherited from OpenClaw. Gifd-original code is also MIT.

## Acknowledgments

Gifd stands on OpenClaw's shoulders. See [docs/groundwork/NOTICES.md](docs/groundwork/NOTICES.md) for full attribution.
