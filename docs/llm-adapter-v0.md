# LLM Adapter v0

SpruceAgent has a multi-provider LLM planning boundary and an offline Provider Registry.

The LLM Adapter converts provider responses into non-executable plan drafts. The Provider Registry supplies validated endpoint metadata and credential environment-variable references. Neither layer grants tool authority.

## Core APIs

Adapter APIs:

- `getLlmAdapterContract()`
- `createMockLlmProvider()`
- `createDeepSeekLlmProvider()`
- `createOpenAiLlmProvider()`
- `createAnthropicLlmProvider()`
- `createLocalLlmProvider()`
- `createOpenAiCompatibleLlmProvider()`
- `createLlmProvider()`
- `draftLlmPlan()`

Registry APIs:

- `getLlmProviderRegistryContract()`
- `configureLlmProvider()`
- `listLlmProviderConfigs()`
- `getLlmProviderConfig()`
- `validateLlmProviderConfig()`
- `resolveConfiguredLlmProvider()`
- `removeLlmProviderConfig()`

See [LLM Provider Registry v0](llm-provider-registry-v0.md) for configuration, current official endpoint facts, CLI, Gateway, and credential handling.

## Planning Flow

```text
ContextOS
  -> explicit Provider profile selection
  -> credential lookup from environment
  -> Provider API request
  -> non-executable LLM draft
  -> trace
  -> Planner Promotion
  -> Candidate Execution
  -> TrustKernel
  -> approval and tool result
```

Provider configuration does not automatically trigger the API request. Agent Run or Workflow Builder must explicitly select a profile.

## Response Normalization

Every proposed step is normalized to:

```json
{
  "executable": false
}
```

A Provider may suggest `toolName` and `input`, but these remain candidates. Even when a model returns `executable: true`, SpruceAgent resets it to `false`.

Trace records contain provider/model identifiers, context paths, normalized drafts, usage summaries, and sanitized errors. They do not contain API keys or authorization headers.

## Current Verification

The automated suite intercepts HTTP locally and verifies:

- OpenAI-compatible and DeepSeek bearer authorization plus Chat Completions request shape;
- DeepSeek thinking configuration fields;
- Anthropic `x-api-key`, `anthropic-version`, Messages request and response shape;
- configured profiles resolving through Agent Run;
- no credential persistence in Registry files;
- Gateway configuration and validation without network requests.

No real Provider request is made by these tests. Live API verification is a separate, explicit operation to run only after the project configuration is complete.

## Safety Boundary

- LLM output never executes tools directly.
- Provider profiles never store credentials.
- Inline credentials are rejected from CLI/Gateway workflow configuration paths.
- Configuration readiness is not presented as live API verification.
- Live Provider errors become failed draft results and do not authorize fallback actions.
- Planner Promotion, Candidate Execution, TrustKernel, approvals, and audit remain mandatory.