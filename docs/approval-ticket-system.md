# Approval Ticket System

SpruceAgent now treats approval as a durable object, not a transient flag.

This is the bridge from a local developer CLI to desktop approvals, team approvals, remote execution, and governed autonomy.

## Why Approval Tickets Exist

Returning `requires_approval` is not enough for a serious SuperAgent.

The system needs to know:

- what was requested
- who requested it
- what policy decision caused approval
- what exact input was approved
- who approved or rejected it
- whether it expired
- whether it was consumed by execution

Approval tickets make this inspectable and auditable.

## Lifecycle

```text
pending -> approved -> consumed
pending -> rejected
pending -> expired
```

Approved tickets are single-use. A consumed ticket cannot be reused.

## Safety Rules

| Rule | Behavior |
| --- | --- |
| Input binding | A ticket only authorizes the exact tool input it was created for |
| Tool binding | A ticket cannot be reused for another tool |
| Single-use | Approved tickets become `consumed` after execution |
| Rejection | Rejected tickets cannot execute |
| Expiry | Pending tickets expire automatically on read after `expiresAt` |
| Critical risk | Critical execution still requires explicit `allowCritical` |

## CLI Flow

Create a pending ticket:

```bash
npm run spruce -- tool run file.write --path notes.txt --content "hello"
```

Approve it:

```bash
npm run spruce -- approval approve <approvalId>
```

Execute with the approved ticket:

```bash
npm run spruce -- tool run file.write --path notes.txt --content "hello" --approvalId <approvalId>
```

Inspect approvals:

```bash
npm run spruce -- approval list --status pending
npm run spruce -- approval get <approvalId>
```

Reject an approval:

```bash
npm run spruce -- approval reject <approvalId>
```

## Storage

Approvals are stored under:

```text
.spruceagent/
  approvals/
    approval_*.json
  approval-index.jsonl
  audit.jsonl
```

The approval index is optimized for listing. The per-ticket JSON file is the source of truth.

## Future Work

- desktop approval inbox
- team approval roles
- expiration policy profiles
- approval comments
- approval delegation
- remote approval notifications
- signed approval records
