# Skill Package / Import-Export v0

SpruceAgent now has a portable skill package format.

This is the first step from local SkillForge to a shareable skill ecosystem. A package can carry an approved skill plus local evidence, but importing it never grants approval or execution authority.

## Known Facts

Before this feature, SpruceAgent could:

- evaluate skills
- promote skills
- record version history
- restore approved versions
- create static replay fixtures

It could not export a skill as a portable artifact or import a skill from another workspace.

## What v0 Adds

Core now exports:

- `getSkillPackageContract()`
- `exportSkillPackage()`
- `importSkillPackage()`
- `listSkillPackages()`
- `getSkillPackage()`
- `listSkillPackageImports()`
- `getSkillPackageImport()`
- `readSkillPackageFile()`

Storage now includes:

```text
.spruceagent/skill-packages/<packageId>.json
.spruceagent/skill-imports/<importId>.json
.spruceagent/skill-package-index.jsonl
.spruceagent/skill-package-import-index.jsonl
```

## Package Contents

A v0 package includes:

- package id and format version
- source workspace name
- original skill id
- approved skill definition
- version snapshots
- skill evaluation reports
- static replay fixtures
- static replay results
- SHA-256 integrity hash

## CLI

Export a skill:

```bash
npm run spruce -- skill package-export <skillId>
```

Export to a file:

```bash
npm run spruce -- skill package-export <skillId> --file trustkernel.skillpkg.json
```

List local packages:

```bash
npm run spruce -- skill packages
```

Import a package id or file:

```bash
npm run spruce -- skill package-import <packageId>
npm run spruce -- skill package-import trustkernel.skillpkg.json
```

List import records:

```bash
npm run spruce -- skill package-imports
```

## Gateway

The local Gateway exposes:

- `GET /v1/skills/package-contract`
- `POST /v1/skills/:skillId/package-export`
- `GET /v1/skill-packages`
- `GET /v1/skill-packages/:packageId`
- `POST /v1/skill-packages/import`
- `GET /v1/skill-package-imports`
- `GET /v1/skill-package-imports/:importId`

The Gateway client exposes matching methods:

- `skillPackageContract()`
- `exportSkillPackage(skillId, input)`
- `listSkillPackages()`
- `getSkillPackage(packageId)`
- `importSkillPackage(input)`
- `listSkillPackageImports()`
- `getSkillPackageImport(importId)`

## Safety Boundary

Skill Package v0:

- imports packages as candidate skills only
- never approves imported skills
- never executes imported steps
- verifies package integrity when a hash is present
- clears source trace ids by default because target workspaces may not have those traces
- stores original source trace ids in metadata for audit

Imported candidates must still pass local evaluation and promotion before approved use.

## What This Does Not Solve Yet

Skill Package v0 does not yet provide:

- signed publisher identity
- package registry
- dependency declarations
- compatibility matrix
- license metadata
- package trust scores
- package UI in Workbench

Those should come after local package import/export is stable and GitHub open-source packaging is ready.
