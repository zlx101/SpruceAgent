# Foundation Project Revalidation - 2026-07-01

This note revalidates the three upstream inspiration projects for SpruceAgent:

- OpenClaw: https://github.com/openclaw/openclaw and https://openclaw.ai/
- Hermes Agent: https://github.com/NousResearch/hermes-agent and https://hermes-agent.nousresearch.com/
- OpenHuman: https://github.com/tinyhumansai/openhuman and https://tinyhumans.ai/openhuman

The purpose is not to copy them. The purpose is to extract the durable product and architecture lessons that should guide SpruceAgent after the current core foundation.

## Snapshot

| Project | Public positioning | Repo signal checked | Core lesson for SpruceAgent |
| --- | --- | --- | --- |
| OpenClaw | Personal AI assistant on your own devices; works through existing chat channels | GitHub page shows very large public traction, multi-channel gateway, docs, security notes, skills registry, companion apps | Win the entrance layer, onboarding, and "agent that actually does things" demo |
| Hermes Agent | "The Agent That Grows With You" | GitHub/site emphasize learning loop, memory, skill creation, scheduling, subagents, terminal backends, provider choice | Win the evolution loop: memory -> skills -> automation -> delegation |
| OpenHuman | Personal AI super intelligence; private, simple, powerful | GitHub/site emphasize UI-first desktop, OAuth integrations, memory tree, SuperContext, local model for low-level private tasks | Win the personal context and daily-use product experience |

These are external facts visible from public pages on 2026-07-01. GitHub counts and feature lists can change.

## OpenClaw: Entrance Is The Product

### Verified Facts

- The GitHub README positions OpenClaw as a personal AI assistant run on your own devices, reachable on channels users already use, with a Gateway as control plane.
- The project lists a broad set of channels: WhatsApp, Telegram, Slack, Discord, Google Chat, Signal, iMessage, IRC, Teams, Matrix, Feishu, LINE, Mattermost, Nextcloud Talk, Nostr, Twitch, Zalo, WeChat, QQ, WebChat, and more.
- The official site leads with "The AI that actually does things" and concrete jobs like inbox clearing, email sending, calendar management, and flight check-in.
- The quickstart centers onboarding: install, run `openclaw onboard`, keep Gateway daemon running, send messages, then talk to the assistant.
- Its security docs explicitly treat inbound DMs as untrusted input and use pairing/allowlist behavior for unknown senders.
- Highlights include local-first gateway, multi-channel inbox, multi-agent routing, voice, live canvas, first-class tools, companion apps, onboarding, and skills.

Sources:

- https://github.com/openclaw/openclaw
- https://openclaw.ai/

### Essence

OpenClaw's strongest move is not merely "many integrations." It makes the entrance layer emotionally obvious:

> The agent should live where the user already works.

The website does not start with framework theory. It starts with concrete actions and familiar channels. The repo also makes install/onboarding a product surface, not a footnote.

### What SpruceAgent Should Absorb

- GatewayMesh must become a real entrance fabric, not just an HTTP API.
- The first public demo should show concrete work across an entrance, not a diagram.
- Onboarding should be a guided path: token, index, provider, first run, approval, workflow builder.
- Security defaults must be shown before virality: untrusted inbound messages, pairing/allowlists, local-only defaults, approval gates.
- The future webpage must show "what it does" in the first viewport.

### What SpruceAgent Should Avoid

- Do not grow channels before TrustKernel and identity boundaries are strong.
- Do not let "works everywhere" become "unsafe everywhere."
- Do not copy the mascot/community tone unless it naturally fits SpruceAgent's spruce identity.

## Hermes Agent: Evolution Is The Moat

### Verified Facts

- The website headline is "The Agent That Grows With You."
- The GitHub README says Hermes has a built-in learning loop, creates skills from experience, improves them during use, persists knowledge, searches past conversations, and builds a model of the user across sessions.
- The project advertises provider flexibility: Nous Portal, OpenRouter, OpenAI, custom endpoints, and others.
- The README/site highlight terminal/TUI features, messaging continuity, memory, auto-generated skills, scheduled automations, subagents, Python RPC scripts, and terminal backends including local, Docker, SSH, Singularity, Modal, and Daytona.
- The website feature sequence is clear: connect, remember, schedule, delegate, search, experiment.

Sources:

- https://github.com/NousResearch/hermes-agent
- https://hermes-agent.nousresearch.com/

### Essence

Hermes' strongest move is the learning loop:

> The agent should get better because it has worked with you before.

It frames the agent as a long-running operating partner, not a stateless tool caller. The real product promise is compounding capability.

### What SpruceAgent Should Absorb

- SkillForge should keep advancing from manual skill approval toward trace-derived skill candidates, evaluation, versioning, and rollback.
- Workflow Builder should become the bridge from intent to reusable workflow, then from repeated workflow to skill.
- Scheduled and unattended work should come only after durable traces, approvals, and policy are mature.
- Subagents/delegation should eventually be modeled as traceable, isolated workstreams.
- Provider abstraction must remain first-class and non-lock-in.

### What SpruceAgent Should Avoid

- Do not make "self-improving" mean silent mutation.
- Do not promote skills without evaluation, revision history, and user-governed approval.
- Do not bury the product behind runtime complexity.

## OpenHuman: Personal Context Is The UX

### Verified Facts

- The official site positions OpenHuman as "Your Personal AI super intelligence" and emphasizes private, simple, powerful.
- It emphasizes one subscription for many providers, high-memory capacity, fast setup, personalized learning from screen/text/email, local LLM usage for low-level private tasks, and simple/advanced setup modes.
- The GitHub README positions OpenHuman as a personal AI super intelligence with local memory and managed services where needed.
- The README emphasizes UI-first desktop onboarding, a desktop mascot/face, joining Google Meets, background thinking, 100+ OAuth integrations through Composio, MCP ecosystem access, 90,000+ skills, auto-fetch into a memory tree, Obsidian-compatible vault, SQLite storage, and SuperContext that prepares context before a fresh chat.
- The repo lists GPL-3.0 license on GitHub.

Sources:

- https://github.com/tinyhumansai/openhuman
- https://tinyhumans.ai/openhuman

### Essence

OpenHuman's strongest move is productized personal context:

> The agent should start a task already knowing enough about the person and project.

It treats context as a lived product experience: desktop, integrations, memory tree, vault, and first-turn context assembly.

### What SpruceAgent Should Absorb

- ContextOS should evolve beyond workspace search into memory tree, project timeline, source connectors, and context packs prepared before planning.
- Workbench must become a daily operating surface, not just an admin panel.
- Local-first memory and inspectable Markdown/SQLite-style storage should remain a north-star.
- Provider settings and integration setup need simple and advanced paths.
- The future webpage should show personal context visually, not only describe it.

### What SpruceAgent Should Avoid

- Do not start with 100+ OAuth integrations before privacy, credential, revocation, and sync policy are mature.
- Do not let managed connector convenience hide where data flows.
- Do not promise enormous memory capacity without explaining retrieval boundaries, privacy, and local storage.

## SpruceAgent Synthesis

SpruceAgent should absorb the three roots like this:

| Root | Absorb | Upgrade |
| --- | --- | --- |
| OpenClaw | Omnichannel entrance, onboarding, concrete action demo | Add TrustKernel-by-default and auditable local-first governance |
| Hermes | Self-improving memory/skill loop, scheduling, delegation, runtime mobility | Add explicit skill lifecycle, evaluations, workflow versions, human approval |
| OpenHuman | UI-first personal context, memory tree, local vault, integration setup | Add ContextOS contracts, source policy, transparent local storage, project-first rollout |

SpruceAgent's unique thesis should now be sharper:

> SpruceAgent is the open-source SuperAgent OS that turns personal and team work into governed, reusable intelligence: every entrance, native memory, evolving workflows, and trusted action.

## Design Commitments Going Forward

1. GatewayMesh is not the brain. It is identity, entrance, session, and delivery.
2. ContextOS is not a RAG helper. It is the operating context for work.
3. SkillForge is not a plugin folder. It is the learning loop from trace to reusable skill.
4. Workflow is not a static automation. It is the reviewable bridge from intent to repeatable action.
5. TrustKernel is not an add-on. It is the path through which every action must pass.
6. Workbench is not only a dashboard. It must become the daily operating surface.

## Concrete Next Architecture Tasks

Highest value after Workflow Builder v0:

1. Workflow Draft Editor / Step Review v0
   - Edit generated workflow steps before saving.
   - Reorder, delete, duplicate, and inspect metadata.
   - Keep all saves versioned.

2. ContextOS Source Map v0
   - Show which files and memories influenced a draft/run.
   - Add source type, freshness, sensitivity, and confidence.

3. SkillForge Evaluation Harness v0
   - Evaluate candidate skills against prior traces.
   - Record pass/fail evidence before approval.

4. Gateway Onboarding v0
   - Guided setup for token, context index, provider, first dry run, first workflow draft.

5. Showcase Page v0
   - Public-facing landing page that demonstrates the full SpruceAgent loop in one screen.

## Source Review Notes

No code should be copied from these projects without license review.

- OpenClaw and Hermes publicly show MIT-style open-source positioning on their pages.
- OpenHuman's GitHub page shows GPL-3.0 license, so direct code reuse must be avoided unless intentionally accepting compatible obligations.
- For SpruceAgent, treat all three as product/architecture references first, not vendored foundations.
