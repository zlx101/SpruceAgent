import fs from "node:fs";
import path from "node:path";
import { createId, nowIso } from "./id.js";
import { appendJsonl, readJson, readJsonl, storeItemPath, writeJson } from "./storage.js";

export const RELEASE_VERIFICATION_CONTRACT = Object.freeze({
  version: "0.1.0",
  interface: "spruceagent.release-verification",
  outputKind: "local_release_gate_report",
  schema: "schemas/release-verification.schema.json",
  safetyBoundary: [
    "Release Verification records local release-gate evidence only; it does not publish, push, deploy, start Gateway, run Agents, approve tickets, or rotate tokens.",
    "Release Verification records are stored under the local .spruceagent runtime store and are not source-controlled release artifacts by default.",
    "Recorded command output is summarized to status, counts, exit codes, and duration; raw stdout and stderr are not persisted.",
  ],
});

export function getReleaseVerificationContract() {
  return RELEASE_VERIFICATION_CONTRACT;
}

export function persistReleaseVerificationReport(store, report, input = {}) {
  const id = report.id || createId("release_verification");
  const persistedAt = nowIso();
  const record = {
    ...report,
    id,
    version: RELEASE_VERIFICATION_CONTRACT.version,
    interface: RELEASE_VERIFICATION_CONTRACT.interface,
    outputKind: RELEASE_VERIFICATION_CONTRACT.outputKind,
    persistedAt,
    persistedBy: input.actor || "release-verify",
    evidence: {
      ...(report.evidence || {}),
      persisted: true,
      storeRelativePath: `release-verifications/${id}.json`,
      indexRelativePath: "release-verification-index.jsonl",
    },
    persistence: {
      status: "recorded",
      persistedAt,
      storeRelativePath: `release-verifications/${id}.json`,
      indexRelativePath: "release-verification-index.jsonl",
    },
    limits: RELEASE_VERIFICATION_CONTRACT.safetyBoundary,
  };

  writeJson(releaseVerificationPath(store, id), record);
  appendJsonl(releaseVerificationIndexPath(store), releaseVerificationListItem(record));
  appendJsonl(path.join(store.root, "audit.jsonl"), {
    type: "release_verification.recorded",
    id,
    status: record.status,
    startedAt: record.startedAt,
    finishedAt: record.finishedAt,
    persistedAt,
    actor: record.persistedBy,
  });
  return record;
}

export function getReleaseVerification(store, verificationId) {
  const filePath = releaseVerificationPath(store, verificationId);
  if (!fs.existsSync(filePath)) throw notFound(`release verification not found: ${verificationId}`);
  return readJson(filePath);
}

export function listReleaseVerifications(store, options = {}) {
  const limit = Number.isSafeInteger(Number(options.limit)) && Number(options.limit) > 0
    ? Math.min(Number(options.limit), 100)
    : 20;
  const items = readJsonl(releaseVerificationIndexPath(store))
    .sort((a, b) => String(b.finishedAt || b.persistedAt || "").localeCompare(String(a.finishedAt || a.persistedAt || "")))
    .slice(0, limit);
  return {
    interface: RELEASE_VERIFICATION_CONTRACT.interface,
    version: RELEASE_VERIFICATION_CONTRACT.version,
    summary: {
      total: readJsonl(releaseVerificationIndexPath(store)).length,
      returnedCount: items.length,
      passedCount: items.filter((item) => item.status === "passed").length,
      failedCount: items.filter((item) => item.status === "failed").length,
    },
    items,
    limits: RELEASE_VERIFICATION_CONTRACT.safetyBoundary,
  };
}

function releaseVerificationPath(store, verificationId) {
  return storeItemPath(store, "release-verifications", requiredVerificationId(verificationId));
}

function releaseVerificationIndexPath(store) {
  return path.join(store.root, "release-verification-index.jsonl");
}

function releaseVerificationListItem(record) {
  return {
    id: record.id,
    status: record.status,
    startedAt: record.startedAt,
    finishedAt: record.finishedAt,
    persistedAt: record.persistedAt,
    stepCount: record.summary?.stepCount ?? null,
    passedCount: record.summary?.passedCount ?? null,
    failedCount: record.summary?.failedCount ?? null,
    skippedCount: record.summary?.skippedCount ?? null,
    storeRelativePath: record.evidence?.storeRelativePath ?? null,
  };
}

function requiredVerificationId(value) {
  const id = String(value || "").trim();
  if (!id || !/^[A-Za-z0-9_.-]+$/.test(id)) {
    throw invalidInput("invalid release verification id");
  }
  return id;
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
