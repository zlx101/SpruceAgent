import { assertAgentWorkspaceLaunchable, getAgentWorkspace } from "./agent-workspaces.js";

export const EXECUTION_EVIDENCE_CONTRACT = Object.freeze({
  version: "0.1.0",
  interface: "spruceagent.execution-evidence",
  sourceKind: "durable_workspace_and_launch_records",
  outputKind: "current_execution_evidence_gate",
  safetyBoundary: [
    "Retired Agent Workspaces cannot authorize launch, fleet approval, fleet execution, or trial attestation.",
    "Attestation recovers the workspace from the launch record and re-checks current workspace status.",
    "Fleet approval and execution re-check every candidate workspace before mutating tickets or starting processes.",
    "This gate does not delete evidence, resume retired workspaces, or bypass TrustKernel approvals.",
  ],
});

export function getExecutionEvidenceContract() {
  return EXECUTION_EVIDENCE_CONTRACT;
}

export function assertWorkspaceExecutionEvidence(store, workspaceId) {
  const workspace = getAgentWorkspace(store, workspaceId);
  assertAgentWorkspaceLaunchable(workspace);
  return workspace;
}

export function assertLaunchWorkspaceCurrent(store, launch) {
  if (!launch?.workspaceId) {
    throw new Error("agent launch is missing workspaceId and cannot be attested or continued");
  }
  return assertWorkspaceExecutionEvidence(store, launch.workspaceId);
}

export function assertFleetWorkspacesCurrent(store, fleetRun) {
  if (!fleetRun?.units?.length) {
    throw new Error("fleet run has no candidate workspaces");
  }
  return fleetRun.units.map((unit) => {
    if (!unit.workspaceId) {
      throw new Error(`fleet candidate is missing workspaceId: ${unit.id ?? "unknown"}`);
    }
    return assertWorkspaceExecutionEvidence(store, unit.workspaceId);
  });
}
