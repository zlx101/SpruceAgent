import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createId, nowIso } from "./id.js";
import { appendJsonl, readJson, readJsonl, writeJson } from "./storage.js";
import { getReleaseVerification, listReleaseVerifications } from "./release-verifications.js";

export const RELEASE_ARTIFACT_MANIFEST_CONTRACT = Object.freeze({
  version: "0.1.0",
  interface: "spruceagent.release-artifact-manifest",
  outputKind: "local_release_artifact_manifest",
  schema: "schemas/release-artifact-manifest.schema.json",
  safetyBoundary: [
    "Release Artifact Manifest records local release material metadata only; it does not publish, push, deploy, install dependencies, run commands, or start Gateway.",
    "Manifest checksums are computed from files already present in the workspace and are stored under the local .spruceagent runtime store.",
    "Manifest generation records file paths, byte sizes, SHA-256 hashes, and linked release verification summaries; it does not persist raw command stdout or stderr.",
  ],
});

const DEFAULT_RELEASE_ARTIFACTS = Object.freeze([
  { kind: "manifest", path: "package.json" },
  { kind: "lockfile", path: "package-lock.json", optional: true },
  { kind: "license", path: "LICENSE" },
  { kind: "readme", path: "README.md" },
  { kind: "readme", path: "README.zh-CN.md", optional: true },
  { kind: "security", path: "SECURITY.md", optional: true },
  { kind: "script", path: "scripts/release-verify.js" },
  { kind: "script", path: "scripts/alpha-smoke.js" },
  { kind: "cli", path: "apps/cli/bin/spruce.js" },
  { kind: "workbench", path: "apps/desktop/index.html" },
  { kind: "workbench", path: "apps/desktop/app.js" },
  { kind: "workbench", path: "apps/desktop/styles.css" },
  { kind: "showcase", path: "apps/showcase/index.html" },
  { kind: "showcase", path: "apps/showcase/app.js" },
  { kind: "showcase", path: "apps/showcase/styles.css" },
  { kind: "schema", path: "schemas/gateway.schema.json" },
  { kind: "schema", path: "schemas/execution-task-event.schema.json" },
  { kind: "schema", path: "schemas/release-verification.schema.json" },
  { kind: "schema", path: "schemas/release-artifact-manifest.schema.json" },
  { kind: "doc", path: "docs/release-checklist.md" },
  { kind: "doc", path: "docs/execution-tasks-v0.md" },
  { kind: "doc", path: "docs/open-source-alpha-quickstart.md" },
  { kind: "doc", path: "docs/deployment-operations-v0.md" },
  { kind: "doc", path: "docs/gatewaymesh-local-api-v0.md" },
]);

export function getReleaseArtifactManifestContract() {
  return RELEASE_ARTIFACT_MANIFEST_CONTRACT;
}

export function createReleaseArtifactManifest(store, input = {}) {
  const generatedAt = nowIso();
  const id = input.id || createId("release_artifact_manifest");
  const releaseVerification = resolveReleaseVerification(store, input.releaseVerificationId);
  const packageInfo = readPackageInfo(store.cwd);
  const artifacts = collectReleaseArtifacts(store.cwd, normalizeArtifactDefinitions(input.artifacts));
  const manifest = {
    id,
    version: RELEASE_ARTIFACT_MANIFEST_CONTRACT.version,
    interface: RELEASE_ARTIFACT_MANIFEST_CONTRACT.interface,
    outputKind: RELEASE_ARTIFACT_MANIFEST_CONTRACT.outputKind,
    schema: RELEASE_ARTIFACT_MANIFEST_CONTRACT.schema,
    generatedAt,
    generatedBy: input.actor || "release-manifest",
    project: {
      name: packageInfo?.name ?? path.basename(store.cwd),
      version: packageInfo?.version ?? null,
      private: packageInfo?.private ?? null,
      cwdName: path.basename(store.cwd),
    },
    source: {
      revision: input.sourceRevision || readGitRevision(store.cwd),
      dirtyState: input.dirtyState || "not_checked",
      revisionSource: input.sourceRevision ? "input" : "git_head_file",
    },
    releaseVerification,
    summary: summarizeArtifacts(artifacts, releaseVerification),
    artifacts,
    evidence: {
      persisted: true,
      storeRelativePath: `release-artifacts/${id}.json`,
      indexRelativePath: "release-artifact-index.jsonl",
      releaseVerificationId: releaseVerification?.id ?? null,
    },
    persistence: {
      status: "recorded",
      persistedAt: generatedAt,
      storeRelativePath: `release-artifacts/${id}.json`,
      indexRelativePath: "release-artifact-index.jsonl",
    },
    limits: RELEASE_ARTIFACT_MANIFEST_CONTRACT.safetyBoundary,
  };

  writeJson(releaseArtifactManifestPath(store, id), manifest);
  appendJsonl(releaseArtifactManifestIndexPath(store), releaseArtifactManifestListItem(manifest));
  appendJsonl(path.join(store.root, "audit.jsonl"), {
    type: "release_artifact_manifest.recorded",
    id,
    status: manifest.summary.status,
    releaseVerificationId: releaseVerification?.id ?? null,
    generatedAt,
    actor: manifest.generatedBy,
  });
  return manifest;
}

export function getReleaseArtifactManifest(store, manifestId) {
  const filePath = releaseArtifactManifestPath(store, manifestId);
  if (!fs.existsSync(filePath)) throw notFound(`release artifact manifest not found: ${manifestId}`);
  return readJson(filePath);
}

export function listReleaseArtifactManifests(store, options = {}) {
  const limit = Number.isSafeInteger(Number(options.limit)) && Number(options.limit) > 0
    ? Math.min(Number(options.limit), 100)
    : 20;
  const all = readJsonl(releaseArtifactManifestIndexPath(store));
  const items = all
    .sort((a, b) => String(b.generatedAt || "").localeCompare(String(a.generatedAt || "")))
    .slice(0, limit);
  return {
    interface: RELEASE_ARTIFACT_MANIFEST_CONTRACT.interface,
    version: RELEASE_ARTIFACT_MANIFEST_CONTRACT.version,
    summary: {
      total: all.length,
      returnedCount: items.length,
      readyCount: items.filter((item) => item.status === "ready").length,
      attentionCount: items.filter((item) => item.status !== "ready").length,
    },
    items,
    limits: RELEASE_ARTIFACT_MANIFEST_CONTRACT.safetyBoundary,
  };
}

function resolveReleaseVerification(store, releaseVerificationId) {
  const selected = releaseVerificationId
    ? getReleaseVerification(store, releaseVerificationId)
    : (() => {
        const latest = listReleaseVerifications(store, { limit: 1 }).items[0];
        return latest ? getReleaseVerification(store, latest.id) : null;
      })();
  if (!selected) return null;
  return {
    id: selected.id,
    status: selected.status,
    startedAt: selected.startedAt,
    finishedAt: selected.finishedAt,
    persistedAt: selected.persistedAt,
    summary: selected.summary,
    storeRelativePath: selected.evidence?.storeRelativePath ?? null,
  };
}

function collectReleaseArtifacts(cwd, definitions) {
  return definitions.map((definition) => {
    const relativePath = normalizeArtifactPath(definition.path);
    const filePath = path.resolve(cwd, relativePath);
    const inside = isInside(cwd, filePath);
    if (!inside) {
      return {
        kind: definition.kind || "file",
        path: relativePath,
        required: !definition.optional,
        status: "blocked",
        reason: "path_outside_workspace",
      };
    }
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return {
        kind: definition.kind || "file",
        path: relativePath,
        required: !definition.optional,
        status: definition.optional ? "missing_optional" : "missing_required",
      };
    }
    const buffer = fs.readFileSync(filePath);
    return {
      kind: definition.kind || "file",
      path: relativePath,
      required: !definition.optional,
      status: "included",
      sizeBytes: buffer.length,
      sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
    };
  });
}

function summarizeArtifacts(artifacts, releaseVerification) {
  const required = artifacts.filter((item) => item.required);
  const missingRequired = artifacts.filter((item) => item.status === "missing_required" || item.status === "blocked");
  const included = artifacts.filter((item) => item.status === "included");
  return {
    status: missingRequired.length || releaseVerification?.status !== "passed" ? "needs_attention" : "ready",
    artifactCount: artifacts.length,
    includedCount: included.length,
    requiredCount: required.length,
    missingRequiredCount: missingRequired.length,
    missingOptionalCount: artifacts.filter((item) => item.status === "missing_optional").length,
    totalSizeBytes: included.reduce((sum, item) => sum + Number(item.sizeBytes || 0), 0),
    releaseVerificationStatus: releaseVerification?.status ?? "missing",
  };
}

function readPackageInfo(cwd) {
  const filePath = path.join(cwd, "package.json");
  if (!fs.existsSync(filePath)) return null;
  const data = readJson(filePath);
  return {
    name: data.name,
    version: data.version,
    private: data.private,
  };
}

function readGitRevision(cwd) {
  const gitDir = resolveGitDir(cwd);
  if (!gitDir) return null;
  const headPath = path.join(gitDir, "HEAD");
  if (!fs.existsSync(headPath)) return null;
  const head = fs.readFileSync(headPath, "utf8").trim();
  if (!head.startsWith("ref: ")) return head || null;
  const ref = head.slice(5).trim();
  const refPath = path.join(gitDir, ref);
  if (fs.existsSync(refPath)) return fs.readFileSync(refPath, "utf8").trim() || null;
  return readPackedRef(gitDir, ref);
}

function resolveGitDir(cwd) {
  const dotGit = path.join(cwd, ".git");
  if (!fs.existsSync(dotGit)) return null;
  const stat = fs.statSync(dotGit);
  if (stat.isDirectory()) return dotGit;
  if (!stat.isFile()) return null;
  const value = fs.readFileSync(dotGit, "utf8").trim();
  const match = value.match(/^gitdir:\s*(.+)$/i);
  if (!match) return null;
  const resolved = path.resolve(cwd, match[1]);
  return isInside(cwd, resolved) ? resolved : null;
}

function readPackedRef(gitDir, ref) {
  const packedPath = path.join(gitDir, "packed-refs");
  if (!fs.existsSync(packedPath)) return null;
  const line = fs.readFileSync(packedPath, "utf8")
    .split(/\r?\n/)
    .find((item) => item && !item.startsWith("#") && item.endsWith(` ${ref}`));
  return line ? line.split(" ")[0] : null;
}

function releaseArtifactManifestPath(store, manifestId) {
  const safeId = requiredManifestId(manifestId);
  return path.join(store.root, "release-artifacts", `${safeId}.json`);
}

function releaseArtifactManifestIndexPath(store) {
  return path.join(store.root, "release-artifact-index.jsonl");
}

function releaseArtifactManifestListItem(manifest) {
  return {
    id: manifest.id,
    status: manifest.summary.status,
    generatedAt: manifest.generatedAt,
    generatedBy: manifest.generatedBy,
    projectName: manifest.project.name,
    projectVersion: manifest.project.version,
    sourceRevision: manifest.source.revision,
    releaseVerificationId: manifest.releaseVerification?.id ?? null,
    releaseVerificationStatus: manifest.releaseVerification?.status ?? "missing",
    artifactCount: manifest.summary.artifactCount,
    includedCount: manifest.summary.includedCount,
    missingRequiredCount: manifest.summary.missingRequiredCount,
    storeRelativePath: manifest.evidence.storeRelativePath,
  };
}

function normalizeArtifactPath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

function normalizeArtifactDefinitions(value) {
  if (value === undefined || value === null) return DEFAULT_RELEASE_ARTIFACTS;
  if (!Array.isArray(value)) throw invalidInput("release artifact definitions must be an array");
  if (value.length > 100) throw invalidInput("release artifact definitions must contain at most 100 items");
  return value.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw invalidInput(`release artifact definition at index ${index} must be an object`);
    }
    if (!String(item.path || "").trim()) {
      throw invalidInput(`release artifact definition at index ${index} requires path`);
    }
    return {
      kind: String(item.kind || "file").trim() || "file",
      path: item.path,
      optional: Boolean(item.optional),
    };
  });
}

function requiredManifestId(value) {
  const id = String(value || "").trim();
  if (!id || !/^[A-Za-z0-9_.-]+$/.test(id)) {
    throw invalidInput("invalid release artifact manifest id");
  }
  return id;
}

function isInside(root, target) {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function invalidInput(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function notFound(message) {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}
