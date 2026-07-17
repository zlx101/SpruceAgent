# LLM Provider Registry v0

LLM Provider Registry v0 configures real model endpoints without storing credentials or sending validation requests.

## Evidence States

SpruceAgent keeps three states separate:

1. `ready_for_execution`: profile structure is valid and its required environment variable is non-empty.
2. request-contract tested: local tests verified URL, headers, and body through an intercepted `fetch` implementation.
3. live verified: a real provider request completed successfully.

Registry `validate` only establishes the first state. This implementation has request-contract tests but deliberately does not perform live verification.

## Supported Kinds

| Kind | Protocol | Default endpoint | Credential reference |
| --- | --- | --- | --- |
| `deepseek` | OpenAI Chat Completions | `https://api.deepseek.com/chat/completions` | `DEEPSEEK_API_KEY` |
| `openai` | OpenAI Chat Completions | `https://api.openai.com/v1/chat/completions` | `OPENAI_API_KEY` |
| `anthropic` | Anthropic Messages | `https://api.anthropic.com/v1/messages` | `ANTHROPIC_API_KEY` |
| `local` | OpenAI Chat Completions | `http://127.0.0.1:11434/v1/chat/completions` | none |
| `openai-compatible` | OpenAI Chat Completions | explicit HTTPS endpoint | explicit environment variable name |

The DeepSeek defaults follow the current official API documentation: `deepseek-v4-flash` and `deepseek-v4-pro` use the OpenAI-compatible Chat Completions endpoint. Legacy `deepseek-chat` and `deepseek-reasoner` are scheduled for deprecation on 2026-07-24.

Primary references:

- [DeepSeek first API call](https://api-docs.deepseek.com/)
- [DeepSeek Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion)
- [OpenAI Chat Completions](https://platform.openai.com/docs/api-reference/chat/create)
- [Anthropic Messages API](https://docs.anthropic.com/en/api/messages)
- [Ollama OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility)

## Stored Profile

`.spruceagent/llm-providers.json` stores metadata only:

```json
{
  "id": "deepseek",
  "kind": "deepseek",
  "protocol": "openai_chat_completions",
  "baseUrl": "https://api.deepseek.com",
  "path": "/chat/completions",
  "model": "deepseek-v4-flash",
  "apiKeyEnv": "DEEPSEEK_API_KEY",
  "timeoutMs": 30000,
  "maxTokens": 1200,
  "temperature": 0.2
}
```

The file never stores an API key, bearer token, authorization header, custom headers, or provider response.

## CLI

Configure metadata without contacting the provider:

```bash
npm run spruce -- llm configure deepseek \
  --kind deepseek \
  --model deepseek-v4-flash \
  --apiKeyEnv DEEPSEEK_API_KEY \
  --default
```

Other examples:

```bash
npm run spruce -- llm configure openai \
  --kind openai \
  --model gpt-4.1-mini \
  --apiKeyEnv OPENAI_API_KEY

npm run spruce -- llm configure anthropic \
  --kind anthropic \
  --model claude-sonnet-4-20250514 \
  --apiKeyEnv ANTHROPIC_API_KEY

npm run spruce -- llm configure ollama-local \
  --kind local \
  --model gpt-oss:20b
```

Inspect and validate offline:

```bash
npm run spruce -- llm providers
npm run spruce -- llm detail deepseek
npm run spruce -- llm validate deepseek
```

A validation response always includes:

```json
{
  "mode": "offline_configuration_only",
  "networkRequestSent": false
}
```

Removing a profile also stays local:

```bash
npm run spruce -- llm remove <providerId>
```

## Explicit Execution

A configured profile never runs automatically. Agent Run must explicitly select it:

```bash
npm run spruce -- run "Draft a safe plan" \
  --context "TrustKernel" \
  --llm deepseek \
  --dryRun
```

That command is intentionally deferred until live verification is authorized. Even during a live call, the model only returns a non-executable planning draft.

## Gateway

```text
GET    /v1/llm/providers/contract
GET    /v1/llm/providers
POST   /v1/llm/providers
GET    /v1/llm/providers/:providerId
GET    /v1/llm/providers/:providerId/validate
DELETE /v1/llm/providers/:providerId
```

Gateway configuration rejects `apiKey`, `token`, `secret`, `authorization`, `authToken`, and `headers` fields.

## Security Boundary

- remote endpoints require HTTPS;
- HTTP is allowed only for `localhost`, `127.0.0.1`, or `::1`;
- URLs cannot contain embedded credentials, query parameters, or fragments;
- endpoint paths cannot traverse with `..`;
- API credentials are read from the named environment variable only when a selected Provider is resolved;
- validation checks non-empty credential presence but never returns or persists the value;
- no health check, model listing, generation, billing, or quota request occurs during configuration or validation;
- Provider output remains draft-only and cannot bypass Planner Promotion, TrustKernel, approvals, or audit.