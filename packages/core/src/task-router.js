import fs from "node:fs";
import path from "node:path";
import { getAgentAdapter } from "./agent-adapters.js";
import { getCapabilityProbe, getLatestCapabilityProbe, probeAgentCapabilities } from "./capability-probe.js";
import { createId, nowIso } from "./id.js";
import { appendJsonl, readJson, readJsonl, writeJson } from "./storage.js";

export const TASK_ROUTER_CONTRACT = Object.freeze({
  version: "0.3.0",
  interface: "spruceagent.task-router",
  sourceKind: "goal_constraints_and_capability_snapshot",
  outputKind: "explainable_agent_route_draft",
  roles: ["planning", "coding", "research", "review", "deterministic_automation"],
  modes: ["plan", "execute"],
  safetyBoundary: [
    "Task Router v0 produces route drafts only and never launches agents or calls models.",
    "Eligibility is based on observed availability, declared capabilities, hard constraints, and explicit user preferences.",
    "The router does not infer model quality from provider or product names and publishes no opaque quality score.",
    "Recorded Agent Trials are exposed with provenance; a failed effective outcome blocks execute routing, and Launcher-attested evidence takes precedence over supplied observations.",
    "Execute mode only routes adapters already enabled by the gated Agent Launcher.",
    "Every external CLI assignment remains preview-only until launcher support is explicitly promoted.",
  ],
});

const ROLE_SUPPORT = Object.freeze({
  coding_cli: ["planning", "coding", "review"],
  research_cli: ["planning", "research", "review"],
  local_cli: ["deterministic_automation", "review"],
});

export function getTaskRouterContract() {
  return TASK_ROUTER_CONTRACT;
}

export function createTaskRoute(store, input = {}) {
  const goal = String(input.goal ?? "").trim();
  if (!goal) throw new Error("goal is required");
  const mode = input.mode ?? "plan";
  if (!TASK_ROUTER_CONTRACT.modes.includes(mode)) throw new Error("mode must be plan or execute");
  const roleResult = normalizeRoles(input.roles, input.taskType, goal);
  const probe = resolveProbe(store, input);
  if (!probe) throw new Error("capability probe required; create one or set refreshCapabilities=true");
  const probeFreshness = assessProbeFreshness(probe, input.maxProbeAgeMs);
  if (probeFreshness.status !== "fresh") {
    throw new Error(`capability probe is stale: ${probe.id}; create a fresh probe`);
  }

  const requiredCapabilities = normalizeList(input.requiredCapabilities);
  const preferredAdapterIds = normalizeList(input.preferredAdapterIds);
  const preferredProviders = normalizeList(input.preferredProviders);
  const maxAlternatives = Math.max(0, Math.min(Number(input.maxAlternatives ?? 2), 5));
  const candidates = probe.adapters.map((observed) => buildCandidate({
    observed,
    roles: roleResult.roles,
    mode,
    requiredCapabilities,
    preferredAdapterIds,
    preferredProviders,
  })).sort(compareCandidates);
  const assignments = roleResult.roles.map((role) => buildAssignment(role, candidates, maxAlternatives));
  const llmRouting = routeLlmProvider(probe, input);
  const createdAt = nowIso();
  const route = {
    version: TASK_ROUTER_CONTRACT.version,
    interface: TASK_ROUTER_CONTRACT.interface,
    id: createId("agent_route"),
    createdAt,
    updatedAt: createdAt,
    createdBy: input.actor ?? "local-user",
    status: routeStatus(assignments),
    executionMode: "preview_only",
    goal,
    mode,
    classification: roleResult,
    constraints: {
      requiredCapabilities,
      preferredAdapterIds,
      preferredProviders,
      maxAlternatives,
    },
    capabilityProbe: {
      id: probe.id,
      createdAt: probe.createdAt,
      summary: probe.summary,
      freshness: probeFreshness,
    },
    assignments,
    llmRouting,
    candidates,
    selectionPolicy: {
      order: ["hard_eligibility", "role_support", "explicit_adapter_preference", "explicit_provider_preference", "stable_alternative_order_only"],
      qualityScore: null,
      automaticModelBenchmark: false,
      explanation: "The router applies hard facts and caller preferences only; it does not estimate model quality.",
    },
    nextActions: buildNextActions(assignments, llmRouting, mode),
    limits: TASK_ROUTER_CONTRACT.safetyBoundary,
  };

  writeJson(routePath(store, route.id), route);
  appendJsonl(routeIndexPath(store), routeListItem(route));
  appendJsonl(path.join(store.root, "audit.jsonl"), {
    type: "task_route.created",
    routeId: route.id,
    probeId: probe.id,
    status: route.status,
    mode,
    roles: roleResult.roles,
    createdAt,
    actor: route.createdBy,
  });
  return route;
}

function assessProbeFreshness(probe, requestedMaxAgeMs) {
  const maxAgeMs = Math.max(1000, Math.min(Number(requestedMaxAgeMs ?? 15 * 60 * 1000), 24 * 60 * 60 * 1000));
  const createdAtMs = Date.parse(probe.createdAt);
  const ageMs = Number.isFinite(createdAtMs) ? Math.max(0, Date.now() - createdAtMs) : Number.POSITIVE_INFINITY;
  return {
    status: ageMs <= maxAgeMs ? "fresh" : "stale",
    ageMs: Number.isFinite(ageMs) ? ageMs : null,
    maxAgeMs,
  };
}

export function getTaskRoute(store, routeId) {
  if (!routeId) throw new Error("routeId is required");
  const filePath = routePath(store, routeId);
  if (!fs.existsSync(filePath)) throw new Error(`task route not found: ${routeId}`);
  return readJson(filePath);
}

export function listTaskRoutes(store, options = {}) {
  const items = readJsonl(routeIndexPath(store))
    .filter((item) => !options.status || item.status === options.status)
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
  return {
    version: TASK_ROUTER_CONTRACT.version,
    createdAt: nowIso(),
    status: items.length ? "available" : "empty",
    summary: {
      total: items.length,
      routedCount: items.filter((item) => item.status === "routed").length,
      blockedCount: items.filter((item) => item.status === "blocked").length,
      needsInputCount: items.filter((item) => item.status === "needs_input").length,
    },
    items,
    limits: TASK_ROUTER_CONTRACT.safetyBoundary,
  };
}

function resolveProbe(store, input) {
  if (input.probeId) return getCapabilityProbe(store, input.probeId);
  if (input.refreshCapabilities === true) {
    return probeAgentCapabilities(store, {
      actor: input.actor,
      versionCheck: input.versionCheck,
      versionTimeoutMs: input.versionTimeoutMs,
    });
  }
  return getLatestCapabilityProbe(store);
}

function buildCandidate(input) {
  const adapter = getAgentAdapter(input.observed.adapterId);
  const supportedRoles = ROLE_SUPPORT[adapter.kind] ?? [];
  const unsupportedRequestedRoles = input.roles.filter((role) => !supportedRoles.includes(role));
  const missingCapabilities = input.requiredCapabilities.filter((capability) => adapter.capabilities?.[capability] !== true);
  const reasons = [];
  if (input.observed.status !== "available") reasons.push("adapter_not_available");
  if (missingCapabilities.length) reasons.push(`missing_capabilities:${missingCapabilities.join(",")}`);
  if (input.mode === "execute" && !input.observed.launcherExecutionSupported) reasons.push("launcher_execution_not_enabled");
  if (input.mode === "execute" && input.observed.empiricalValidation?.effectiveOutcome === "failed") reasons.push("latest_effective_trial_failed");
  const adapterPreference = input.preferredAdapterIds.indexOf(adapter.id);
  const providerPreference = input.preferredProviders.indexOf(adapter.provider);
  return {
    adapterId: adapter.id,
    name: adapter.name,
    provider: adapter.provider,
    kind: adapter.kind,
    observedStatus: input.observed.status,
    version: input.observed.version,
    supportedRoles,
    unsupportedRequestedRoles,
    launcherExecutionSupported: input.observed.launcherExecutionSupported,
    empiricalValidation: input.observed.empiricalValidation ?? {
      status: "unverified",
      effectiveOutcome: null,
      reportedOutcome: null,
      attestedOutcome: null,
      attestation: "none",
      trialCount: 0,
      passRate: null,
      latestTrialId: null,
    },
    capabilities: adapter.capabilities,
    eligible: reasons.length === 0,
    exclusionReasons: reasons,
    preference: {
      adapterRank: adapterPreference === -1 ? null : adapterPreference,
      providerRank: providerPreference === -1 ? null : providerPreference,
    },
    evidence: input.observed.evidence,
  };
}

function buildAssignment(role, candidates, maxAlternatives) {
  const eligible = candidates.filter((candidate) => candidate.eligible && candidate.supportedRoles.includes(role));
  const adapterPreferred = eligible.filter((candidate) => candidate.preference.adapterRank !== null);
  const providerPreferred = eligible.filter((candidate) => candidate.preference.providerRank !== null);
  const bestProviderRank = providerPreferred.length
    ? Math.min(...providerPreferred.map((candidate) => candidate.preference.providerRank))
    : null;
  const bestProviderCandidates = providerPreferred.filter((candidate) => candidate.preference.providerRank === bestProviderRank);
  const selected = adapterPreferred[0]
    ?? (bestProviderCandidates.length === 1 ? bestProviderCandidates[0] : null)
    ?? (eligible.length === 1 ? eligible[0] : null);
  const selectionSource = adapterPreferred.length
    ? "explicit adapter preference"
    : bestProviderCandidates.length === 1
      ? "explicit provider preference"
      : "only eligible candidate";
  return {
    role,
    status: selected ? "routed" : eligible.length ? "requires_preference" : "blocked",
    selectedAdapterId: selected?.adapterId ?? null,
    alternatives: eligible
      .filter((candidate) => candidate.adapterId !== selected?.adapterId)
      .slice(0, maxAlternatives + 1)
      .map((candidate) => candidate.adapterId),
    explanation: selected
      ? `Selected ${selected.adapterId} from observed eligible adapters using ${selectionSource}.`
      : eligible.length
        ? "Multiple adapters satisfy the same hard facts; provide preferredAdapterIds or preferredProviders because v0 has no quality benchmark to choose between them."
        : "No observed adapter satisfies this role, mode, and all required capabilities.",
  };
}

function routeLlmProvider(probe, input) {
  const preferred = normalizeList(input.preferredLlmProviders);
  const configured = probe.llmProviders.filter((item) => item.configured && item.id !== "mock");
  const preferredConfigured = preferred
    .map((id) => configured.find((item) => item.id === id))
    .filter(Boolean);
  const selected = preferredConfigured[0] ?? (configured.length === 1 ? configured[0] : null);
  return {
    selectedProvider: selected?.id ?? null,
    configuredProviders: configured.map((item) => item.id),
    preferredProviders: preferred,
    status: selected ? "selected" : configured.length > 1 ? "requires_explicit_preference" : "not_configured",
    explanation: selected
      ? `${selected.id} selected from observed configuration${preferredConfigured.length ? " and explicit preference" : " as the only configured real provider"}.`
      : configured.length > 1
        ? "Multiple real providers are configured; provide preferredLlmProviders because v0 has no benchmark evidence for an automatic quality choice."
        : "No configured real LLM provider was observed. Mock remains test-only.",
  };
}

function normalizeRoles(roles, taskType, goal) {
  const explicit = normalizeList(Array.isArray(roles) && !roles.length ? taskType : roles ?? taskType);
  if (explicit.length) {
    for (const role of explicit) {
      if (!TASK_ROUTER_CONTRACT.roles.includes(role)) throw new Error(`unsupported task role: ${role}`);
    }
    return { roles: explicit, source: "explicit", confidence: "high", evidence: ["Roles supplied by caller."] };
  }
  const lower = goal.toLowerCase();
  const inferred = [];
  if (/(review|audit|inspect|审查|审核|评审|复核)/i.test(lower)) inferred.push("review");
  if (/(research|investigate|survey|调研|研究|检索|探索)/i.test(lower)) inferred.push("research");
  if (/(implement|build|code|fix|refactor|开发|实现|修复|重构)/i.test(lower)) inferred.push("coding");
  if (/(script|automation|automate|脚本|自动化)/i.test(lower)) inferred.push("deterministic_automation");
  if (!inferred.length) inferred.push("planning");
  return {
    roles: [...new Set(inferred)],
    source: "keyword_heuristic",
    confidence: "low",
    evidence: ["Roles inferred from transparent multilingual goal keywords; caller should provide roles for consequential routing."],
  };
}

function compareCandidates(left, right) {
  if (left.eligible !== right.eligible) return left.eligible ? -1 : 1;
  const leftAdapter = left.preference.adapterRank ?? Number.MAX_SAFE_INTEGER;
  const rightAdapter = right.preference.adapterRank ?? Number.MAX_SAFE_INTEGER;
  if (leftAdapter !== rightAdapter) return leftAdapter - rightAdapter;
  const leftProvider = left.preference.providerRank ?? Number.MAX_SAFE_INTEGER;
  const rightProvider = right.preference.providerRank ?? Number.MAX_SAFE_INTEGER;
  if (leftProvider !== rightProvider) return leftProvider - rightProvider;
  return left.adapterId.localeCompare(right.adapterId);
}

function buildNextActions(assignments, llmRouting, mode) {
  const actions = [];
  for (const assignment of assignments.filter((item) => item.status === "blocked")) {
    actions.push(`Install or enable an adapter that supports ${assignment.role}, then create a fresh capability probe.`);
  }
  if (assignments.some((item) => item.status === "requires_preference")) {
    actions.push("Provide preferredAdapterIds or preferredProviders for roles with multiple equally eligible adapters.");
  }
  if (llmRouting.status === "requires_explicit_preference") {
    actions.push("Provide preferredLlmProviders to make model-provider selection explicit.");
  }
  if (mode === "execute") {
    actions.push("Execution remains subject to Agent Workspace, TrustKernel approval, Agent Launcher, and Launch Review gates.");
  } else {
    actions.push("Use the selected adapter only to prepare an isolated Agent Workspace preview.");
  }
  return [...new Set(actions)];
}

function routeStatus(assignments) {
  if (assignments.some((item) => item.status === "blocked")) return "blocked";
  if (assignments.some((item) => item.status === "requires_preference")) return "needs_input";
  return "routed";
}

function routeListItem(route) {
  return {
    id: route.id,
    createdAt: route.createdAt,
    status: route.status,
    goal: route.goal,
    mode: route.mode,
    roles: route.classification.roles,
    probeId: route.capabilityProbe.id,
    assignments: route.assignments.map((item) => ({
      role: item.role,
      status: item.status,
      selectedAdapterId: item.selectedAdapterId,
    })),
  };
}

function normalizeList(value) {
  if (!value) return [];
  const items = Array.isArray(value) ? value : String(value).split(",");
  return [...new Set(items.map((item) => String(item).trim()).filter(Boolean))];
}

function routePath(store, routeId) {
  return path.join(store.root, "agent-routes", `${routeId}.json`);
}

function routeIndexPath(store) {
  return path.join(store.root, "agent-route-index.jsonl");
}
