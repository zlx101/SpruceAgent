# Public Showcase v0

Public Showcase v0 gives SpruceAgent a concrete first impression for GitHub visitors and local testers.

## Entry Points

- Static files: `apps/showcase/`
- Gateway route: `/showcase`
- Root route: `/`
- Workbench remains available at `/workbench`

The page is intentionally static and unauthenticated. It does not expose private workspace state, tokens, traces, memories, skills, or gateway API data.

## What It Shows

- SpruceAgent positioning as an open-source SuperAgent OS.
- The practical loop: Goal -> ContextOS -> Workflow Builder -> Review -> TrustKernel -> Run -> Trace -> SkillForge.
- The four planes: GatewayMesh, ContextOS, SkillForge, TrustKernel.
- Alpha capabilities that already exist in the repo.
- Safety boundaries around LLM drafts, approvals, imported skills, traces, and local runtime.
- Local quickstart commands.

## What It Avoids

- Unsupported integration counts.
- Benchmark claims.
- Autonomous-action claims without review gates.
- Remote SaaS assumptions.
- Private user context.

## Verification

Covered by:

```bash
npm run doctor
npm run check
npm test
```

The gateway static asset tests confirm `/`, `/showcase`, `/showcase/styles.css`, and `/showcase/app.js` are served without API authentication.
