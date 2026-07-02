# ContextOS Index Safety v0

ContextOS Index Safety v0 makes workspace retrieval safer before SpruceAgent uses project context for planning, workflows, or skill generation.

## What It Does

- Skips SpruceAgent runtime state under `.spruceagent/`.
- Skips common dependency and build directories.
- Skips sensitive file names such as `.env`, `.npmrc`, `.pypirc`, `.netrc`, and SSH private key names.
- Skips sensitive extensions such as `.pem`, `.key`, `.p12`, and `.pfx`.
- Skips paths that look like secret directories or secret files.
- Applies supported `.gitignore` rules before indexing.
- Redacts common secret patterns before text enters the workspace index.

## Redacted Patterns

The v0 redactor covers:

- API key, secret, token, password, private key, and access key assignments.
- Bearer tokens.
- OpenAI-style `sk-...` keys.
- GitHub-style `gh*_...` tokens.

The index stores:

- `redactedDocumentCount`
- per-document `redacted`
- per-document `redactionCount`
- `safety` metadata with ignored rule count, sensitive skip count, and active redaction pattern names

## Why This Matters

SpruceAgent will increasingly use workspace context to draft plans, build workflows, evaluate skills, and produce reusable automation. Context retrieval must not become a path for leaking local secrets into traces, LLM drafts, skill packages, or exported artifacts.

This layer is deliberately conservative. If a file is likely sensitive, it should be skipped instead of indexed.

## Limits

- Redaction is best-effort and pattern-based.
- `.gitignore` support is partial and focused on common project patterns.
- Users should still avoid storing secrets in project files.
- Future versions should add an explicit allow/deny policy file and a preflight safety report.
