import fs from "node:fs";
import path from "node:path";
import { createAnthropicLlmProvider, createLlmProvider, createOpenAiCompatibleLlmProvider } from "./llm.js";
import { appendJsonl, readJson, writeJson } from "./storage.js";

export const LLM_PROVIDER_REGISTRY_CONTRACT = Object.freeze({
  version: "0.1.0",
  interface: "spruceagent.llm-provider-registry",
  protocols: ["openai_chat_completions", "anthropic_messages"],
  kinds: ["deepseek", "openai", "anthropic", "local", "openai-compatible"],
  safetyBoundary: [
    "Provider profiles store endpoint metadata and API-key environment variable names, never API keys or authorization headers.",
    "Configuration and validation are offline operations and never send provider requests.",
    "Remote endpoints require HTTPS; plain HTTP is allowed only for loopback local-model endpoints.",
    "A ready profile means structurally configured with required environment variables present, not network-verified or quality-validated.",
    "LLM output remains draft-only and cannot execute tools or grant approvals.",
  ],
});

const BUILTIN_DEFAULTS = Object.freeze({
  deepseek: {
    protocol: "openai_chat_completions",
    baseUrl: "https://api.deepseek.com",
    path: "/chat/completions",
    model: "deepseek-v4-flash",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    jsonMode: true,
  },
  openai: {
    protocol: "openai_chat_completions",
    baseUrl: "https://api.openai.com/v1",
    path: "/chat/completions",
    model: "gpt-4.1-mini",
    apiKeyEnv: "OPENAI_API_KEY",
    jsonMode: true,
  },
  anthropic: {
    protocol: "anthropic_messages",
    baseUrl: "https://api.anthropic.com",
    path: "/v1/messages",
    model: "claude-sonnet-4-20250514",
    apiKeyEnv: "ANTHROPIC_API_KEY",
    jsonMode: true,
    anthropicVersion: "2023-06-01",
  },
  local: {
    protocol: "openai_chat_completions",
    baseUrl: "http://127.0.0.1:11434/v1",
    path: "/chat/completions",
    model: null,
    apiKeyEnv: null,
    jsonMode: false,
  },
  "openai-compatible": {
    protocol: "openai_chat_completions",
    baseUrl: null,
    path: "/chat/completions",
    model: null,
    apiKeyEnv: null,
    jsonMode: true,
  },
});

const FORBIDDEN_SECRET_FIELDS = ["apiKey", "token", "secret", "authorization", "headers", "authToken"];

export function getLlmProviderRegistryContract() {
  return LLM_PROVIDER_REGISTRY_CONTRACT;
}

export function configureLlmProvider(store, input = {}) {
  assertNoInlineSecrets(input);
  const registry = readRegistry(store);
  const id = normalizeId(input.id);
  const existing = registry.profiles.find((item) => item.id === id) ?? null;
  const kind = normalizeKind(input.kind ?? existing?.kind ?? id);
  const defaults = BUILTIN_DEFAULTS[kind];
  const createdAt = existing?.createdAt ?? new Date().toISOString();
  const profile = normalizeProfile({
    ...defaults,
    ...existing,
    ...compactDefined(input),
    id,
    kind,
    protocol: defaults.protocol,
    createdAt,
    updatedAt: new Date().toISOString(),
    updatedBy: input.actor ?? "local-user",
  });
  registry.profiles = registry.profiles.filter((item) => item.id !== id);
  registry.profiles.push(profile);
  registry.profiles.sort((left, right) => left.id.localeCompare(right.id));
  if (input.default === true || !registry.defaultProvider) registry.defaultProvider = id;
  registry.updatedAt = profile.updatedAt;
  writeRegistry(store, registry);
  audit(store, "llm_provider.configured", profile, input.actor);
  return describeProfile(profile, process.env, registry.defaultProvider);
}

export function removeLlmProviderConfig(store, providerId, input = {}) {
  const id = normalizeId(providerId);
  const registry = readRegistry(store);
  const existing = registry.profiles.find((item) => item.id === id);
  if (!existing) throw new Error(`llm provider profile not found: ${id}`);
  registry.profiles = registry.profiles.filter((item) => item.id !== id);
  if (registry.defaultProvider === id) registry.defaultProvider = null;
  registry.updatedAt = new Date().toISOString();
  writeRegistry(store, registry);
  audit(store, "llm_provider.removed", existing, input.actor);
  return { id, status: "removed", defaultProvider: registry.defaultProvider };
}

export function getLlmProviderConfig(store, providerId, options = {}) {
  const id = normalizeId(providerId);
  const registry = readRegistry(store);
  const profile = registry.profiles.find((item) => item.id === id);
  if (!profile) throw new Error(`llm provider profile not found: ${id}`);
  return describeProfile(profile, options.env ?? process.env, registry.defaultProvider);
}

export function listLlmProviderConfigs(store, options = {}) {
  const registry = readRegistry(store);
  const env = options.env ?? process.env;
  const items = registry.profiles.map((profile) => describeProfile(profile, env, registry.defaultProvider));
  return {
    version: LLM_PROVIDER_REGISTRY_CONTRACT.version,
    interface: LLM_PROVIDER_REGISTRY_CONTRACT.interface,
    status: items.length ? "configured" : "empty",
    defaultProvider: registry.defaultProvider,
    summary: {
      total: items.length,
      enabledCount: items.filter((item) => item.enabled).length,
      readyCount: items.filter((item) => item.validation.ready).length,
      credentialMissingCount: items.filter((item) => item.validation.checks.credentialPresent === false).length,
    },
    items,
    limits: LLM_PROVIDER_REGISTRY_CONTRACT.safetyBoundary,
  };
}

export function validateLlmProviderConfig(store, providerId, options = {}) {
  return getLlmProviderConfig(store, providerId, options).validation;
}

export function resolveConfiguredLlmProvider(store, provider, options = {}) {
  assertNoInlineSecrets(options);
  if (!provider) return null;
  if (typeof provider === "object") return createLlmProvider(provider, options);
  if (provider === "mock") return createLlmProvider("mock", options);

  const registry = readRegistry(store);
  const requestedId = provider === "default" ? registry.defaultProvider : String(provider);
  if (!requestedId) throw new Error("no default LLM provider is configured");
  const profile = registry.profiles.find((item) => item.id === requestedId);
  if (!profile) {
    return createLlmProvider(requestedId, options);
  }

  const validation = validateProfile(profile, options.env ?? process.env);
  if (!validation.ready) {
    throw new Error(`llm provider profile is not ready: ${profile.id} (${validation.failureCodes.join(",")})`);
  }
  const apiKey = profile.apiKeyEnv ? (options.env ?? process.env)[profile.apiKeyEnv] : undefined;
  const runtime = {
    id: profile.id,
    model: options.model ?? profile.model,
    baseUrl: profile.baseUrl,
    path: profile.path,
    apiKey,
    timeoutMs: options.timeoutMs ?? profile.timeoutMs,
    temperature: options.temperature ?? profile.temperature,
    maxTokens: options.maxTokens ?? profile.maxTokens,
    jsonMode: profile.jsonMode,
  };
  if (profile.protocol === "anthropic_messages") {
    return createAnthropicLlmProvider({
      ...runtime,
      anthropicVersion: profile.anthropicVersion,
    });
  }
  return createOpenAiCompatibleLlmProvider({
    ...runtime,
    extraBody: profile.kind === "deepseek" && profile.thinking
      ? {
          thinking: { type: profile.thinking },
          ...(profile.reasoningEffort ? { reasoning_effort: profile.reasoningEffort } : {}),
        }
      : undefined,
  });
}

export function hasLlmProviderConfig(store, providerId) {
  if (!providerId) return false;
  return readRegistry(store).profiles.some((item) => item.id === providerId);
}

function normalizeProfile(input) {
  const model = normalizeRequiredText(input.model, "model", 160);
  const baseUrl = normalizeEndpoint(input.baseUrl);
  const endpointPath = normalizeEndpointPath(input.path);
  const apiKeyEnv = normalizeEnvName(input.apiKeyEnv, input.kind !== "local");
  const timeoutMs = boundedNumber(input.timeoutMs, 30000, 1000, 300000, "timeoutMs", true);
  const maxTokens = boundedNumber(input.maxTokens, 1200, 1, 32768, "maxTokens", true);
  const temperature = boundedNumber(input.temperature, 0.2, 0, 2, "temperature", false);
  const thinking = input.thinking === undefined || input.thinking === null || input.thinking === ""
    ? null
    : String(input.thinking);
  if (thinking && input.kind !== "deepseek") throw new Error("thinking is only supported for deepseek profiles");
  if (thinking && !["enabled", "disabled"].includes(thinking)) throw new Error("thinking must be enabled or disabled");
  const reasoningEffort = input.reasoningEffort === undefined || input.reasoningEffort === null || input.reasoningEffort === ""
    ? null
    : String(input.reasoningEffort);
  if (reasoningEffort && !["high", "max"].includes(reasoningEffort)) throw new Error("reasoningEffort must be high or max");
  return {
    id: normalizeId(input.id),
    kind: normalizeKind(input.kind),
    protocol: input.protocol,
    enabled: input.enabled !== false,
    baseUrl,
    path: endpointPath,
    model,
    apiKeyEnv,
    timeoutMs,
    maxTokens,
    temperature,
    jsonMode: input.jsonMode !== false,
    anthropicVersion: input.protocol === "anthropic_messages"
      ? normalizeRequiredText(input.anthropicVersion ?? "2023-06-01", "anthropicVersion", 40)
      : null,
    thinking,
    reasoningEffort,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    updatedBy: input.updatedBy,
  };
}

function describeProfile(profile, env, defaultProvider) {
  const validation = validateProfile(profile, env);
  return {
    id: profile.id,
    kind: profile.kind,
    protocol: profile.protocol,
    enabled: profile.enabled,
    baseUrl: profile.baseUrl,
    path: profile.path,
    model: profile.model,
    apiKeyEnv: profile.apiKeyEnv,
    timeoutMs: profile.timeoutMs,
    maxTokens: profile.maxTokens,
    temperature: profile.temperature,
    jsonMode: profile.jsonMode,
    anthropicVersion: profile.anthropicVersion,
    thinking: profile.thinking,
    reasoningEffort: profile.reasoningEffort,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    updatedBy: profile.updatedBy,
    credential: {
      required: Boolean(profile.apiKeyEnv),
      env: profile.apiKeyEnv,
      present: validation.checks.credentialPresent,
    },
    isDefault: defaultProvider === profile.id,
    validation,
    limits: LLM_PROVIDER_REGISTRY_CONTRACT.safetyBoundary,
  };
}

function validateProfile(profile, env) {
  const credentialPresent = profile.apiKeyEnv ? hasNonEmptyEnv(env, profile.apiKeyEnv) : true;
  const checks = {
    enabled: profile.enabled === true,
    kindSupported: LLM_PROVIDER_REGISTRY_CONTRACT.kinds.includes(profile.kind),
    endpointAllowed: endpointIsAllowed(profile.baseUrl),
    pathAllowed: endpointPathIsAllowed(profile.path),
    modelConfigured: typeof profile.model === "string" && profile.model.trim().length > 0,
    protocolSupported: LLM_PROVIDER_REGISTRY_CONTRACT.protocols.includes(profile.protocol),
    protocolMatchesKind: protocolMatchesKind(profile.protocol, profile.kind),
    credentialReferenceValid: credentialReferenceIsValid(profile.apiKeyEnv, profile.kind),
    runtimeBoundsValid: runtimeBoundsAreValid(profile),
    credentialPresent,
  };
  const failureCodes = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => camelToSnake(name));
  return {
    providerId: profile.id,
    mode: "offline_configuration_only",
    ready: failureCodes.length === 0,
    status: failureCodes.length ? "not_ready" : "ready_for_execution",
    checks,
    failureCodes,
    networkRequestSent: false,
    evidence: profile.apiKeyEnv
      ? `${profile.apiKeyEnv} is ${credentialPresent ? "present" : "absent"}; its value was not returned or persisted.`
      : "This profile does not require an API-key environment variable.",
  };
}

function readRegistry(store) {
  const filePath = registryPath(store);
  if (!fs.existsSync(filePath)) {
    return { version: 1, defaultProvider: null, profiles: [], updatedAt: null };
  }
  const value = readJson(filePath);
  return {
    version: 1,
    defaultProvider: value.defaultProvider ?? null,
    profiles: Array.isArray(value.profiles) ? value.profiles.map(sanitizeStoredProfile) : [],
    updatedAt: value.updatedAt ?? null,
  };
}

function sanitizeStoredProfile(profile) {
  return {
    id: profile.id,
    kind: profile.kind,
    protocol: profile.protocol,
    enabled: profile.enabled === true,
    baseUrl: profile.baseUrl,
    path: profile.path,
    model: profile.model,
    apiKeyEnv: profile.apiKeyEnv ?? null,
    timeoutMs: profile.timeoutMs,
    maxTokens: profile.maxTokens,
    temperature: profile.temperature,
    jsonMode: profile.jsonMode !== false,
    anthropicVersion: profile.anthropicVersion ?? null,
    thinking: profile.thinking ?? null,
    reasoningEffort: profile.reasoningEffort ?? null,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    updatedBy: profile.updatedBy,
  };
}
function writeRegistry(store, registry) {
  writeJson(registryPath(store), registry);
}

function registryPath(store) {
  return path.join(store.root, "llm-providers.json");
}

function audit(store, type, profile, actor) {
  appendJsonl(path.join(store.root, "audit.jsonl"), {
    type,
    providerId: profile.id,
    kind: profile.kind,
    model: profile.model,
    baseUrl: profile.baseUrl,
    apiKeyEnv: profile.apiKeyEnv,
    createdAt: new Date().toISOString(),
    actor: actor ?? "local-user",
  });
}

function compactDefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}
function assertNoInlineSecrets(value) {
  if (!value || typeof value !== "object") return;
  const forbidden = FORBIDDEN_SECRET_FIELDS.find((field) => Object.prototype.hasOwnProperty.call(value, field));
  if (forbidden) throw new Error(`${forbidden} must not be provided; configure an environment variable name instead`);
}

function normalizeId(value) {
  const id = String(value ?? "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{0,79}$/.test(id)) throw new Error("provider id must use lowercase letters, numbers, dot, underscore, or hyphen");
  return id;
}

function normalizeKind(value) {
  const kind = String(value ?? "").trim().toLowerCase();
  if (!LLM_PROVIDER_REGISTRY_CONTRACT.kinds.includes(kind)) {
    throw new Error(`provider kind must be one of: ${LLM_PROVIDER_REGISTRY_CONTRACT.kinds.join(", ")}`);
  }
  return kind;
}

function normalizeEndpoint(value) {
  const text = String(value ?? "").trim().replace(/\/+$/, "");
  if (!text) throw new Error("baseUrl is required");
  let url;
  try {
    url = new URL(text);
  } catch {
    throw new Error("baseUrl must be an absolute URL");
  }
  if (url.username || url.password || url.search || url.hash) throw new Error("baseUrl must not contain credentials, query, or fragment");
  if (!endpointIsAllowed(text)) throw new Error("remote baseUrl must use HTTPS; HTTP is allowed only for loopback endpoints");
  return text;
}

function endpointIsAllowed(value) {
  try {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash) return false;
    if (url.protocol === "https:") return true;
    return url.protocol === "http:" && ["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname);
  } catch {
    return false;
  }
}

function endpointPathIsAllowed(value) {
  const text = String(value ?? "");
  return /^\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*$/.test(text) && !text.includes("..");
}

function protocolMatchesKind(protocol, kind) {
  if (kind === "anthropic") return protocol === "anthropic_messages";
  return protocol === "openai_chat_completions";
}

function credentialReferenceIsValid(value, kind) {
  if (value === null || value === undefined || value === "") return kind === "local";
  return /^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(String(value));
}

function runtimeBoundsAreValid(profile) {
  return Number.isSafeInteger(profile.timeoutMs)
    && profile.timeoutMs >= 1000
    && profile.timeoutMs <= 300000
    && Number.isSafeInteger(profile.maxTokens)
    && profile.maxTokens >= 1
    && profile.maxTokens <= 32768
    && Number.isFinite(profile.temperature)
    && profile.temperature >= 0
    && profile.temperature <= 2;
}
function normalizeEndpointPath(value) {
  const text = String(value ?? "").trim();
  if (!/^\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*$/.test(text) || text.includes("..")) {
    throw new Error("path must be a safe absolute URL path");
  }
  return text;
}

function normalizeEnvName(value, required) {
  if ((value === undefined || value === null || value === "") && !required) return null;
  const text = String(value ?? "").trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(text)) throw new Error("apiKeyEnv must be a valid environment variable name");
  return text;
}

function normalizeRequiredText(value, name, maxLength) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${name} is required`);
  if (text.length > maxLength) throw new Error(`${name} exceeds ${maxLength} characters`);
  return text;
}

function boundedNumber(value, fallback, minimum, maximum, name, integer) {
  const number = value === undefined || value === null || value === "" ? fallback : Number(value);
  if (!Number.isFinite(number) || number < minimum || number > maximum || (integer && !Number.isSafeInteger(number))) {
    throw new Error(`${name} must be ${integer ? "an integer" : "a number"} between ${minimum} and ${maximum}`);
  }
  return number;
}

function hasNonEmptyEnv(env, name) {
  return Object.prototype.hasOwnProperty.call(env, name) && String(env[name] ?? "").trim().length > 0;
}

function camelToSnake(value) {
  return value.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);
}