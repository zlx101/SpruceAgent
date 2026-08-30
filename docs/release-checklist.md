# SpruceAgent Release Checklist

Use this checklist before publishing a GitHub release, announcing an alpha, or asking external contributors to test the project.

## 1. Release Scope

- Define the release goal in one paragraph.
- List user-visible changes.
- List safety-sensitive changes.
- Confirm that unfinished experimental work is not presented as stable.

## 2. Verification

Run all required checks:

```bash
npm run release:verify
```

`release:verify` runs the local alpha release gate in order:

1. `npm run doctor`
2. `npm run deploy:preflight`
3. `npm run check`
4. `npm test`
5. `npm run alpha:smoke`

It stops on the first failing command, prints a machine-readable `spruceagent.release-verification` summary, and records the summarized result under the local `.spruceagent/release-verifications/` runtime store.

Expected alpha baseline:

- `doctor` status is `passed`.
- `deploy:preflight` has no failed checks. Warnings require an explicit operator note before unattended use.
- `check` exits with code 0.
- tests pass.
- `alpha:smoke` returns `"ok": true`.
- the release verification summary has `status: "passed"` and `summary.failedCount: 0`.

## 3. Trust Boundary Review

Review changes touching:

- TrustKernel policy or approvals.
- Candidate plan promotion.
- Candidate execution.
- Skill import, promotion, replay, or restore.
- Gateway authentication and route exposure.
- LLM provider adapters.
- Workspace indexing and ignored files.

For each changed boundary, confirm that tests cover allowed and blocked behavior.

## 4. Repository Hygiene

- `git status --short --ignored` does not show accidental source changes.
- `.spruceagent/` is ignored.
- release verification records remain local under `.spruceagent/release-verifications/` unless a sanitized release note intentionally summarizes them.
- `*.skillpkg.json` is ignored unless intentionally published as sanitized sample data.
- No API keys, tokens, credentials, local paths with secrets, or private workspace evidence are committed.
- `README.md`, `README.zh-CN.md`, and relevant docs match the current behavior.

## 5. GitHub Release Notes

Include:

- Summary.
- Upgrade or setup notes.
- Known limitations.
- Verification commands and results.
- Security notes when relevant.

## 6. Post-Release

- Watch CI.
- Triage incoming issues.
- Label regressions and safety issues quickly.
- Convert repeated user problems into docs, tests, or safer defaults.
