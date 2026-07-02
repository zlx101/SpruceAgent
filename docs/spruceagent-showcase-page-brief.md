# SpruceAgent Showcase Page Brief

This brief defines the future public landing/showcase page for SpruceAgent.

It takes the strongest public-facing lessons from OpenClaw, Hermes Agent, and OpenHuman, but the page must express SpruceAgent's own identity.

## Goal

The page should make a new visitor understand SpruceAgent in 10 seconds:

> SpruceAgent is the open-source SuperAgent OS for future super individuals and super teams: omnichannel, memory-native, self-improving, and trust-governed.

The page should then prove it with one concrete loop:

```text
Goal -> ContextOS -> Workflow Builder -> Human Review -> TrustKernel -> Run -> Trace -> SkillForge
```

## What To Borrow

### From OpenClaw

Borrow:

- concrete "agent that does things" energy
- channel/entrance clarity
- fast onboarding and quickstart emphasis
- security pairing/allowlist mindset
- first-screen action demo

Do not borrow:

- channel sprawl before SpruceAgent can govern identity and permissions
- mascot-first identity if it distracts from SpruceAgent's spruce/tree metaphor

### From Hermes Agent

Borrow:

- "grows with you" evolution narrative
- memory -> skills -> scheduled/delegated work progression
- developer-oriented runtime credibility
- provider freedom

Do not borrow:

- self-improvement language without explicit review, evaluation, and rollback
- runtime complexity in the first screen

### From OpenHuman

Borrow:

- personal context as product experience
- privacy/local-first emphasis
- desktop-first daily surface
- setup simplicity plus advanced path
- visual memory/context metaphor

Do not borrow:

- broad OAuth promises before credential governance is mature
- huge skill/integration numbers unless SpruceAgent can verify them

## First Viewport

The first viewport should not be a generic hero card.

It should show SpruceAgent as the first signal:

- H1: `SpruceAgent`
- Subhead: `The open-source SuperAgent OS for governed personal and team work.`
- Value line: `Every entrance. Native context. Evolving workflows. Trusted action.`
- Primary CTA: `Run locally`
- Secondary CTA: `See the loop`

Visual:

- full-bleed or wide immersive product scene
- real UI/workflow screenshot or generated product mock if no final UI screenshot exists
- must show the actual loop: goal, retrieved context, draft workflow, approval boundary, run trace
- avoid abstract gradient/orb backgrounds

## Page Structure

1. Hero: SpruceAgent as SuperAgent OS
   - one concrete product screenshot/demo
   - local-first and open-source signals
   - quickstart command visible

2. The Loop
   - Goal
   - ContextOS
   - Workflow Builder
   - TrustKernel Review
   - Run
   - Trace
   - SkillForge

3. Four Planes
   - GatewayMesh: every entrance
   - ContextOS: native memory/context
   - SkillForge: repeated work becomes skill
   - TrustKernel: every action governed

4. What Works Today
   - CLI
   - local Gateway
   - Workbench
   - workspace index/search
   - workflow builder
   - workflow version/archive/restore
   - run inbox/detail
   - approval tickets
   - LLM adapter

5. Safety Model
   - local by default
   - bearer token gateway
   - approval tickets
   - archived workflows cannot run
   - LLM drafts do not execute
   - traces and audits

6. Developer Quickstart
   - clone/install
   - `npm test`
   - `npm run spruce -- init`
   - `npm run spruce -- context index`
   - `npm run spruce -- workflow draft "..."`
   - `npm run spruce -- gateway serve`

7. Roadmap
   - Workflow Draft Editor
   - Source Map
   - Skill Evaluation
   - Gateway Onboarding
   - Personal connectors
   - Team mode

## Copy Principles

Use concrete verbs:

- draft
- review
- approve
- run
- trace
- restore
- learn

Avoid vague claims:

- revolutionary
- AGI
- magic
- unlimited memory
- autonomous everything

Preferred phrasing:

- `LLM drafts. You review. TrustKernel governs.`
- `Repeated work becomes reusable intelligence.`
- `A workflow is an asset: versioned, restorable, auditable.`
- `The same agent across entrances, with the same memory and permissions.`

## Visual Language

Spruce identity:

- evergreen
- structured
- resilient
- vertical growth
- rings/layers/traces
- forest/team metaphor used sparingly

UI tone:

- calm operational interface
- dense enough for real work
- not a marketing-only decorative page
- product screenshot or mock must show actual SpruceAgent concepts

Color direction:

- avoid one-note green-only palette
- use evergreen as accent, with neutral operational surfaces
- introduce secondary colors for trust/risk/context/status

## Internationalization

Launch language priorities:

1. English
2. Simplified Chinese / Traditional Chinese
3. Spanish
4. Hindi
5. Arabic

The initial page should be built with i18n keys from day one.

Arabic requires RTL support. Use logical CSS properties where possible.

## Demo Script

The main demo should be one coherent story:

1. User opens Workbench.
2. User types: `Create a workflow to review this project and propose next tasks`.
3. ContextOS retrieves source files and docs.
4. Workflow Builder creates a draft.
5. User edits/reviews and saves it.
6. Workflow is versioned.
7. User dry-runs it.
8. TrustKernel blocks or asks approval for risky steps.
9. Run Detail shows trace and context sources.
10. SkillForge proposes a reusable skill from repeated success.

This demonstrates all three upstream roots, plus SpruceAgent's differentiator.

## Definition Of Done For Showcase Page v0

- first viewport explains SpruceAgent in 10 seconds
- includes one real local quickstart
- includes actual feature list, not future-only claims
- includes safety boundary
- includes architecture loop visual
- includes links to README and docs
- responsive desktop/mobile layout
- ready for five-language copy expansion
- no unsupported claims about integrations, users, or benchmarks
