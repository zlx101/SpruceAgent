import { getApprovalTicket, listApprovalTickets } from "./approvals.js";
import { appendTraceEvent, readTraceEvents } from "./trace.js";
import { executeWorkflowStep } from "./workflows.js";

export const WORKFLOW_CONTINUATION_CONTRACT = Object.freeze({
  version: "0.1.0",
  interface: "spruceagent.workflow-continuation",
  sourceKind: "workflow.run.trace",
  safetyBoundary: [
    "Workflow Continuation v0 resumes only from an existing workflow.run trace.",
    "Only workflow tool steps that previously returned requires_approval can be resumed.",
    "A resumed step requires an approved matching approval ticket.",
    "Continuation execution still goes through executeWorkflowStep, executeTool, and TrustKernel.",
  ],
});

export function getWorkflowContinuationContract() {
  return WORKFLOW_CONTINUATION_CONTRACT;
}

export async function resumeWorkflowRun(store, input = {}) {
  const traceId = input.traceId;
  if (!traceId) throw new Error("traceId is required");

  const snapshot = getWorkflowRunSnapshot(store, traceId);
  appendTraceEvent(store, traceId, "workflow.resume.started", {
    stepId: input.stepId ?? null,
    approvalId: input.approvalId ?? null,
  });

  const resumableResults = (snapshot.output.results ?? [])
    .filter((result) => result.kind === "tool" && result.status === "requires_approval")
    .filter((result) => !input.stepId || result.stepId === input.stepId);

  if (input.stepId && resumableResults.length === 0) {
    const blocked = createBlockedContinuation(traceId, snapshot.output, `approval-gated workflow tool step not found: ${input.stepId}`);
    appendTraceEvent(store, traceId, "workflow.resume.completed", blocked);
    return blocked;
  }

  const results = [];
  for (const priorResult of resumableResults) {
    const step = snapshot.output.workflow.steps.find((item) => item.id === priorResult.stepId);
    if (!step) {
      results.push({
        stepId: priorResult.stepId,
        status: "blocked",
        reason: "workflow step definition not found in source trace",
      });
      continue;
    }

    const approvalId = resolveApprovalId(store, traceId, step, input);
    if (!approvalId) {
      results.push({
        stepId: step.id,
        kind: step.kind,
        status: "requires_approval",
        reason: "no approved approval ticket found for workflow step",
      });
      continue;
    }

    const ticket = getApprovalTicket(store, approvalId);
    if (ticket.status !== "approved") {
      results.push({
        stepId: step.id,
        kind: step.kind,
        status: "requires_approval",
        approvalId,
        reason: `approval is ${ticket.status}`,
      });
      continue;
    }

    appendTraceEvent(store, traceId, "workflow.resume.step.started", {
      stepId: step.id,
      approvalId,
    });
    const execution = await executeWorkflowStep(store, traceId, snapshot.output.workflow, step, {
      trustMode: input.trustMode ?? snapshot.trace?.trustMode ?? "approve",
      actor: input.actor ?? "local-user",
      approvalId,
    });
    results.push(execution);
    appendTraceEvent(store, traceId, "workflow.resume.step.completed", execution);
  }

  const output = {
    version: WORKFLOW_CONTINUATION_CONTRACT.version,
    status: summarizeContinuationStatus(results),
    traceId,
    sourceWorkflow: {
      id: snapshot.output.workflow?.id ?? null,
      name: snapshot.output.workflow?.name ?? null,
      status: snapshot.output.status ?? null,
    },
    resultCount: results.length,
    summary: summarizeResults(results),
    results,
    limits: [
      "Workflow Continuation v0 does not re-plan.",
      "Workflow Continuation v0 does not create approval tickets.",
      "Only approved matching workflow tool approval tickets can resume execution.",
    ],
  };
  appendTraceEvent(store, traceId, "workflow.resume.completed", output);
  return output;
}

export function getWorkflowRunSnapshot(store, traceId) {
  const events = readTraceEvents(store, traceId);
  const started = events.find((event) => event.type === "trace.started")?.payload ?? null;
  const completed = [...events].reverse().find((event) => event.type === "workflow.completed")?.payload ?? null;
  if (!completed) {
    throw new Error(`workflow completion not found in trace: ${traceId}`);
  }
  return {
    traceId,
    trace: started,
    output: completed,
    eventCount: events.length,
  };
}

function resolveApprovalId(store, traceId, step, input) {
  const explicit = input.approvalIds?.[step.id] ?? input.approvalId;
  if (explicit) return explicit;

  const ticket = listApprovalTickets(store, "approved").find((item) => (
    item.traceId === traceId
    && item.toolName === step.toolName
    && JSON.stringify(item.input) === JSON.stringify(step.input ?? {})
  ));
  return ticket?.id ?? null;
}

function createBlockedContinuation(traceId, output, reason) {
  return {
    version: WORKFLOW_CONTINUATION_CONTRACT.version,
    status: "completed_with_blockers",
    traceId,
    sourceWorkflow: {
      id: output?.workflow?.id ?? null,
      name: output?.workflow?.name ?? null,
      status: output?.status ?? null,
    },
    resultCount: 1,
    summary: {
      blocked: 1,
    },
    results: [
      {
        stepId: "workflow_resume",
        status: "blocked",
        reason,
      },
    ],
    limits: [
      "Workflow Continuation v0 requires an existing approval-gated tool step in the workflow trace.",
    ],
  };
}

function summarizeContinuationStatus(results) {
  if (results.some((result) => result.status === "requires_approval")) return "requires_approval";
  if (results.some((result) => ["failed", "blocked", "skipped"].includes(result.status))) {
    return "completed_with_blockers";
  }
  return "completed";
}

function summarizeResults(results) {
  const counts = {};
  for (const result of results) {
    counts[result.status] = (counts[result.status] ?? 0) + 1;
  }
  return counts;
}
