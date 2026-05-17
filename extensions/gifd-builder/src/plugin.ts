import type { OpenClawPluginApi } from "../api.js";

// Scaffold only. Real implementation lands after the design spec
// is finalized (see docs/groundwork/platform-design-checkpoint.md
// and the forthcoming docs/groundwork/specs/<date>-gifd-builder-design.md).
//
// Planned shape:
//   - registerTool: gifd_builder (clarify -> plan -> edit -> build -> respond loop)
//   - registerHttpRoute: /plugins/gifd-builder/drafts/* (accept, discard, status)
//   - PreToolUse hooks: enforce draft-branch boundary, redaction allowlist
//   - PostToolUse hooks: append to intent log (SQLite-backed)
export function registerGifdBuilderPlugin(api: OpenClawPluginApi): void {
  api.logger.info("gifd-builder plugin registered (scaffold; no tools active yet)");
}
