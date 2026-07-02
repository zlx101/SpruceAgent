# LLM Adapter v0

SpruceAgent now has the first multi-provider LLM adapter boundary.

This layer defines how an LLM can produce a planning draft without gaining authority to execute tools.

## Known Facts

Before LLM Adapter v0, SpruceAgent had:

- rule-based Agent Run Loop v0
- ContextOS retrieval
- approved typed skills
- policy-governed tools
- approval tickets
- workflow runs
- GatewayMesh Local API
- Gateway client and route contract

It did not have a stable interface for an LLM planner.

## What LLM Adapter v0 Adds

Core now exports:

- `getLlmAdapterContract()`
- `createMockLlmProvider()`
- `createDeepSeekLlmProvider()`
- `createOpenAiLlmProvider()`
- `createAnthropicLlmProvider()`
- `createLocalLlmProvider()`
- `createOpenAiCompatibleLlmProvider()`
- `createLlmProvider()`
- `draftLlmPlan()`

The adapter contract defines:

- request shape
- response shape
- provider boundary
- draft-only output
- safety boundary

Supported provider ids:

| Provider | Notes |
| --- | --- |
| `mock` | deterministic local draft provider |
| `deepseek` | OpenAI-compatible DeepSeek API |
| `openai` | OpenAI-compatible Chat Completions path |
| `anthropic` | Anthropic Messages API shape |
| `local` | OpenAI-compatible local server, default `http://127.0.0.1:11434/v1` |
| `openai-compatible` | custom OpenAI-compatible base URL |
| `custom` | pass a provider object with `draftPlan(request)` |

## CLI

Read the adapter contract:

```bash
npm run spruce -- llm contract
```

Run the agent with mock LLM drafting:

```bash
npm run spruce -- run "Draft a safe plan" --context "TrustKernel" --llm mock --dryRun
```

Run with DeepSeek:

```bash
DEEPSEEK_API_KEY=<token> npm run spruce -- run "Draft a safe plan" --context "TrustKernel" --llm deepseek --llmModel deepseek-v4-flash --dryRun
```

Run with OpenAI:

```bash
OPENAI_API_KEY=<token> npm run spruce -- run "Draft a safe plan" --context "TrustKernel" --llm openai --llmModel gpt-4.1-mini --dryRun
```

Run with a local OpenAI-compatible server:

```bash
npm run spruce -- run "Draft a safe plan" --context "TrustKernel" --llm local --llmBaseUrl http://127.0.0.1:11434/v1 --llmModel <model> --dryRun
```

## Gateway

The Gateway exposes the contract for future UI and adapter layers:

```bash
curl -H "Authorization: Bearer <token>" http://127.0.0.1:7357/v1/llm/contract
```

Gateway agent runs can request mock drafting:

```json
{
  "goal": "Draft a safe plan",
  "context": "TrustKernel",
  "dryRun": true,
  "llmProvider": "mock"
}
```

Gateway agent runs can request DeepSeek drafting:

```json
{
  "goal": "Draft a safe plan",
  "context": "TrustKernel",
  "dryRun": true,
  "llmProvider": "deepseek",
  "llmModel": "deepseek-v4-flash"
}
```

## Safety Boundary

LLM Adapter v0 is deliberately constrained.

- it never executes tools
- it never grants approval
- it never creates skills automatically
- it never changes workflow state
- proposed steps are normalized as non-executable drafts
- proposed `toolName` and `input` fields are only candidates for Planner Promotion
- actual execution remains owned by `executeTool` and TrustKernel

Even if a provider returns `executable: true`, SpruceAgent normalizes the proposed step back to `executable: false`. Tool candidates may be preserved, but they do not execute unless Planner Promotion marks them `ready` and Candidate Execution is explicitly requested.

## DeepSeek Smoke Test

DeepSeek was tested through its OpenAI-compatible API with:

- base URL: `https://api.deepseek.com`
- model: `deepseek-v4-flash`
- endpoint: `/chat/completions`

The smoke run produced:

- `trace_mqwt4vzw_0d0808a8750b`
- `llm.provider`: `deepseek`
- `llm.model`: `deepseek-v4-flash`
- `llm.status`: `drafted`
- all proposed steps normalized to `executable: false`

API keys are not stored by SpruceAgent. Use environment variables.

## Current Limits

LLM Adapter v0 does not yet provide:

- streaming
- tool-call parsing
- JSON schema validation against provider output
- prompt templates
- prompt versioning
- evaluation-driven prompt improvement

Those should come after this boundary is stable.

## Why It Matters

This is the safe path toward a real LLM planner:

```text
Context -> LLM Draft -> Trace -> Planner Promotion -> Candidate Execution -> TrustKernel -> Tool Result
```

The important design decision is that the model can suggest, but SpruceAgent decides through typed plans, policy, approvals, and audit.
