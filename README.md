# SpruceAgent

> The open-source SuperAgent OS for future super individuals and super teams: omnichannel, memory-native, self-improving, and trust-governed.

SpruceAgent is a local-first agent platform designed to evolve beyond today's agent harnesses and become the force multiplier for future super individuals and super teams.

It combines four core ideas:

- **GatewayMesh**: one agent reachable from desktop, CLI, web, chat, mobile, browser, webhooks, and automation triggers.
- **ContextOS**: project and personal context as a durable operating layer, not just chat history.
- **SkillForge**: repeated workflows become versioned, testable, reusable skills.
- **TrustKernel**: every action is governed by identity, permission, risk, approval, audit, and rollback boundaries.

## Name Origin

SpruceAgent is named after the spruce tree: evergreen, resilient, upright, and structured.

The metaphor is intentional. SpruceAgent should be rooted in personal context, branch into tools and entrances, keep long-term memory like an evergreen crown, and grow through repeated work without leaving user control.

See: [Name Origin](docs/spruceagent-name-origin.md)

## Why SpruceAgent

OpenClaw shows that agents need entrances.

Hermes Agent shows that agents need self-improving runtime.

OpenHuman shows that agents need personal context and product experience.

SpruceAgent is designed as the next layer:

> one SuperAgent that can be summoned anywhere, understands your work, learns from repeated tasks, and acts only inside explicit trust boundaries.

## Current Stage

SpruceAgent is in architecture and core foundation development.

Start here:

- [Open Source Alpha Quickstart](docs/open-source-alpha-quickstart.md)
- [Public Showcase](apps/showcase/index.html)
- [Public Showcase v0](docs/public-showcase-v0.md)
- [Contributing](CONTRIBUTING.md)
- [Security Policy](SECURITY.md)
- [Release Checklist](docs/release-checklist.md)
- [Repo Release Kit v0](docs/repo-release-kit-v0.md)
- [SuperAgent Blueprint](docs/spruceagent-superagent-blueprint.md)
- [Open Source Growth Strategy](docs/spruceagent-open-source-growth-strategy.md)
- [Research Upgrade Notes](docs/spruceagent-research-upgrade-2026.md)
- [Foundation Project Revalidation - 2026-07-01](docs/foundation-projects-revalidation-2026-07-01.md)
- [SpruceAgent Showcase Page Brief](docs/spruceagent-showcase-page-brief.md)
- [Core Tool Execution Engine](docs/core-tool-execution-engine.md)
- [Approval Ticket System](docs/approval-ticket-system.md)
- [Workspace Context Retrieval](docs/workspace-context-retrieval.md)
- [ContextOS Index Safety v0](docs/contextos-index-safety-v0.md)
- [ContextOS Incremental Index v0](docs/contextos-incremental-index-v0.md)
- [ContextOS Staleness Guard v0](docs/contextos-staleness-guard-v0.md)
- [Run Preflight / Auto-Reindex v0](docs/run-preflight-auto-reindex-v0.md)
- [Run Risk Preflight v0](docs/run-risk-preflight-v0.md)
- [Approval Queue v0](docs/approval-queue-v0.md)
- [Run Artifact Store v0](docs/run-artifact-store-v0.md)
- [ContextOS Source Map v0](docs/contextos-source-map-v0.md)
- [Agent Run Loop v0](docs/agent-run-loop-v0.md)
- [SkillForge v0](docs/skillforge-v0.md)
- [Skill Lifecycle v0](docs/skill-lifecycle-v0.md)
- [SkillForge Evaluation Harness v0](docs/skillforge-evaluation-harness-v0.md)
- [Skill Promotion / Versioning v0](docs/skill-promotion-versioning-v0.md)
- [Skill Restore / Replay Fixtures v0](docs/skill-restore-replay-fixtures-v0.md)
- [Skill Package / Import-Export v0](docs/skill-package-import-export-v0.md)
- [Typed Executable Skills v0](docs/typed-executable-skills-v0.md)
- [Skill And CLI Ecosystem Research](docs/skill-and-cli-ecosystem-research.md)
- [Capability Evolution Chain](docs/capability-evolution-chain.md)
- [Workflow v0](docs/workflow-v0.md)
- [Workflow Builder v0](docs/workflow-builder-v0.md)
- [Workflow Versioning / Archive v0](docs/workflow-versioning-archive-v0.md)
- [Workflow Inbox / Detail v0](docs/workflow-inbox-detail-v0.md)
- [Workflow Continuation v0](docs/workflow-continuation-v0.md)
- [Evaluation v0](docs/evaluation-v0.md)
- [GatewayMesh Local API v0](docs/gatewaymesh-local-api-v0.md)
- [Gateway Client and Route Contract v0](docs/gateway-client-and-contract-v0.md)
- [LLM Adapter v0](docs/llm-adapter-v0.md)
- [LLM Provider Registry v0](docs/llm-provider-registry-v0.md)
- [Agent Adapter Registry v0](docs/agent-adapter-registry-v0.md)
- [Isolated Agent Workspace v0](docs/isolated-agent-workspace-v0.md)
- [Agent Launcher v0.2](docs/agent-launcher-v0.md)
- [External CLI Launcher v1](docs/external-cli-launcher-v1.md)
- [Fleet Run Orchestrator v0](docs/fleet-run-orchestrator-v0.md)
- [Planner Promotion v0](docs/planner-promotion-v0.md)
- [Candidate Execution v0](docs/candidate-execution-v0.md)
- [Candidate Approval Flow v0](docs/candidate-approval-flow-v0.md)
- [Run Continuation v0](docs/run-continuation-v0.md)
- [Run State / Inbox v0](docs/run-state-inbox-v0.md)
- [Run Detail / Trace Viewer v0](docs/run-detail-trace-viewer-v0.md)
- [Desktop UI Workbench v0](docs/desktop-ui-workbench-v0.md)
- [Workbench Run Launcher v0](docs/workbench-run-launcher-v0.md)
- [Workbench Workflow Editor v0](docs/workbench-workflow-editor-v0.md)
- [Workbench Skill / Workflow Runner v0](docs/workbench-skill-workflow-runner-v0.md)
- [Direction Alignment Check - 2026-06-29](docs/direction-alignment-check-2026-06-29.md)
- [Engineering Principles](docs/engineering-principles.md)

## Local Core Quickstart

```bash
npm run doctor
npm run alpha:smoke
npm test
npm run spruce -- init
npm run spruce -- status
npm run spruce -- memory add "SpruceAgent serves future super individuals and super teams." --tags positioning
npm run spruce -- memory search "super teams"
npm run spruce -- trace start "Ship the first SpruceAgent core"
npm run spruce -- tool list
npm run spruce -- tool run file.read --path README.md
npm run spruce -- tool run file.write --path notes.txt --content "hello"
npm run spruce -- approval list --status pending
npm run spruce -- approval approve <approvalId>
npm run spruce -- tool run file.write --path notes.txt --content "hello" --approvalId <approvalId>
npm run spruce -- context index
npm run spruce -- context search "TrustKernel" --limit 3
npm run spruce -- run "Read TrustKernel context safely" --context "TrustKernel" --limit 2
npm run spruce -- run "Plan only" --context "TrustKernel" --dryRun
npm run spruce -- run "Draft with mock LLM" --context "TrustKernel" --llm mock --dryRun
npm run spruce -- run "Promote draft" --context "TrustKernel" --llm mock --promotePlan --dryRun
npm run spruce -- run "Request candidate approvals" --llm <provider> --promotePlan --requestCandidateApprovals
npm run spruce -- run resume <traceId>
npm run spruce -- run detail <traceId>
npm run spruce -- run detail-contract
npm run spruce -- inbox
npm run spruce -- inbox contract
DEEPSEEK_API_KEY=<token> npm run spruce -- run "Draft with DeepSeek" --context "TrustKernel" --llm deepseek --llmModel deepseek-v4-flash --dryRun
npm run spruce -- skill extract <traceId>
npm run spruce -- skill evaluate <skillId>
npm run spruce -- skill evaluations
npm run spruce -- skill promote <skillId>
npm run spruce -- skill versions <skillId>
npm run spruce -- skill restore <skillId> <revision>
npm run spruce -- skill fixture-create <skillId>
npm run spruce -- skill replay <fixtureId>
npm run spruce -- skill package-export <skillId> --file trustkernel.skillpkg.json
npm run spruce -- skill package-import trustkernel.skillpkg.json
npm run spruce -- skill approve <skillId>
npm run spruce -- run "Use approved skill" --context "TrustKernel" --skill <skillId>
npm run spruce -- run "Execute approved skill" --skill <skillId> --executeSkill
npm run spruce -- skill list --status candidates
npm run spruce -- workflow draft "Create a project review workflow" --context "TrustKernel" --llm mock
npm run spruce -- workflow save-draft --file workflow-draft.json
npm run spruce -- workflow create --name "Review" --context "TrustKernel" --skill <skillId> --memory "Done"
npm run spruce -- workflow versions <workflowId>
npm run spruce -- workflow archive <workflowId>
npm run spruce -- workflow restore <workflowId> <revision>
npm run spruce -- workflow run <workflowId>
npm run spruce -- workflow resume <traceId>
npm run spruce -- eval trace <traceId>
npm run spruce -- eval list
npm run spruce -- llm contract
npm run spruce -- llm providers
npm run spruce -- llm validate deepseek
npm run spruce -- agent probe --adapterIds codex-cli --version
npm run spruce -- agent prepare codex-cli --goal "Implement the approved task" --context "relevant code"
npm run spruce -- agent launch <workspaceId> --execute
npm run spruce -- approval approve <approvalId>
npm run spruce -- agent launch <workspaceId> --execute --approvalId <approvalId>
npm run spruce -- fleet create <routeId> --role coding --candidates 2 --parallel 2 --context "relevant code"
npm run spruce -- fleet approvals <fleetRunId>
npm run spruce -- fleet approve <fleetRunId> --confirm approve_all_invocations --reason "reviewed exact invocations"
npm run spruce -- fleet execute <fleetRunId>
npm run spruce -- planner contract
npm run spruce -- candidate contract
npm run spruce -- candidate approval-contract
npm run spruce -- candidate continuation-contract
npm run spruce -- gateway token
npm run spruce -- gateway contract
npm run spruce -- gateway serve
# then open http://127.0.0.1:7357/workbench
# public showcase: http://127.0.0.1:7357/showcase
npm run spruce -- tool run shell.execute --command "echo spruce" --approved
npm run spruce -- policy check --tool shell.execute --command "git status"
```

The current core creates a local `.spruceagent/` store with ContextOS indexing, memory, traces, audit logs, approval tickets, policy-governed tools, LLM Provider Registry, Agent Run, typed and evaluated skills, versioned workflows, GatewayMesh, Workbench, isolated agent workspaces, capability evidence, task routing, bounded Fleet Runs, launch review, Agent Trial attestation, and a shell-free, approval-bound Codex CLI execution path.

## Language

Canonical language: English.

Priority community languages:

1. English
2. Simplified Chinese / Traditional Chinese
3. Spanish
4. Hindi
5. Arabic

Chinese documentation:
- [README.zh-CN.md](README.zh-CN.md)

## North Star

SpruceAgent is not a more autonomous black box, and it is not only a personal productivity tool.

It is compounding intelligence for individuals and teams under user-owned control.

Execution is governed by one rule: safe enough to trust, reliable enough to depend on, compliant enough to adopt, practical enough to use every day, and simple enough to reason from first principles.
