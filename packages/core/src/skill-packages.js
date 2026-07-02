import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createId, nowIso } from "./id.js";
import { getSkillEvaluation, listSkillEvaluations } from "./skill-evaluations.js";
import {
  getSkillReplayFixture,
  getSkillReplayResult,
  listSkillReplayFixtures,
  listSkillReplayResults,
} from "./skill-replay.js";
import { getSkill, getSkillVersion, listSkillVersions, proposeSkill } from "./skills.js";
import { appendJsonl, readJson, readJsonl, writeJson } from "./storage.js";

export const SKILL_PACKAGE_CONTRACT = Object.freeze({
  version: "0.1.0",
  interface: "spruceagent.skill-package",
  packageKind: "portable_skill_package",
  defaultExportStatus: "approved",
  importStatus: "candidate",
  safetyBoundary: [
    "Skill Package v0 exports portable skill definitions and local evidence.",
    "Skill Package v0 import never approves or executes imported skills.",
    "Imported skills must pass local evaluation and promotion before use.",
    "Source trace ids are preserved as metadata by default because traces may not exist in the target workspace.",
  ],
});

export function getSkillPackageContract() {
  return SKILL_PACKAGE_CONTRACT;
}

export function exportSkillPackage(store, skillId, input = {}) {
  const status = input.status ?? SKILL_PACKAGE_CONTRACT.defaultExportStatus;
  const skill = getSkill(store, skillId, status);
  const versions = listSkillVersions(store, skillId).map((entry) => getSkillVersion(store, skillId, entry.revision));
  const evaluations = listSkillEvaluations(store)
    .filter((entry) => entry.skillId === skillId)
    .map((entry) => getSkillEvaluation(store, entry.id));
  const replayFixtures = listSkillReplayFixtures(store)
    .filter((entry) => entry.skillId === skillId)
    .map((entry) => getSkillReplayFixture(store, entry.id));
  const fixtureIds = new Set(replayFixtures.map((fixture) => fixture.id));
  const replayResults = listSkillReplayResults(store)
    .filter((entry) => fixtureIds.has(entry.fixtureId) || entry.skillId === skillId)
    .map((entry) => getSkillReplayResult(store, entry.id));

  const pkg = withIntegrity({
    id: createId("skill_pkg"),
    version: SKILL_PACKAGE_CONTRACT.version,
    packageKind: SKILL_PACKAGE_CONTRACT.packageKind,
    exportedAt: nowIso(),
    exportedBy: input.exportedBy ?? input.by ?? "local-user",
    source: {
      workspaceName: readWorkspaceName(store),
      originalSkillId: skill.id,
      skillStatus: skill.status,
      skillRevision: skill.revision ?? null,
    },
    skill: {
      name: skill.name,
      version: skill.version,
      summary: skill.summary,
      steps: skill.steps ?? [],
      sourceTraceIds: skill.sourceTraceIds ?? [],
      metadata: skill.metadata ?? {},
    },
    evidence: {
      versions,
      evaluations,
      replayFixtures,
      replayResults,
    },
    limits: [
      "Skill Package v0 is JSON only.",
      "Packages do not grant execution authority.",
      "Imported packages become candidate skills and must pass local gates.",
    ],
  });

  writeJson(skillPackagePath(store, pkg.id), pkg);
  appendJsonl(skillPackageIndexPath(store), {
    id: pkg.id,
    originalSkillId: skill.id,
    skillName: skill.name,
    skillRevision: skill.revision ?? null,
    exportedAt: pkg.exportedAt,
    integrityHash: pkg.integrity.sha256,
  });
  if (input.file) {
    writeJson(path.resolve(store.cwd, input.file), pkg);
  }
  return pkg;
}

export function importSkillPackage(store, pkg, input = {}) {
  validateSkillPackage(pkg);
  const importedAt = nowIso();
  const candidate = proposeSkill(store, {
    name: input.name ?? pkg.skill.name,
    summary: input.summary ?? pkg.skill.summary,
    steps: pkg.skill.steps ?? [],
    sourceTraceIds: input.preserveSourceTraceIds ? pkg.skill.sourceTraceIds ?? [] : [],
    metadata: {
      ...(input.includeSourceMetadata === false ? {} : pkg.skill.metadata ?? {}),
      importedFrom: {
        packageId: pkg.id,
        originalSkillId: pkg.source?.originalSkillId ?? null,
        sourceWorkspaceName: pkg.source?.workspaceName ?? null,
        exportedAt: pkg.exportedAt,
        integrityHash: pkg.integrity?.sha256 ?? null,
        originalSourceTraceIds: pkg.skill.sourceTraceIds ?? [],
      },
      importedAt,
      importedBy: input.importedBy ?? input.by ?? "local-user",
      limits: [
        ...((pkg.skill.metadata?.limits && input.includeSourceMetadata !== false) ? pkg.skill.metadata.limits : []),
        "Imported skills are candidates only.",
        "Imported skills require local evaluation and promotion before approved use.",
      ],
    },
  });

  const record = {
    id: createId("skill_import"),
    packageId: pkg.id,
    candidateSkillId: candidate.id,
    originalSkillId: pkg.source?.originalSkillId ?? null,
    importedAt,
    integrityHash: pkg.integrity?.sha256 ?? null,
    package: pkg,
  };
  writeJson(skillImportPath(store, record.id), record);
  appendJsonl(skillPackageImportIndexPath(store), {
    id: record.id,
    packageId: record.packageId,
    candidateSkillId: record.candidateSkillId,
    originalSkillId: record.originalSkillId,
    importedAt: record.importedAt,
    integrityHash: record.integrityHash,
  });

  return {
    id: record.id,
    status: "imported_as_candidate",
    candidateSkill: candidate,
    packageSummary: {
      packageId: pkg.id,
      originalSkillId: pkg.source?.originalSkillId ?? null,
      evidenceCounts: {
        versions: pkg.evidence?.versions?.length ?? 0,
        evaluations: pkg.evidence?.evaluations?.length ?? 0,
        replayFixtures: pkg.evidence?.replayFixtures?.length ?? 0,
        replayResults: pkg.evidence?.replayResults?.length ?? 0,
      },
    },
    recommendedNextActions: [
      "Run local skill evaluation for the imported candidate.",
      "Promote the imported candidate only after local review passes.",
      "Create new replay fixtures in this workspace if the skill will be reused.",
    ],
    limits: [
      "Import v0 never approves or executes imported skills.",
      "Source trace ids are metadata unless preserveSourceTraceIds is explicitly set.",
    ],
  };
}

export function listSkillPackages(store) {
  return readJsonl(skillPackageIndexPath(store));
}

export function getSkillPackage(store, packageId) {
  const filePath = skillPackagePath(store, packageId);
  if (!fs.existsSync(filePath)) {
    throw new Error(`skill package not found: ${packageId}`);
  }
  return readJson(filePath);
}

export function listSkillPackageImports(store) {
  return readJsonl(skillPackageImportIndexPath(store));
}

export function getSkillPackageImport(store, importId) {
  const filePath = skillImportPath(store, importId);
  if (!fs.existsSync(filePath)) {
    throw new Error(`skill package import not found: ${importId}`);
  }
  return readJson(filePath);
}

export function readSkillPackageFile(filePath) {
  return readJson(filePath);
}

function validateSkillPackage(pkg) {
  if (!pkg || pkg.packageKind !== SKILL_PACKAGE_CONTRACT.packageKind) {
    throw new Error("invalid skill package");
  }
  if (!pkg.skill?.name || !pkg.skill?.summary || !Array.isArray(pkg.skill?.steps)) {
    throw new Error("skill package missing skill name, summary, or steps");
  }
  if (pkg.integrity?.sha256) {
    const expected = hashPackageContent({ ...pkg, integrity: undefined });
    if (expected !== pkg.integrity.sha256) {
      throw new Error("skill package integrity hash mismatch");
    }
  }
}

function withIntegrity(pkg) {
  return {
    ...pkg,
    integrity: {
      algorithm: "sha256",
      sha256: hashPackageContent(pkg),
    },
  };
}

function hashPackageContent(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function readWorkspaceName(store) {
  const configPath = path.join(store.root, "config.json");
  if (!fs.existsSync(configPath)) return path.basename(store.cwd);
  return readJson(configPath).projectName ?? path.basename(store.cwd);
}

function skillPackageIndexPath(store) {
  return path.join(store.root, "skill-package-index.jsonl");
}

function skillPackageImportIndexPath(store) {
  return path.join(store.root, "skill-package-import-index.jsonl");
}

function skillPackagePath(store, packageId) {
  return path.join(store.root, "skill-packages", `${packageId}.json`);
}

function skillImportPath(store, importId) {
  return path.join(store.root, "skill-imports", `${importId}.json`);
}
