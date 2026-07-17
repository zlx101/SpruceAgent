import { appendTraceEvent } from "./trace.js";

export const LLM_ADAPTER_CONTRACT = Object.freeze({
  version: "0.2.0",
  interface: "spruceagent.llm-adapter",
  defaultProvider: "mock",
  supportedProviders: ["mock", "deepseek", "openai", "anthropic", "local", "openai-compatible", "custom"],
  outputKind: "plan_draft",
  safetyBoundary: [
    "LLM Adapter v0 never executes tools.",
    "LLM Adapter v0 returns planning drafts only.",
    "Tool execution remains owned by TrustKernel and executeTool.",
    "Provider outputs must be traceable before they can influence a run.",
  ],
  requestShape: {
    goal: "string",
    context: "contextPack",
    knownFacts: "object",
    skill: "approvedSkill|null",
  },
  responseShape: {
    provider: "string",
    model: "string",
    status: "drafted|failed",
    planDraft: "object; proposedSteps are always executable=false and may include toolName/input candidates",
  },
});

export function getLlmAdapterContract() {
  return LLM_ADAPTER_CONTRACT;
}

export function createMockLlmProvider(options = {}) {
  return {
    id: options.id ?? "mock",
    model: options.model ?? "mock-planner-v0",
    async draftPlan(request) {
      const topContext = request.context?.results?.[0];
      return {
        provider: options.id ?? "mock",
        model: options.model ?? "mock-planner-v0",
        status: "drafted",
        createdAt: new Date().toISOString(),
        planDraft: {
          planner: "mock_llm_v0",
          goal: request.goal,
          summary: topContext
            ? `Review ${topContext.path} before proposing actions.`
            : "No indexed context was available; ask for context or run workspace indexing.",
          proposedSteps: [
            {
              id: "llm_draft_step_1",
              kind: "analysis",
              description: "Review retrieved context and restate the task constraints.",
              executable: false,
            },
            {
              id: "llm_draft_step_2",
              kind: "planning",
              description: "Map the goal into safe tool or workflow candidates.",
              executable: false,
            },
          ],
          constraints: [
            "Do not execute tools from LLM output.",
            "Require TrustKernel policy for every action.",
            "Prefer approved skills and existing workflows before creating new actions.",
          ],
        },
        raw: {
          deterministic: true,
        },
      };
    },
  };
}

export function createOpenAiCompatibleLlmProvider(options = {}) {
  const providerId = options.id ?? "openai-compatible";
  const model = options.model;
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const apiKey = options.apiKey;
  if (!model) throw new Error(`${providerId} model is required`);
  if (!baseUrl) throw new Error(`${providerId} baseUrl is required`);

  return {
    id: providerId,
    model,
    baseUrl,
    async draftPlan(request) {
      const response = await fetchJson(`${baseUrl}${options.path ?? "/chat/completions"}`, {
        method: "POST",
        headers: {
          ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
          "content-type": "application/json",
        },
        body: {
          model,
          messages: buildOpenAiMessages(request),
          temperature: options.temperature ?? 0.2,
          max_tokens: options.maxTokens ?? 1200,
          ...(options.jsonMode === false ? {} : { response_format: { type: "json_object" } }),
          ...(options.extraBody ?? {}),
        },
        timeoutMs: options.timeoutMs,
      });
      const content = response.choices?.[0]?.message?.content ?? "";
      return providerTextToDraft({
        provider: providerId,
        model,
        content,
        raw: summarizeProviderRaw(response),
      });
    },
  };
}

export function createDeepSeekLlmProvider(options = {}) {
  return createOpenAiCompatibleLlmProvider({
    id: "deepseek",
    baseUrl: options.baseUrl ?? "https://api.deepseek.com",
    model: options.model ?? "deepseek-v4-flash",
    apiKey: options.apiKey ?? process.env.DEEPSEEK_API_KEY,
    jsonMode: options.jsonMode ?? true,
    timeoutMs: options.timeoutMs,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
  });
}

export function createOpenAiLlmProvider(options = {}) {
  return createOpenAiCompatibleLlmProvider({
    id: "openai",
    baseUrl: options.baseUrl ?? "https://api.openai.com/v1",
    model: options.model ?? "gpt-4.1-mini",
    apiKey: options.apiKey ?? process.env.OPENAI_API_KEY,
    jsonMode: options.jsonMode ?? true,
    timeoutMs: options.timeoutMs,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
  });
}

export function createLocalLlmProvider(options = {}) {
  return createOpenAiCompatibleLlmProvider({
    id: "local",
    baseUrl: options.baseUrl ?? "http://127.0.0.1:11434/v1",
    model: options.model ?? "local-model",
    apiKey: options.apiKey,
    jsonMode: options.jsonMode ?? false,
    timeoutMs: options.timeoutMs,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
  });
}

export function createAnthropicLlmProvider(options = {}) {
  const providerId = options.id ?? "anthropic";
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? "https://api.anthropic.com");
  const model = options.model ?? "claude-sonnet-4-20250514";
  const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error(`${providerId} apiKey is required`);

  return {
    id: providerId,
    model,
    baseUrl,
    async draftPlan(request) {
      const response = await fetchJson(`${baseUrl}${options.path ?? "/v1/messages"}`, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": options.anthropicVersion ?? "2023-06-01",
          "content-type": "application/json",
        },
        body: {
          model,
          max_tokens: options.maxTokens ?? 1200,
          temperature: options.temperature ?? 0.2,
          system: buildSystemPrompt(),
          messages: [
            {
              role: "user",
              content: buildUserPrompt(request),
            },
          ],
          ...(options.extraBody ?? {}),
        },
        timeoutMs: options.timeoutMs,
      });
      const content = (response.content ?? [])
        .filter((item) => item.type === "text")
        .map((item) => item.text)
        .join("\n");
      return providerTextToDraft({
        provider: providerId,
        model,
        content,
        raw: summarizeProviderRaw(response),
      });
    },
  };
}

export function createLlmProvider(provider, options = {}) {
  if (!provider) return null;
  if (provider === "mock") return createMockLlmProvider(options);
  if (provider === "deepseek") return createDeepSeekLlmProvider(options);
  if (provider === "openai") return createOpenAiLlmProvider(options);
  if (provider === "anthropic") return createAnthropicLlmProvider(options);
  if (provider === "local") return createLocalLlmProvider(options);
  if (provider === "openai-compatible") return createOpenAiCompatibleLlmProvider(options);
  if (typeof provider === "object" && typeof provider.draftPlan === "function") return provider;
  throw new Error("unsupported llmProvider; use mock, deepseek, openai, anthropic, local, openai-compatible, or a provider object");
}

export async function draftLlmPlan(store, input) {
  const provider = input.provider;
  if (!provider || typeof provider.draftPlan !== "function") {
    throw new Error("llm provider with draftPlan(request) is required");
  }

  const request = {
    goal: input.goal,
    context: input.context,
    knownFacts: input.knownFacts,
    skill: input.skill ?? null,
    metadata: input.metadata ?? {},
  };

  if (input.traceId) {
    appendTraceEvent(store, input.traceId, "llm.request", redactLlmRequest(request, provider));
  }

  try {
    const response = normalizeLlmResponse(await provider.draftPlan(request), provider);
    if (input.traceId) {
      appendTraceEvent(store, input.traceId, "llm.response", response);
    }
    return response;
  } catch (error) {
    const response = {
      provider: provider.id ?? "unknown",
      model: provider.model ?? "unknown",
      status: "failed",
      createdAt: new Date().toISOString(),
      error: {
        message: error.message,
      },
      planDraft: null,
    };
    if (input.traceId) {
      appendTraceEvent(store, input.traceId, "llm.response", response);
    }
    return response;
  }
}

function normalizeLlmResponse(response, provider) {
  const normalized = {
    provider: response?.provider ?? provider.id ?? "unknown",
    model: response?.model ?? provider.model ?? "unknown",
    status: response?.status ?? "drafted",
    createdAt: response?.createdAt ?? new Date().toISOString(),
    planDraft: response?.planDraft ?? null,
    raw: response?.raw,
  };

  if (!normalized.planDraft || typeof normalized.planDraft !== "object") {
    throw new Error("llm response must include a planDraft object");
  }
  if (!Array.isArray(normalized.planDraft.proposedSteps)) {
    normalized.planDraft.proposedSteps = [];
  }
  normalized.planDraft.proposedSteps = normalized.planDraft.proposedSteps.map((step, index) => ({
    ...step,
    id: step.id ?? `llm_draft_step_${index + 1}`,
    kind: step.kind ?? "planning",
    description: step.description ?? "",
    executable: false,
    toolName: typeof step.toolName === "string" ? step.toolName : null,
    input: step.input && typeof step.input === "object" && !Array.isArray(step.input) ? step.input : step.input ?? null,
  }));
  return normalized;
}

function buildOpenAiMessages(request) {
  return [
    {
      role: "system",
      content: buildSystemPrompt(),
    },
    {
      role: "user",
      content: buildUserPrompt(request),
    },
  ];
}

function buildSystemPrompt() {
  return [
    "You are the SpruceAgent planning adapter.",
    "Return only JSON.",
    "You may draft a plan, but you must not claim to execute tools.",
    "Every proposed step must be non-executable and must respect TrustKernel approval boundaries.",
    "A proposed step may include toolName and input only as a requested candidate for later Planner Promotion.",
    "Return shape: {\"summary\":\"string\",\"proposedSteps\":[{\"id\":\"string\",\"kind\":\"analysis|planning|context|safety|tool\",\"description\":\"string\",\"executable\":false,\"toolName\":\"string|null\",\"input\":\"object|null\"}],\"constraints\":[\"string\"]}.",
  ].join("\n");
}

function buildUserPrompt(request) {
  return JSON.stringify({
    goal: request.goal,
    context: {
      query: request.context?.query,
      resultCount: request.context?.resultCount ?? 0,
      results: (request.context?.results ?? []).slice(0, 5).map((item) => ({
        path: item.path,
        score: item.score,
        snippet: item.snippet,
      })),
    },
    knownFacts: request.knownFacts,
    skill: request.skill
      ? {
          id: request.skill.id,
          name: request.skill.name,
          version: request.skill.version,
          summary: request.skill.summary,
          steps: request.skill.steps,
        }
      : null,
  });
}

function providerTextToDraft(input) {
  const parsed = parseJsonObjectFromText(input.content);
  return {
    provider: input.provider,
    model: input.model,
    status: "drafted",
    createdAt: new Date().toISOString(),
    planDraft: {
      planner: `${input.provider}_llm_v0`,
      goal: parsed.goal,
      summary: parsed.summary ?? "Provider returned a planning draft.",
      proposedSteps: sanitizeDraftSteps(parsed.proposedSteps),
      constraints: Array.isArray(parsed.constraints)
        ? parsed.constraints
        : [
            "Do not execute tools from LLM output.",
            "Require TrustKernel policy for every action.",
          ],
    },
    raw: input.raw,
  };
}

function sanitizeDraftSteps(steps) {
  if (!Array.isArray(steps)) return [];
  return steps.map((step, index) => ({
    ...step,
    id: step.id ?? `llm_draft_step_${index + 1}`,
    kind: step.kind ?? "planning",
    description: step.description ?? "",
    executable: false,
    toolName: typeof step.toolName === "string" ? step.toolName : null,
    input: step.input && typeof step.input === "object" && !Array.isArray(step.input) ? step.input : step.input ?? null,
  }));
}

function parseJsonObjectFromText(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) {
    throw new Error("provider returned empty content");
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("provider response did not contain JSON");
    return JSON.parse(match[0]);
  }
}

async function fetchJson(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(options.timeoutMs ?? 30000));
  try {
    const response = await fetch(url, {
      method: options.method,
      headers: options.headers,
      body: JSON.stringify(options.body),
      signal: controller.signal,
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : {};
    if (!response.ok) {
      throw new Error(`provider request failed: ${response.status} ${body.error?.message ?? response.statusText}`);
    }
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

function summarizeProviderRaw(response) {
  return {
    id: response.id,
    object: response.object,
    model: response.model,
    usage: response.usage,
    stop_reason: response.stop_reason,
    stop_sequence: response.stop_sequence,
  };
}

function normalizeBaseUrl(value) {
  return String(value ?? "").replace(/\/+$/, "");
}

function redactLlmRequest(request, provider) {
  return {
    provider: provider.id ?? "unknown",
    model: provider.model ?? "unknown",
    goal: request.goal,
    context: {
      query: request.context?.query,
      resultCount: request.context?.resultCount ?? 0,
      paths: (request.context?.results ?? []).map((item) => item.path),
    },
    knownFacts: request.knownFacts,
    skill: request.skill
      ? {
          id: request.skill.id,
          name: request.skill.name,
          version: request.skill.version,
        }
      : null,
  };
}
