import { getAgentAdapter } from "./agent-adapters.js";
import { getLatestCapabilityProbe } from "./capability-probe.js";
import { assessWorkspaceIndexFreshness } from "./context.js";
import { nowIso } from "./id.js";

export const AGENT_EXECUTION_READINESS_CONTRACT = Object.freeze({
  version: "0.1.0",
  interface: "spruceagent.agent-execution-readiness",
  safetyBoundary: [
    "Readiness is a local, read-only projection; it does not prepare a workspace, create an approval, or launch an agent.",
    "An installed executable is not treated as empirical execution validation.",
    "Ready requires a fresh ContextOS index, a launcher-supported available adapter, and a latest Launcher-attested passing trial.",
  ],
});

export function getAgentExecutionReadinessContract() {
  return AGENT_EXECUTION_READINESS_CONTRACT;
}

export function assessAgentExecutionReadiness(store, input = {}) {
  const adapterId = String(input.adapterId ?? "").trim();
  if (!adapterId) throw new Error("adapterId is required");
  const adapter = getAgentAdapter(adapterId);
  const probe = input.probe ?? getLatestCapabilityProbe(store);
  const capability = probe?.adapters?.find((item) => item.adapterId === adapterId) ?? null;
  const context = assessWorkspaceIndexFreshness(store, { maxChanges: input.maxChanges });
  const blockers = [];
  if (!probe) blockers.push({ id: "capability_probe_missing", reason: "Run a fresh capability probe before requesting external execution." });
  else if (!capability?.launcherExecutionSupported || capability.status !== "available") blockers.push({ id: "launcher_unavailable", reason: "The selected adapter is not available for SpruceAgent's gated launcher." });
  if (context.status !== "fresh") blockers.push({ id: "context_not_fresh", reason: "Refresh ContextOS before external execution.", status: context.status });
  const empirical = capability?.empiricalValidation;
  if (empirical?.status !== "attested" || empirical.effectiveOutcome !== "passed") blockers.push({ id: "attested_trial_required", reason: "A latest Launcher-attested passing trial is required; reported or failed trials do not unlock execution." });
  const status = blockers.some((item) => item.id === "launcher_unavailable" || item.id === "capability_probe_missing")
    ? "blocked"
    : blockers.length ? "needs_trial"
      : "ready";
  return {
    version: AGENT_EXECUTION_READINESS_CONTRACT.version,
    interface: AGENT_EXECUTION_READINESS_CONTRACT.interface,
    checkedAt: nowIso(),
    status,
    canRequestExecutionApproval: status === "ready",
    adapter: { id: adapter.id, name: adapter.name, kind: adapter.kind },
    probe: probe ? { id: probe.id, createdAt: probe.createdAt, adapter: capability ? { status: capability.status, launcherExecutionSupported: capability.launcherExecutionSupported, empiricalValidation: capability.empiricalValidation } : null } : null,
    context: { status: context.status, indexedAt: context.indexedAt ?? null, summary: context.summary },
    blockers,
    limits: AGENT_EXECUTION_READINESS_CONTRACT.safetyBoundary,
  };
}
