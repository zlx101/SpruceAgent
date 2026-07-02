# Security Policy

SpruceAgent controls tools, workspace context, skills, workflows, and LLM plans. Security reports are treated as high priority because mistakes can affect local files, credentials, private context, and user trust.

## Supported Versions

SpruceAgent is currently in alpha. Security fixes target the `main` branch until versioned releases begin.

## Reporting a Vulnerability

Please report security issues privately.

Preferred path:

- Open a private security advisory on GitHub if available.
- If advisories are not available, contact the repository owner through the GitHub profile for a private channel.

Do not include working exploit details, secrets, API keys, or private user data in public issues.

## Scope

Examples of in-scope issues:

- Bypassing TrustKernel policy, approvals, or candidate execution gates.
- Importing a skill package that becomes approved without explicit review.
- LLM provider output causing direct tool execution without promotion.
- Workspace context leaking secrets or ignored files.
- Gateway authentication bypass.
- Trace, replay, or audit tampering.
- Unsafe command execution, path traversal, or unintended file writes.

Examples of out-of-scope issues:

- Missing features.
- Documentation typos without security impact.
- Vulnerabilities in unsupported local environments that cannot affect SpruceAgent behavior.

## Disclosure Expectations

We aim to acknowledge credible reports quickly, reproduce the issue, patch the affected boundary, add regression coverage, and credit reporters when appropriate.

## Secrets

Never commit provider keys, personal tokens, `.spruceagent/` runtime state, or exported skill packages containing private evidence. If a secret is committed, rotate it immediately and remove it from history before public redistribution.
