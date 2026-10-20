import { getApprovalQueue } from "./approval-queue.js";
import { assessWorkspaceIndexFreshness } from "./context.js";
import { getGatewayOnboardingStatus } from "./onboarding.js";
import { getRunInbox } from "./run-inbox.js";

export function getDailyLoopAttention(store) {
  return evaluateDailyLoopAttention({
    onboarding: getGatewayOnboardingStatus(store),
    freshness: assessWorkspaceIndexFreshness(store).status,
    inbox: getRunInbox(store, { limit: 20 }),
    queue: getApprovalQueue(store),
  });
}

export function evaluateDailyLoopAttention({ onboarding, freshness, inbox, queue }) {
  const failed = (onboarding.steps || []).find((step) => step.status === "failed");
  if (onboarding.status === "failed" || failed) {
    return {
      kind: "blocked",
      text: failed?.detail || "Onboarding failed.",
    };
  }

  if (onboarding.status === "ready" && !onboarding.ledger?.lastDryRunTraceId) {
    return {
      kind: "pending",
      text: "Onboarding has no dry-run trace. The step is not complete.",
    };
  }

  if (freshness === "missing" || freshness === "stale") {
    return {
      kind: "pending",
      text: `Index ${freshness}. Onboarding and Evidence are pending. Do not invent context.`,
    };
  }

  if (!onboarding.updatedAt) {
    return {
      kind: "pending",
      text: "Onboarding has not run.",
    };
  }

  if (onboarding.status === "incomplete") {
    return {
      kind: "pending",
      text: "Onboarding incomplete.",
    };
  }

  const pending = Number(inbox.summary?.pendingApprovalCount || 0);
  const queuePending = Number(queue.summary?.pendingDecisionCount || 0);
  const resumable = Number(inbox.summary?.resumableRunCount || 0);
  if (pending || queuePending || resumable) {
    return {
      kind: "pending",
      text: `Approvals pending: ${pending} tickets, ${queuePending} queue, ${resumable} resumable. Resume stays manual.`,
    };
  }

  return {
    kind: "ok",
    text: "Daily loop ready. Results stay in this workspace.",
  };
}
