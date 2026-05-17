# Branding Policy

This fork has **minimal day-one branding**. We've changed user-facing surfaces enough to identify Gifd as our product, but kept internal code structure aligned with upstream OpenClaw to minimize merge friction.

## Renamed (Gifd-branded)

| Surface           | Old             | New                                                                                                |
| ----------------- | --------------- | -------------------------------------------------------------------------------------------------- |
| Top-level README  | OpenClaw README | [README.md](README.md) (Gifd)                                                                      |
| Branding doc      | n/a             | [BRANDING.md](BRANDING.md) (this file)                                                             |
| Our new apps      | n/a             | `apps/groundwork-web/`, `apps/groundwork-server/`, `apps/groundwork-desktop/` (Electron)           |
| Our new packages  | n/a             | `packages/groundwork-shared/` (kept name `@groundwork/shared` internally — additive, not a rename) |
| Our new extension | n/a             | `extensions/gifd-builder/` (planned)                                                               |
| Our docs          | n/a             | `docs/groundwork/`                                                                                 |

## Not renamed (deferred to pre-ship)

We intentionally keep these as upstream-OpenClaw to minimize merge conflicts during heavy development. Renames happen pre-ship, batched.

| Surface                                     | Status                                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| CLI command (`openclaw …`)                  | Unchanged. Gifd-equivalent will alias `gifd → openclaw` near ship time.                    |
| NPM scope (`@openclaw/*`)                   | Unchanged for OpenClaw packages. Our new packages may use `@gifd/*` if needed for clarity. |
| iOS app bundle ID (`ai.openclaw.*`)         | Unchanged in repo; will swap pre-TestFlight.                                               |
| macOS app bundle ID                         | Same as iOS.                                                                               |
| iOS/macOS app display names                 | Unchanged in repo; assets/strings swap pre-ship.                                           |
| OpenClaw README references in code comments | Unchanged.                                                                                 |
| OpenClaw URLs in non-README files           | Unchanged.                                                                                 |
| Discord links, sponsor mentions             | Unchanged.                                                                                 |

## Why this split

OpenClaw is actively developed (commits daily). Every file we modify creates a future merge conflict. We pay that cost only for files where Gifd's identity is on the line (top-level README) and defer it for everything else.

When we ship to TestFlight:

1. Rename app display names + bundle IDs in `apps/ios/Config/`, `apps/macos/Config/`
2. Add CLI alias (`bin/gifd` → invokes `openclaw` binary)
3. Replace branded assets (icons, splash screens) in app `Assets.xcassets`
4. Possibly: rename NPM scope on our own packages
5. Update package.json `name`/`description` in extensions we publish

## What stays Gifd forever (not subject to OpenClaw upstream merges)

Anything in our additive directories — these are 100% ours and immune to upstream:

- `apps/groundwork-web/`, `apps/groundwork-server/`, `apps/groundwork-desktop/`
- `packages/groundwork-shared/`
- `extensions/gifd-builder/` (planned)
- `docs/groundwork/`
- This `BRANDING.md`, the top-level `README.md`

## Surfaces we ship vs. upstream-only

Gifd-shipped:

- **iOS** — customized fork of OpenClaw's native iOS app (`apps/ios/`)
- **Desktop** — Electron app wrapping `groundwork-web` (cross-platform)

Upstream-only (kept in tree for clean merges, never developed by us):

- `apps/macos/` — OpenClaw's native macOS app; superseded by our Electron wrapper
- `apps/android/` — OpenClaw's Android app; out of scope for Gifd

## Workflow for future rebrandings

When the time comes for full rebrand:

1. Create a `rebrand` branch
2. Run search-and-replace surgically (not blanket)
3. Test build + UI thoroughly
4. Merge in one PR so the rebrand is atomic
5. Document the new rename rules here
6. Plan for merge-conflict cost going forward

## Configuration changes from upstream

| Setting                                            | Upstream OpenClaw                                                                  | Gifd                                                                             | Reason                                                                                                                                           |
| -------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm-workspace.yaml` → `minimumReleaseAge`        | `2880` (48hr supply-chain protection — installs reject packages younger than 48hr) | `0`                                                                              | Fresh-checkout dev was hitting the maturity window on every new transitive dep release. Re-enable for production/release builds via CI override. |
| `pnpm-workspace.yaml` → `minimumReleaseAgeExclude` | (upstream list)                                                                    | + `@grammyjs/types`, + `playwright-core`                                         | Vestigial entries from when `minimumReleaseAge: 2880` was active. Can be removed when we re-enable maturity protection.                          |
| `pnpm-workspace.yaml` → `packages`                 | `[".", "ui", "packages/*", "extensions/*"]`                                        | + `apps/groundwork-web`, + `apps/groundwork-server`, + `apps/groundwork-desktop` | Our migrated GroundWork apps need to be part of the pnpm workspace.                                                                              |
| `pnpm-workspace.yaml` → `allowBuilds`              | (upstream list)                                                                    | + `better-sqlite3: true`, + `electron: true`                                     | GroundWork uses these and they have native build scripts. pnpm 9+ requires explicit approval.                                                    |
