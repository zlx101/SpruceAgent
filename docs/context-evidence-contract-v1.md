# Context Evidence Contract v1

## Purpose

`spruceagent.context-evidence` turns ContextOS retrieval into a read-only evidence envelope that an Agent Run can inspect and an LLM planner can receive safely. It builds on the existing workspace index, lexical retrieval, memory store, secret redaction, and freshness guard; it does not replace them.

Each source records:

- origin and locator (`workspace_index` path or `memory_store` id)
- indexed content hash when the source is a workspace document
- retrieval rank and lexical score where available
- trust level and reference-only authority
- workspace/index freshness state
- explicit model, planning, execution, and policy data-flow permissions
- secret-redaction and prompt-injection signals

## Safety Model

Workspace and memory material is reference data, never executable authority. Normal sources have:

```json
{
  "model": "allow",
  "planning": "reference_only",
  "execution": "deny",
  "policy": "deny"
}
```

Potential prompt injection is detected using conservative English and Simplified Chinese heuristics, including instruction override, system/developer role claims, and role tags. A detected source is quarantined: its excerpt is withheld and all four data-flow permissions deny or withhold it. The detector is defense in depth, not a claim that arbitrary malicious text can always be recognized.

The envelope never grants tool permission. TrustKernel policy, approval tickets, and risk preflight remain the only execution authority. Context Evidence v1 does not fetch remote sources, write files, run tools, or persist a second copy of personal data.

## Agent Integration

`runAgent` now records a `context.evidence` trace event and returns `contextEvidence`. When an LLM planner is connected, it receives `createModelContextFromEvidence(...)`, which contains only non-quarantined excerpts plus an explicit instruction that all evidence is untrusted reference data. Rule-based execution continues to use the existing deterministic plan and TrustKernel gates.

## CLI

```powershell
npm run spruce -- context evidence-contract
npm run spruce -- context evidence "TrustKernel approval" --limit 5 --memoryLimit 3
```

## GatewayMesh

All endpoints require the existing local gateway token:

```text
GET  /v1/context/evidence-contract
POST /v1/context/evidence
```

Example body:

```json
{
  "query": "TrustKernel approval",
  "limit": 5,
  "memoryLimit": 3,
  "includeMemory": true
}
```

## Known Limits

- Retrieval remains lexical; it is not embedding or semantic retrieval.
- A content hash proves the indexed bytes, not that the working file is unchanged after indexing. Use ContextOS freshness checks before context-sensitive execution.
- Trust levels describe local provenance, not factual truth.
- v1 has workspace and stored-memory evidence only. Remote, team, calendar, browser, and connector sources require explicit provenance and permission adapters before being added.
