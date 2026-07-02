# Run Risk Preflight v0

Run Risk Preflight v0 previews TrustKernel policy decisions for planned agent, workflow, and candidate steps before tools run.

## What It Does

- Reviews planned tool calls without executing them.
- Reports `passed`, `warning`, or `blocked`.
- Marks low-risk allowed actions as `allow`.
- Marks approval-gated actions as `requires_approval`.
- Marks denied or structurally blocked actions as `blocked`.
- Records `run.risk_preflight` trace events for agent runs and workflow runs.

## Runtime Behavior

`requires_approval` is a warning, not a hard blocker. The run can proceed until TrustKernel creates or requires a real approval ticket.

`deny` and `blocked` are hard blockers for real execution. Dry-runs still return the risk report without executing tools.

## Gateway

The local gateway exposes:

```http
POST /v1/preflight/risk
```

Example body:

```json
{
  "trustMode": "approve",
  "plan": {
    "steps": [
      {
        "id": "write_report",
        "kind": "tool",
        "toolName": "file.write",
        "input": {
          "path": "report.md",
          "content": "draft"
        }
      }
    ]
  }
}
```

## Safety Boundary

Risk Preflight v0 does not execute tools, write files, create approval tickets, approve tickets, call LLM providers, or mutate workflow definitions. It only previews local policy decisions against the declared plan.

## Limits

- v0 uses static planned tool inputs.
- It cannot predict runtime data produced by prior steps.
- Skill workflow steps are expanded only through approved typed executable skill steps.
- Policy preview is not an approval ticket.
