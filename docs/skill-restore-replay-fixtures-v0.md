# Skill Restore / Replay Fixtures v0

SpruceAgent now has the first rollback and regression-check layer for SkillForge.

This feature is intentionally static. It restores approved skill definitions from version history and creates replay fixtures that compare skill shape, typed executable steps, policy previews, and trace evidence. It does not execute tools or replay historical side effects.

## Known Facts

Before this feature, SpruceAgent could:

- evaluate candidate skills
- promote passing candidates
- record skill version snapshots
- list and read skill versions

It could not restore from version history or create regression fixtures for approved skills.

## What v0 Adds

Core now exports:

- `restoreSkillVersion()`
- `getSkillReplayContract()`
- `createSkillReplayFixture()`
- `replaySkillFixture()`
- `listSkillReplayFixtures()`
- `getSkillReplayFixture()`
- `listSkillReplayResults()`
- `getSkillReplayResult()`

Storage now includes:

```text
.spruceagent/skill-replay-fixtures/<fixtureId>.json
.spruceagent/skill-replay-results/<resultId>.json
.spruceagent/skill-replay-fixture-index.jsonl
.spruceagent/skill-replay-result-index.jsonl
```

## Restore

Restoring a skill version:

- reads `.spruceagent/skill-history/<skillId>/<revision>.json`
- writes the selected snapshot back to `skills/approved`
- creates a new current revision
- records a `skill.restored` version event
- does not execute skill steps

CLI:

```bash
npm run spruce -- skill restore <skillId> <revision>
```

Gateway:

```text
POST /v1/skills/:skillId/versions/:revision/restore
```

## Replay Fixtures

A replay fixture records expected static behavior:

- skill name
- step count
- typed executable steps
- minimum reliability score
- evaluation status
- policy decision counts
- risk counts
- source trace ids and counts

Create a fixture:

```bash
npm run spruce -- skill fixture-create <skillId>
```

Run replay:

```bash
npm run spruce -- skill replay <fixtureId>
```

List fixtures and results:

```bash
npm run spruce -- skill fixture-list
npm run spruce -- skill replay-results
```

Gateway:

- `GET /v1/skills/replay-contract`
- `POST /v1/skills/:skillId/replay-fixtures`
- `GET /v1/skill-replay/fixtures`
- `GET /v1/skill-replay/fixtures/:fixtureId`
- `POST /v1/skill-replay/fixtures/:fixtureId/run`
- `GET /v1/skill-replay/results`
- `GET /v1/skill-replay/results/:resultId`

## Safety Boundary

Skill Restore / Replay Fixtures v0:

- does not execute tools
- does not replay source traces
- does not approve or promote skills
- does not bypass TrustKernel
- restores definitions only
- treats replay as a regression signal, not semantic proof

## What This Does Not Solve Yet

This v0 does not yet provide:

- sandboxed execution replay
- output golden files
- semantic comparison
- automatic rollback on failed replay
- reviewer signatures
- package export/import for fixtures

Those should come after a safer execution sandbox and deterministic fixture runner exist.
