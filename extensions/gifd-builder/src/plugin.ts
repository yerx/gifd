import type { OpenClawPluginApi } from "../api.js";

// Scaffold only. Real implementation lands after the design spec
// is finalized (see docs/groundwork/platform-design-checkpoint.md
// and the forthcoming docs/groundwork/specs/<date>-gifd-builder-design.md).
//
// Planned shape:
//   - registerTool: gifd_builder (handler invokes api.runtime.agent.runEmbeddedPiAgent)
//   - registerHttpRoute: /plugins/gifd-builder/drafts/* (accept, discard, status)
//   - api.on("before_tool_call"): enforce draft-branch boundary, glob whitelist, cross-file SQL gate
//   - api.on("after_tool_call"): append to intent log + content exfiltration scan
export function registerGifdBuilderPlugin(api: OpenClawPluginApi): void {
  api.logger.info("gifd-builder plugin registered (scaffold; no tools active yet)");
}
