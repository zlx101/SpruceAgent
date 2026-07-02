import path from "node:path";
import { nowIso } from "./id.js";
import { appendJsonl } from "./storage.js";
import { findTool } from "./tools.js";

const riskOrder = ["low", "medium", "high", "critical"];

const criticalCommandPatterns = [
  /\brm\s+-rf\b/i,
  /\bRemove-Item\b.*\b-Recurse\b/i,
  /\bgit\s+reset\s+--hard\b/i,
  /\bformat\b/i,
  /\bdd\s+if=/i,
  /\bDROP\s+TABLE\b/i,
];

const highCommandPatterns = [
  /\bgit\s+push\b/i,
  /\bchmod\s+-R\b/i,
  /\bchown\s+-R\b/i,
  /\bcurl\b.*\|\s*(sh|bash|pwsh|powershell)\b/i,
  /\bInvoke-WebRequest\b.*\|\s*iex\b/i,
];

export function evaluatePolicy(input) {
  const tool = findTool(input.toolName);
  const trustMode = input.trustMode ?? "approve";
  const reasons = [];

  let riskLevel = tool?.riskLevel ?? "high";
  if (!tool) reasons.push(`unknown tool: ${input.toolName}`);
  if (tool?.requiresApproval) reasons.push("tool declares approval requirement");

  const command = input.input?.command;
  if (typeof command === "string") {
    if (criticalCommandPatterns.some((pattern) => pattern.test(command))) {
      riskLevel = maxRisk(riskLevel, "critical");
      reasons.push("command matches critical destructive pattern");
    } else if (highCommandPatterns.some((pattern) => pattern.test(command))) {
      riskLevel = maxRisk(riskLevel, "high");
      reasons.push("command matches high-risk pattern");
    }
  }

  const decision = decide({ trustMode, riskLevel, reasons, tool });
  return {
    decision,
    riskLevel,
    reasons: reasons.length ? reasons : ["no elevated risk detected"],
    createdAt: nowIso(),
    metadata: {
      trustMode,
      toolName: input.toolName,
    },
  };
}

export function auditPolicyDecision(store, decision) {
  appendJsonl(path.join(store.root, "audit.jsonl"), {
    type: "policy.decision",
    ...decision,
  });
  return decision;
}

function decide({ trustMode, riskLevel, tool }) {
  if (!tool) return "requires_approval";
  if (trustMode === "observe") {
    return tool.capability === "read" || tool.capability === "memory" ? "allow" : "deny";
  }
  if (trustMode === "draft") {
    return tool.capability === "read" || tool.capability === "memory" ? "allow" : "requires_approval";
  }
  if (trustMode === "approve") {
    return riskLevel === "low" ? "allow" : "requires_approval";
  }
  if (trustMode === "delegate") {
    return riskLevel === "low" || riskLevel === "medium" ? "allow" : "requires_approval";
  }
  if (trustMode === "autonomous") {
    return riskLevel === "low" ? "allow" : "deny";
  }
  return "requires_approval";
}

function maxRisk(a, b) {
  return riskOrder.indexOf(a) >= riskOrder.indexOf(b) ? a : b;
}
