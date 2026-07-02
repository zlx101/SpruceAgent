import { exec } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { consumeApprovalTicket, createApprovalTicket, getApprovalTicket } from "./approvals.js";
import { addMemory } from "./memory.js";
import { auditPolicyDecision, evaluatePolicy } from "./policy.js";
import { appendTraceEvent } from "./trace.js";

const execAsync = promisify(exec);

export async function executeTool(store, request) {
  const input = request.input ?? {};
  const decision = evaluatePolicy({
    toolName: request.toolName,
    trustMode: request.trustMode ?? "approve",
    input,
  });
  auditPolicyDecision(store, decision);

  const base = {
    toolName: request.toolName,
    input,
    decision,
  };

  if (request.traceId) {
    appendTraceEvent(store, request.traceId, "tool.policy", base);
  }

  if (decision.decision === "deny") {
    return finish(store, request, {
      ...base,
      status: "blocked",
      reason: "policy denied execution",
    });
  }

  if (decision.decision === "requires_approval" && !request.approved && !request.approvalId) {
    const approval = createApprovalTicket(store, {
      toolName: request.toolName,
      input,
      decision,
      traceId: request.traceId,
      requester: request.requester,
      reason: "explicit approval required before execution",
    });
    if (request.traceId) {
      appendTraceEvent(store, request.traceId, "approval.created", {
        approvalId: approval.id,
        toolName: request.toolName,
        riskLevel: decision.riskLevel,
      });
    }
    return finish(store, request, {
      ...base,
      status: "requires_approval",
      reason: "explicit approval required before execution",
      approval,
    });
  }

  if (decision.riskLevel === "critical" && !request.allowCritical) {
    return finish(store, request, {
      ...base,
      status: "blocked",
      reason: "critical-risk execution requires allowCritical",
    });
  }

  if (request.approvalId && (request.requireApproval || decision.decision === "requires_approval")) {
    const ticket = getApprovalTicket(store, request.approvalId);
    assertApprovalMatchesRequest(ticket, request.toolName, input);
    consumeApprovalTicket(store, request.approvalId);
  } else if (decision.decision === "requires_approval" && request.approved) {
    // Direct approval is kept for local developer workflows. Durable approval
    // tickets are preferred for UI, team, and remote execution paths.
  }

  const startedAt = new Date().toISOString();
  try {
    const output = await runBuiltinTool(store, request.toolName, input, request);
    return finish(store, request, {
      ...base,
      status: "succeeded",
      startedAt,
      finishedAt: new Date().toISOString(),
      output,
    });
  } catch (error) {
    return finish(store, request, {
      ...base,
      status: "failed",
      startedAt,
      finishedAt: new Date().toISOString(),
      error: {
        message: error.message,
      },
    });
  }
}

async function runBuiltinTool(store, toolName, input, request) {
  if (toolName === "file.read") return readFileTool(store, input);
  if (toolName === "file.write") return writeFileTool(store, input);
  if (toolName === "shell.execute") return shellExecuteTool(store, input, request);
  if (toolName === "memory.add") return addMemory(store, input);
  throw new Error(`no executor registered for tool: ${toolName}`);
}

function readFileTool(store, input) {
  const target = resolveProjectPath(store, input.path);
  const stat = fs.statSync(target);
  if (!stat.isFile()) throw new Error(`not a file: ${input.path}`);
  return {
    path: path.relative(store.cwd, target),
    content: fs.readFileSync(target, "utf8"),
    bytes: stat.size,
  };
}

function writeFileTool(store, input) {
  const target = resolveProjectPath(store, input.path);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, input.content ?? "", "utf8");
  return {
    path: path.relative(store.cwd, target),
    bytes: Buffer.byteLength(input.content ?? "", "utf8"),
  };
}

async function shellExecuteTool(store, input, request) {
  if (!input.command || !String(input.command).trim()) {
    throw new Error("command is required");
  }

  const cwd = input.cwd ? resolveProjectPath(store, input.cwd) : store.cwd;
  const { stdout, stderr } = await execAsync(input.command, {
    cwd,
    timeout: Number(request.timeoutMs ?? 30000),
    maxBuffer: Number(request.maxBuffer ?? 1024 * 1024),
    windowsHide: true,
  });

  return {
    cwd: path.relative(store.cwd, cwd) || ".",
    stdout,
    stderr,
  };
}

function resolveProjectPath(store, rawPath) {
  if (!rawPath || !String(rawPath).trim()) {
    throw new Error("path is required");
  }

  const resolved = path.resolve(store.cwd, rawPath);
  const relative = path.relative(store.cwd, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`path escapes workspace: ${rawPath}`);
  }
  if (relative === ".spruceagent" || relative.startsWith(`.spruceagent${path.sep}`)) {
    throw new Error("direct access to .spruceagent internals is blocked");
  }
  return resolved;
}

function finish(store, request, result) {
  if (request.traceId) {
    appendTraceEvent(store, request.traceId, "tool.result", result);
  }
  return result;
}

function assertApprovalMatchesRequest(ticket, toolName, input) {
  if (ticket.status !== "approved") {
    throw new Error(`approval is not approved: ${ticket.id}`);
  }
  if (ticket.toolName !== toolName) {
    throw new Error(`approval tool mismatch: ${ticket.toolName} !== ${toolName}`);
  }
  if (JSON.stringify(ticket.input) !== JSON.stringify(input)) {
    throw new Error("approval input mismatch");
  }
}
