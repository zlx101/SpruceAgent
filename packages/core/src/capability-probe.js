import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { getAgentAdapter, listAgentAdapters } from "./agent-adapters.js";
import { listAgentTrials } from "./agent-trials.js";
import { listLlmProviderConfigs } from "./llm-provider-registry.js";
import { createId, nowIso } from "./id.js";
import { appendJsonl, readJson, readJsonl, writeJson } from "./storage.js";

export const CAPABILITY_PROBE_CONTRACT = Object.freeze({
  version: "0.3.0",
  interface: "spruceagent.capability-probe",
  sourceKind: "local_runtime_and_redacted_provider_configuration",
  outputKind: "agent_capability_snapshot",
  safetyBoundary: [
    "Capability Probe v0 detects allowlisted adapter commands, redacted provider configuration, and local Agent Trial summaries.",
    "It never launches an agent task, sends a model request, opens a network connection, or mutates a repository.",
    "Version checks use only a fixed --version argument with a short timeout.",
    "Windows command wrappers are detected but not executed during version checks.",
    "API key values, environment values, prompts, and model responses are never stored.",
  ],
});

const VERSION_TIMEOUT_MS = 3000;

export function getCapabilityProbeContract() {
  return CAPABILITY_PROBE_CONTRACT;
}

export function probeAgentCapabilities(store, input = {}, runtime = {}) {
  const requestedIds = normalizeIds(input.adapterIds);
  const adapterItems = listAgentAdapters().items
    .filter((adapter) => !requestedIds.length || requestedIds.includes(adapter.id));
  if (requestedIds.length) {
    for (const adapterId of requestedIds) getAgentAdapter(adapterId);
  }

  const createdAt = nowIso();
  const trialSummary = listAgentTrials(store).summary;
  const snapshot = {
    version: CAPABILITY_PROBE_CONTRACT.version,
    interface: CAPABILITY_PROBE_CONTRACT.interface,
    id: createId("cap_probe"),
    createdAt,
    updatedAt: createdAt,
    createdBy: input.actor ?? "local-user",
    platform: {
      platform: process.platform,
      arch: process.arch,
      node: process.version,
    },
    adapters: adapterItems.map((item) => probeAdapter(item, input, runtime, trialSummary.byAdapter[item.id])),
    llmProviders: probeLlmProviders(store),
    agentTrials: trialSummary,
    limits: CAPABILITY_PROBE_CONTRACT.safetyBoundary,
  };
  snapshot.summary = summarizeSnapshot(snapshot);

  writeJson(probePath(store, snapshot.id), snapshot);
  appendJsonl(probeIndexPath(store), probeListItem(snapshot));
  appendJsonl(path.join(store.root, "audit.jsonl"), {
    type: "capability_probe.created",
    probeId: snapshot.id,
    createdAt,
    actor: snapshot.createdBy,
    adapterCount: snapshot.summary.adapterCount,
    availableAdapterCount: snapshot.summary.availableAdapterCount,
    configuredLlmProviderCount: snapshot.summary.configuredLlmProviderCount,
  });
  return snapshot;
}

export function getCapabilityProbe(store, probeId) {
  if (!probeId) throw new Error("probeId is required");
  const filePath = probePath(store, probeId);
  if (!fs.existsSync(filePath)) throw new Error(`capability probe not found: ${probeId}`);
  return readJson(filePath);
}

export function listCapabilityProbes(store) {
  const items = readJsonl(probeIndexPath(store))
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
  return {
    version: CAPABILITY_PROBE_CONTRACT.version,
    createdAt: nowIso(),
    status: items.length ? "available" : "empty",
    summary: {
      total: items.length,
      latestProbeId: items[0]?.id ?? null,
      latestCreatedAt: items[0]?.createdAt ?? null,
    },
    items,
    limits: CAPABILITY_PROBE_CONTRACT.safetyBoundary,
  };
}

export function getLatestCapabilityProbe(store) {
  const latest = listCapabilityProbes(store).items[0];
  return latest ? getCapabilityProbe(store, latest.id) : null;
}

function probeAdapter(item, input, runtime, trialStats = null) {
  const adapter = getAgentAdapter(item.id);
  if (adapter.id === "local-shell-agent") {
    return {
      adapterId: adapter.id,
      name: adapter.name,
      command: adapter.command,
      kind: adapter.kind,
      provider: adapter.provider,
      status: "available",
      availability: "builtin",
      executablePath: null,
      version: null,
      versionStatus: "not_applicable",
      launcherExecutionSupported: true,
      empiricalValidation: empiricalValidation(trialStats),
      capabilities: adapter.capabilities,
      evidence: ["Adapter is implemented by SpruceAgent's gated local launcher."],
    };
  }

  const executablePath = resolveCommand(adapter.command, runtime.env ?? process.env);
  if (!executablePath) {
    return {
      adapterId: adapter.id,
      name: adapter.name,
      command: adapter.command,
      kind: adapter.kind,
      provider: adapter.provider,
      status: "unavailable",
      availability: "not_found_on_path",
      executablePath: null,
      version: null,
      versionStatus: "not_checked",
      launcherExecutionSupported: false,
      empiricalValidation: empiricalValidation(trialStats),
      capabilities: adapter.capabilities,
      evidence: [`${adapter.command} was not found on PATH.`],
    };
  }

  const version = input.versionCheck !== true
    ? { status: "skipped", version: null, evidence: "Version execution was not explicitly requested." }
    : probeVersion(executablePath, input.versionTimeoutMs);
  return {
    adapterId: adapter.id,
    name: adapter.name,
    command: adapter.command,
    kind: adapter.kind,
    provider: adapter.provider,
    status: "available",
    availability: "found_on_path",
    executablePath,
    version: version.version,
    versionStatus: version.status,
    launcherExecutionSupported: adapter.id === "codex-cli" && !isShellWrapper(executablePath),
    empiricalValidation: empiricalValidation(trialStats),
    capabilities: adapter.capabilities,
    evidence: [
      `${adapter.command} resolved to a local executable.`,
      version.evidence,
      adapter.id === "codex-cli" && !isShellWrapper(executablePath)
        ? "Codex CLI task execution is supported through External CLI Launcher v1 after isolated workspace preparation and exact approval."
        : adapter.id === "codex-cli"
          ? "Codex was found only as a command wrapper; External CLI Launcher requires a native executable for shell-free execution."
        : "External CLI task execution remains disabled for this adapter.",
    ],
  };
}

function probeVersion(executablePath, timeoutMs) {
  if (process.platform === "win32" && /\.(cmd|bat)$/i.test(executablePath)) {
    return {
      status: "skipped_wrapper",
      version: null,
      evidence: "Windows command wrapper detected; version execution skipped to preserve shell-free probing.",
    };
  }
  const result = spawnSync(executablePath, ["--version"], {
    encoding: "utf8",
    windowsHide: true,
    shell: false,
    timeout: Math.max(250, Math.min(Number(timeoutMs ?? VERSION_TIMEOUT_MS), 10000)),
    maxBuffer: 64 * 1024,
  });
  if (result.error?.code === "ETIMEDOUT") {
    return { status: "timeout", version: null, evidence: "Version check timed out." };
  }
  if (result.error) {
    return { status: "error", version: null, evidence: `Version check failed: ${result.error.code ?? "unknown"}.` };
  }
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
  const version = output.split(/\r?\n/).find(Boolean)?.slice(0, 240) ?? null;
  return {
    status: result.status === 0 ? "reported" : "nonzero_exit",
    version,
    evidence: result.status === 0
      ? "Version command completed successfully."
      : `Version command exited with code ${result.status}.`,
  };
}

function probeLlmProviders(store) {
  const configuredProfiles = listLlmProviderConfigs(store).items.map((item) => ({
    id: item.id,
    configurationKind: "provider_registry",
    status: item.validation.ready ? "configuration_ready_unverified" : "configuration_incomplete",
    configured: item.validation.ready,
    evidence: [item.validation.evidence, "No provider health or generation request was sent."],
    notes: [`${item.kind} via ${item.protocol}; model ${item.model}.`],
  }));
  const configuredIds = new Set(configuredProfiles.map((item) => item.id));
  const discovered = [
    providerProfile("mock", "test_only", true, null, "Deterministic local test provider; not a real model."),
    providerProfile("deepseek", "api_key", hasEnv("DEEPSEEK_API_KEY"), "DEEPSEEK_API_KEY"),
    providerProfile("openai", "api_key", hasEnv("OPENAI_API_KEY"), "OPENAI_API_KEY"),
    providerProfile("anthropic", "api_key", hasEnv("ANTHROPIC_API_KEY"), "ANTHROPIC_API_KEY"),
    providerProfile("local", "endpoint", hasEnv("SPRUCE_LOCAL_LLM_BASE_URL"), "SPRUCE_LOCAL_LLM_BASE_URL", "Endpoint presence is configuration evidence only; no health request was sent."),
    providerProfile("openai-compatible", "runtime_options", false, null, "Configured per request; no global configuration was inferred."),
    providerProfile("custom", "runtime_object", false, null, "Injected provider objects cannot be discovered from process configuration."),
  ].filter((item) => !configuredIds.has(item.id));
  return [...configuredProfiles, ...discovered];
}

function hasEnv(name) {
  return Object.prototype.hasOwnProperty.call(process.env, name);
}

function providerProfile(id, configurationKind, configured, envName, note) {
  return {
    id,
    configurationKind,
    status: id === "mock" ? "test_only" : configured ? "configuration_present_unverified" : "not_configured",
    configured,
    evidence: envName
      ? [`${envName} is ${configured ? "present" : "absent"}; its value was not read or stored.`]
      : [note],
    notes: note ? [note] : [],
  };
}

function resolveCommand(command, env) {
  if (!command || /[\\/]/.test(command)) return null;
  const pathValue = env.PATH ?? env.Path ?? env.path ?? "";
  const extensions = process.platform === "win32"
    ? String(env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";").filter(Boolean)
    : [""];
  for (const directory of pathValue.split(path.delimiter).filter(Boolean)) {
    for (const extension of extensions) {
      const candidate = path.join(directory.replace(/^"|"$/g, ""), process.platform === "win32" ? `${command}${extension.toLowerCase()}` : command);
      if (isExecutable(candidate)) return path.resolve(candidate);
      if (process.platform === "win32") {
        const upperCandidate = path.join(directory.replace(/^"|"$/g, ""), `${command}${extension.toUpperCase()}`);
        if (isExecutable(upperCandidate)) return path.resolve(upperCandidate);
      }
    }
  }
  return null;
}

function isExecutable(filePath) {
  try {
    fs.accessSync(filePath, process.platform === "win32" ? fs.constants.F_OK : fs.constants.X_OK);
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function isShellWrapper(filePath) {
  return process.platform === "win32" && /\.(?:cmd|bat)$/i.test(filePath ?? "");
}

function summarizeSnapshot(snapshot) {
  return {
    adapterCount: snapshot.adapters.length,
    availableAdapterCount: snapshot.adapters.filter((item) => item.status === "available").length,
    unavailableAdapterCount: snapshot.adapters.filter((item) => item.status !== "available").length,
    launcherExecutableAdapterCount: snapshot.adapters.filter((item) => item.launcherExecutionSupported).length,
    adaptersWithEffectivePassCount: snapshot.adapters.filter((item) => item.empiricalValidation.effectiveOutcome === "passed").length,
    adaptersWithEffectiveFailureCount: snapshot.adapters.filter((item) => item.empiricalValidation.effectiveOutcome === "failed").length,
    launcherAttestedAdapterCount: snapshot.adapters.filter((item) => item.empiricalValidation.status === "attested").length,
    llmProviderCount: snapshot.llmProviders.length,
    configuredLlmProviderCount: snapshot.llmProviders.filter((item) => item.configured && item.id !== "mock").length,
  };
}

function empiricalValidation(stats) {
  if (!stats) {
    return {
      status: "unverified",
      effectiveOutcome: null,
      reportedOutcome: null,
      attestedOutcome: null,
      attestation: "none",
      trialCount: 0,
      attestedTrialCount: 0,
      passedCount: 0,
      failedCount: 0,
      passRate: null,
      latestTrialId: null,
      evidence: "No supplied or Launcher-attested execution trial has been recorded for this adapter.",
    };
  }
  const attested = stats.attestedCount > 0;
  return {
    status: attested ? "attested" : "reported",
    effectiveOutcome: stats.effectiveOutcome,
    reportedOutcome: stats.latestStatus,
    attestedOutcome: stats.latestAttestedStatus,
    attestation: attested ? "launcher" : "supplied_observation",
    trialCount: stats.total,
    attestedTrialCount: stats.attestedCount,
    passedCount: stats.passedCount,
    failedCount: stats.failedCount,
    passRate: stats.passRate,
    latestTrialId: stats.effectiveTrialId,
    evidence: attested
      ? "Effective outcome is derived from a SpruceAgent Launcher-attested Trial with independent acceptance evidence."
      : "Outcome is derived from supplied process, workspace-effect, acceptance, and policy observations; Launcher attestation is not available.",
  };
}

function probeListItem(snapshot) {
  return {
    id: snapshot.id,
    createdAt: snapshot.createdAt,
    createdBy: snapshot.createdBy,
    platform: snapshot.platform,
    summary: snapshot.summary,
  };
}

function normalizeIds(values) {
  if (!values) return [];
  const items = Array.isArray(values) ? values : String(values).split(",");
  return [...new Set(items.map((value) => String(value).trim()).filter(Boolean))];
}

function probePath(store, probeId) {
  return path.join(store.root, "capability-probes", `${probeId}.json`);
}

function probeIndexPath(store) {
  return path.join(store.root, "capability-probe-index.jsonl");
}
