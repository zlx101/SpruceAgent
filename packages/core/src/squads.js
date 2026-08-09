import fs from "node:fs";
import path from "node:path";
import { createId, nowIso } from "./id.js";
import { appendJsonl, readJson, readJsonl, writeJson } from "./storage.js";
import { getTaskRoute } from "./task-router.js";
import { getAgentWorkspace } from "./agent-workspaces.js";
import { getLaunchReview } from "./launch-review.js";

export const SQUAD_CONTRACT = Object.freeze({
  version: "0.1.0",
  interface: "spruceagent.squads",
  sourceKind: "routed_multi_role_task_route",
  outputKind: "reviewable_cross_role_coordination_plan",
  safetyBoundary: [
    "Squad v0 creates and records a coordination plan only; it never launches an agent.",
    "A member inherits its adapter assignment from a Task Route and cannot silently substitute another adapter.",
    "Dependencies are explicit, acyclic role handoffs; a downstream role must not start until its declared predecessors have reviewable output.",
    "Squad v0 does not auto-approve, merge, select a winner, or invoke a Fleet Run.",
    "Workspace and review bindings only record independently created evidence; they do not start execution or alter the bound evidence.",
  ],
});

const ORDER = ["planning", "research", "coding", "review", "deterministic_automation"];

export function getSquadContract() {
  return SQUAD_CONTRACT;
}

export function createSquad(store, input = {}) {
  const routeId = String(input.routeId ?? "").trim();
  if (!routeId) throw new Error("routeId is required");
  const route = getTaskRoute(store, routeId);
  if (route.status !== "routed") throw new Error("squad requires a fully routed Task Route");
  const members = route.assignments.map((assignment) => ({
    id: `member_${assignment.role}`,
    role: assignment.role,
    adapterId: assignment.selectedAdapterId,
    status: "assigned",
    source: "task_route",
  }));
  const dependencies = normalizeDependencies(input.dependencies, members.map((member) => member.role));
  assertAcyclic(members.map((member) => member.role), dependencies);
  const createdAt = nowIso();
  const squad = {
    version: SQUAD_CONTRACT.version,
    interface: SQUAD_CONTRACT.interface,
    id: createId("squad"),
    name: String(input.name ?? route.goal).trim() || route.goal,
    routeId: route.id,
    goal: route.goal,
    createdAt,
    updatedAt: createdAt,
    createdBy: input.actor ?? "local-user",
    status: "planned",
    members,
    handoffs: dependencies.map((dependency) => ({
      ...dependency,
      status: "pending",
      requiredEvidence: ["trace_report", "reviewable_output"],
    })),
    dependencySource: input.dependencies ? "caller_supplied" : "transparent_role_defaults",
    nextActions: [
      "Review the member assignments and handoff graph before preparing any Agent Workspace.",
      "Use Agent Launcher and TrustKernel approvals for every execution; Squad plans grant no execution authority.",
    ],
    limits: SQUAD_CONTRACT.safetyBoundary,
  };
  writeJson(squadPath(store, squad.id), squad);
  appendJsonl(squadIndexPath(store), squadListItem(squad));
  appendJsonl(path.join(store.root, "audit.jsonl"), {
    type: "squad.created", squadId: squad.id, routeId: route.id, status: squad.status, createdAt, actor: squad.createdBy,
  });
  return squad;
}

export function getSquad(store, squadId) {
  if (!squadId) throw new Error("squadId is required");
  const filePath = squadPath(store, squadId);
  if (!fs.existsSync(filePath)) throw new Error(`squad not found: ${squadId}`);
  return readJson(filePath);
}

export function bindSquadMemberWorkspace(store, squadId, input = {}) {
  const squad = getSquad(store, squadId);
  const role = String(input.role ?? "").trim();
  const member = squad.members.find((item) => item.role === role);
  if (!member) throw new Error("role is not a Squad member");
  const workspace = getAgentWorkspace(store, input.workspaceId);
  if (workspace.adapter?.id !== member.adapterId) throw new Error("workspace adapter does not match the Squad member assignment");
  member.workspace = { id: workspace.id, status: workspace.status, boundAt: nowIso(), boundBy: input.actor ?? "local-user" };
  return persistUpdatedSquad(store, squad, "squad.member.workspace_bound", { role, workspaceId: workspace.id });
}

export function bindSquadHandoffReview(store, squadId, input = {}) {
  const squad = getSquad(store, squadId);
  const from = String(input.from ?? "").trim();
  const to = String(input.to ?? "").trim();
  const handoff = squad.handoffs.find((item) => item.from === from && item.to === to);
  if (!handoff) throw new Error("Squad handoff not found");
  const source = squad.members.find((item) => item.role === from);
  if (!source?.workspace?.id) throw new Error("source role needs a bound workspace before its handoff can be accepted");
  const review = getLaunchReview(store, input.reviewId);
  if (review.status !== "approved_for_manual_followup") throw new Error("handoff requires an approved Launch Review");
  const selected = review.candidates?.find((item) => item.launchId === review.decision?.selectedLaunchId);
  if (!selected || selected.workspaceId !== source.workspace.id) throw new Error("approved review must select a launch from the source role workspace");
  handoff.status = "accepted";
  handoff.evidence = { reviewId: review.id, selectedLaunchId: selected.launchId, acceptedAt: nowIso(), acceptedBy: input.actor ?? "local-user" };
  return persistUpdatedSquad(store, squad, "squad.handoff.accepted", { from, to, reviewId: review.id });
}

export function getSquadReadiness(store, squadId) {
  const squad = getSquad(store, squadId);
  const members = squad.members.map((member) => {
    const incoming = squad.handoffs.filter((handoff) => handoff.to === member.role);
    const accepted = incoming.filter((handoff) => handoff.status === "accepted");
    const status = !member.workspace?.id
      ? "needs_workspace"
      : accepted.length !== incoming.length
        ? "waiting_for_handoff"
        : "ready_for_approval";
    return { role: member.role, adapterId: member.adapterId, workspaceId: member.workspace?.id ?? null, status, incomingHandoffs: incoming.length, acceptedHandoffs: accepted.length };
  });
  return { squadId: squad.id, status: squad.status, members, readyCount: members.filter((member) => member.status === "ready_for_approval").length, limits: SQUAD_CONTRACT.safetyBoundary };
}

export function listSquads(store, options = {}) {
  const items = readJsonl(squadIndexPath(store))
    .filter((item) => !options.status || item.status === options.status)
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
  return {
    version: SQUAD_CONTRACT.version,
    createdAt: nowIso(),
    status: items.length ? "available" : "empty",
    summary: { total: items.length, plannedCount: items.filter((item) => item.status === "planned").length },
    items,
    limits: SQUAD_CONTRACT.safetyBoundary,
  };
}

function normalizeDependencies(input, roles) {
  const dependencies = input === undefined ? defaultDependencies(roles) : input;
  if (!Array.isArray(dependencies)) throw new Error("dependencies must be an array");
  const seen = new Set();
  return dependencies.map((item) => {
    const from = String(item?.from ?? "").trim();
    const to = String(item?.to ?? "").trim();
    if (!roles.includes(from) || !roles.includes(to) || from === to) throw new Error("each dependency must reference two different routed roles");
    const key = `${from}->${to}`;
    if (seen.has(key)) throw new Error(`duplicate squad dependency: ${key}`);
    seen.add(key);
    return { from, to };
  });
}

function defaultDependencies(roles) {
  const present = new Set(roles);
  const result = [];
  if (present.has("planning") && present.has("coding")) result.push({ from: "planning", to: "coding" });
  if (present.has("research") && present.has("coding")) result.push({ from: "research", to: "coding" });
  if (present.has("coding") && present.has("review")) result.push({ from: "coding", to: "review" });
  return result;
}

function assertAcyclic(roles, dependencies) {
  const outgoing = new Map(roles.map((role) => [role, []]));
  for (const dependency of dependencies) outgoing.get(dependency.from).push(dependency.to);
  const visiting = new Set();
  const visited = new Set();
  const visit = (role) => {
    if (visiting.has(role)) throw new Error("squad dependencies must be acyclic");
    if (visited.has(role)) return;
    visiting.add(role);
    for (const next of outgoing.get(role)) visit(next);
    visiting.delete(role);
    visited.add(role);
  };
  for (const role of roles) visit(role);
}

function squadListItem(squad) {
  return { id: squad.id, name: squad.name, routeId: squad.routeId, goal: squad.goal, status: squad.status, createdAt: squad.createdAt, updatedAt: squad.updatedAt, memberCount: squad.members.length, handoffCount: squad.handoffs.length };
}

function persistUpdatedSquad(store, squad, eventType, details) {
  squad.updatedAt = nowIso();
  writeJson(squadPath(store, squad.id), squad);
  appendJsonl(path.join(store.root, "audit.jsonl"), { type: eventType, squadId: squad.id, createdAt: squad.updatedAt, ...details });
  return squad;
}

function squadPath(store, squadId) { return path.join(store.root, "squads", `${squadId}.json`); }
function squadIndexPath(store) { return path.join(store.root, "squad-index.jsonl"); }
