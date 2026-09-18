import fs from "node:fs";
import path from "node:path";
import { createId, nowIso } from "./id.js";
import { appendJsonl, readJson, readJsonl, storeItemPath, writeJson } from "./storage.js";

const terminalStatuses = new Set(["rejected", "expired", "consumed"]);

export function createApprovalTicket(store, input) {
  const now = nowIso();
  const ticket = {
    id: createId("approval"),
    status: "pending",
    toolName: input.toolName,
    input: input.input ?? {},
    decision: input.decision,
    traceId: input.traceId,
    requester: input.requester ?? "local-user",
    reason: input.reason ?? "execution requires explicit approval",
    createdAt: now,
    updatedAt: now,
    expiresAt: input.expiresAt ?? defaultExpiryIso(),
    resolvedAt: null,
    resolvedBy: null,
    metadata: input.metadata ?? {},
  };

  writeTicket(store, ticket);
  appendJsonl(indexPath(store), ticket);
  appendJsonl(auditPath(store), {
    type: "approval.created",
    approvalId: ticket.id,
    status: ticket.status,
    toolName: ticket.toolName,
    createdAt: now,
  });
  return ticket;
}

export function getApprovalTicket(store, approvalId) {
  const filePath = ticketPath(store, approvalId);
  if (!fs.existsSync(filePath)) {
    throw new Error(`approval not found: ${approvalId}`);
  }
  const ticket = readJson(filePath);
  if (ticket.status === "pending" && isExpired(ticket)) {
    return updateApprovalStatus(store, approvalId, "expired", {
      resolvedBy: "system",
      reason: "approval expired",
    });
  }
  return ticket;
}

export function listApprovalTickets(store, status) {
  const tickets = readJsonl(indexPath(store)).map((ticket) => {
    try {
      return getApprovalTicket(store, ticket.id);
    } catch {
      return ticket;
    }
  });
  if (!status) return tickets;
  return tickets.filter((ticket) => ticket.status === status);
}

export function approveTicket(store, approvalId, input = {}) {
  const ticket = getApprovalTicket(store, approvalId);
  if (ticket.status !== "pending") {
    throw new Error(`approval is not pending: ${approvalId}`);
  }
  return updateApprovalStatus(store, approvalId, "approved", {
    resolvedBy: input.resolvedBy ?? "local-user",
    reason: input.reason ?? "approved",
  });
}

export function rejectTicket(store, approvalId, input = {}) {
  const ticket = getApprovalTicket(store, approvalId);
  if (ticket.status !== "pending") {
    throw new Error(`approval is not pending: ${approvalId}`);
  }
  return updateApprovalStatus(store, approvalId, "rejected", {
    resolvedBy: input.resolvedBy ?? "local-user",
    reason: input.reason ?? "rejected",
  });
}

export function consumeApprovalTicket(store, approvalId) {
  const ticket = getApprovalTicket(store, approvalId);
  if (ticket.status !== "approved") {
    throw new Error(`approval is not approved: ${approvalId}`);
  }
  return updateApprovalStatus(store, approvalId, "consumed", {
    resolvedBy: "system",
    reason: "approval consumed by tool execution",
  });
}

function updateApprovalStatus(store, approvalId, status, input) {
  const ticket = readJson(ticketPath(store, approvalId));
  if (terminalStatuses.has(ticket.status)) {
    throw new Error(`approval is already ${ticket.status}: ${approvalId}`);
  }
  if (ticket.status === "approved" && status !== "consumed") {
    throw new Error(`approval is already approved: ${approvalId}`);
  }
  if (ticket.status === "pending" && status === "consumed") {
    throw new Error(`approval must be approved before consumption: ${approvalId}`);
  }

  const updated = {
    ...ticket,
    status,
    updatedAt: nowIso(),
    resolvedAt: nowIso(),
    resolvedBy: input.resolvedBy,
    resolutionReason: input.reason,
  };
  writeTicket(store, updated);
  appendJsonl(auditPath(store), {
    type: `approval.${status}`,
    approvalId,
    status,
    toolName: updated.toolName,
    createdAt: nowIso(),
    resolvedBy: updated.resolvedBy,
    reason: updated.resolutionReason,
  });
  return updated;
}

function writeTicket(store, ticket) {
  writeJson(ticketPath(store, ticket.id), ticket);
}

function ticketPath(store, approvalId) {
  return storeItemPath(store, "approvals", approvalId);
}

function indexPath(store) {
  return path.join(store.root, "approval-index.jsonl");
}

function auditPath(store) {
  return path.join(store.root, "audit.jsonl");
}

function defaultExpiryIso() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

function isExpired(ticket) {
  return Boolean(ticket.expiresAt && Date.parse(ticket.expiresAt) <= Date.now());
}
