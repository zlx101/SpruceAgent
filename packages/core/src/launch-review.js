import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { getAgentLaunch } from "./agent-launcher.js";
import { listArtifactsForTrace } from "./artifacts.js";
import { createId, nowIso } from "./id.js";
import { appendJsonl, readJson, readJsonl, storeItemPath, writeJson } from "./storage.js";
import { appendTraceEvent, readTraceEvents } from "./trace.js";

export const LAUNCH_REVIEW_CONTRACT = Object.freeze({
  version: "0.1.0",
  interface: "spruceagent.launch-review",
  sourceKind: "gated_agent_launch_record[]",
  outputKind: "reviewable_change_package",
  decisions: ["approved", "rejected", "needs_changes"],
  safetyBoundary: [
    "Launch Review v0 compares evidence from one or more Agent Launcher records.",
    "It does not claim to measure semantic code quality or automatically choose a winning agent.",
    "Approval records a candidate for manual follow-up only.",
    "Review decisions never commit, merge, push, open pull requests, or promote workspace changes.",
    "Terminal excerpts are local evidence and are not redacted in v0.",
  ],
});

const DECISIONS = new Set(LAUNCH_REVIEW_CONTRACT.decisions);
const MAX_CANDIDATES = 8;
const LOG_EXCERPT_CHARS = 4000;
const DIFF_EXCERPT_CHARS = 20000;
const MAX_UNTRACKED_FILES = 200;

export function getLaunchReviewContract() {
  return LAUNCH_REVIEW_CONTRACT;
}

export function createLaunchReview(store, input = {}) {
  const launchIds = normalizeLaunchIds(input);
  const launches = launchIds.map((launchId) => getAgentLaunch(store, launchId));
  const createdAt = nowIso();
  const review = {
    version: LAUNCH_REVIEW_CONTRACT.version,
    interface: LAUNCH_REVIEW_CONTRACT.interface,
    id: createId("launch_review"),
    createdAt,
    updatedAt: createdAt,
    createdBy: input.actor ?? "local-user",
    status: "pending_review",
    goal: commonGoal(launches),
    launchIds,
    candidateCount: launches.length,
    candidates: launches.map((launch) => buildCandidate(store, launch)),
    comparison: buildComparison(launches),
    decision: null,
    reviewGate: {
      humanDecisionRequired: true,
      automaticWinnerSelection: false,
      commitAllowedInV0: false,
      mergeAllowedInV0: false,
      pushAllowedInV0: false,
      promotionAllowedInV0: false,
    },
    notes: [
      "Compare candidate evidence before recording a decision.",
      "An approved decision identifies a candidate for manual follow-up; it does not mutate Git state.",
    ],
    limits: LAUNCH_REVIEW_CONTRACT.safetyBoundary,
  };

  writeJson(reviewPath(store, review.id), review);
  appendJsonl(reviewIndexPath(store), reviewIndexItem(review));
  appendReviewTraceEvents(store, review, "agent.launch.review.created");
  appendAudit(store, "launch_review.created", review);
  return review;
}

export function decideLaunchReview(store, reviewId, input = {}) {
  const review = getLaunchReview(store, reviewId);
  if (review.status !== "pending_review") {
    throw new Error(`launch review is already decided: ${reviewId}`);
  }
  const decision = String(input.decision ?? "").trim();
  if (!DECISIONS.has(decision)) {
    throw new Error(`decision must be one of: ${[...DECISIONS].join(", ")}`);
  }
  const reason = String(input.reason ?? "").trim();
  if (!reason) throw new Error("review decision reason is required");

  const selectedLaunchId = input.selectedLaunchId ? String(input.selectedLaunchId) : null;
  if (decision === "approved") {
    if (!selectedLaunchId) throw new Error("selectedLaunchId is required for approval");
    const selected = review.candidates.find((candidate) => candidate.launchId === selectedLaunchId);
    if (!selected) throw new Error(`selected launch is not part of review: ${selectedLaunchId}`);
    if (!selected.reviewable) throw new Error(`selected launch is not reviewable: ${selectedLaunchId}`);
    assertCandidateEvidenceUnchanged(store, selected);
  } else if (selectedLaunchId && !review.launchIds.includes(selectedLaunchId)) {
    throw new Error(`selected launch is not part of review: ${selectedLaunchId}`);
  }

  const decidedAt = nowIso();
  const updated = {
    ...review,
    updatedAt: decidedAt,
    status: decision === "approved" ? "approved_for_manual_followup" : decision,
    decision: {
      outcome: decision,
      selectedLaunchId,
      reason,
      decidedAt,
      decidedBy: input.actor ?? "local-user",
      effect: "record_only",
    },
  };
  writeJson(reviewPath(store, reviewId), updated);
  appendReviewTraceEvents(store, updated, "agent.launch.review.decided");
  appendAudit(store, "launch_review.decided", updated);
  return updated;
}

export function getLaunchReview(store, reviewId) {
  if (!reviewId) throw new Error("reviewId is required");
  const filePath = reviewPath(store, reviewId);
  if (!fs.existsSync(filePath)) throw new Error(`launch review not found: ${reviewId}`);
  return readJson(filePath);
}

export function listLaunchReviews(store, options = {}) {
  const seen = new Set();
  const items = readJsonl(reviewIndexPath(store))
    .filter((item) => !seen.has(item.id) && seen.add(item.id))
    .map((item) => {
      try {
        return getLaunchReview(store, item.id);
      } catch {
        return item;
      }
    })
    .filter((item) => !options.status || item.status === options.status)
    .filter((item) => !options.launchId || item.launchIds?.includes(options.launchId))
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));

  return {
    version: LAUNCH_REVIEW_CONTRACT.version,
    createdAt: nowIso(),
    status: items.length ? "available" : "empty",
    summary: {
      total: items.length,
      byStatus: countBy(items, (item) => item.status),
      pendingCount: items.filter((item) => item.status === "pending_review").length,
      approvedCount: items.filter((item) => item.status === "approved_for_manual_followup").length,
      multiCandidateCount: items.filter((item) => (item.candidateCount ?? 0) > 1).length,
    },
    items: items.map(reviewListItem),
    limits: LAUNCH_REVIEW_CONTRACT.safetyBoundary,
  };
}

function normalizeLaunchIds(input) {
  const values = Array.isArray(input.launchIds)
    ? input.launchIds
    : input.launchId
      ? [input.launchId]
      : [];
  const launchIds = [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
  if (!launchIds.length) throw new Error("launchId or launchIds is required");
  if (launchIds.length > MAX_CANDIDATES) {
    throw new Error(`launch review supports at most ${MAX_CANDIDATES} candidates`);
  }
  return launchIds;
}

function buildCandidate(store, launch) {
  const after = launch.git?.after ?? null;
  const traceEvents = safeReadTraceEvents(store, launch.traceId);
  const artifacts = listArtifactsForTrace(store, launch.traceId);
  const terminal = readTerminalEvidence(store, launch.terminalLog);
  const patch = readDiffEvidence(launch.workspacePath);
  const riskSignals = buildRiskSignals(launch, terminal, patch);
  return {
    launchId: launch.id,
    workspaceId: launch.workspaceId,
    workspacePath: launch.workspacePath,
    adapter: launch.adapter,
    goal: launch.goal,
    status: launch.status,
    executionMode: launch.executionMode,
    command: launch.command,
    exitCode: launch.exitCode,
    reviewable: launch.status === "completed"
      && launch.exitCode === 0
      && (!after?.insideWorkTree || (patch.available && patch.complete)),
    policyDecision: launch.policyDecision ? {
      decision: launch.policyDecision.decision,
      riskLevel: launch.policyDecision.riskLevel,
      reasons: launch.policyDecision.reasons ?? [],
    } : null,
    diff: {
      changed: launch.git?.changed ?? false,
      baselineStatus: launch.git?.before?.status ?? [],
      status: after?.status ?? [],
      statusDelta: difference(after?.status ?? [], launch.git?.before?.status ?? []),
      preExistingChanges: (launch.git?.before?.status ?? []).length > 0,
      nameStatus: after?.diffNameStatus ?? [],
      stat: after?.diffStat ?? "",
      branch: after?.branch ?? null,
      head: after?.head ?? null,
      patch,
    },
    terminal,
    trace: {
      traceId: launch.traceId,
      eventCount: traceEvents.length,
      lastEventType: traceEvents.at(-1)?.type ?? null,
      reportRoute: `/v1/reports/traces/${encodeURIComponent(launch.traceId)}?format=markdown`,
    },
    artifacts: artifacts.map((artifact) => ({
      id: artifact.id,
      kind: artifact.kind,
      status: artifact.status,
      title: artifact.title,
      route: artifact.route,
    })),
    riskSignals,
    evidenceFingerprint: fingerprintEvidence(launch, terminal, patch),
  };
}

function buildComparison(launches) {
  return {
    method: "evidence_matrix",
    automaticRecommendation: null,
    caveat: "Evidence is comparable; semantic correctness and code quality still require review and tests.",
    columns: ["launchId", "adapterId", "status", "exitCode", "changed", "fileCount", "riskLevel"],
    rows: launches.map((launch) => ({
      launchId: launch.id,
      adapterId: launch.adapter?.id ?? "unknown",
      status: launch.status,
      exitCode: launch.exitCode,
      changed: launch.git?.changed ?? false,
      fileCount: launch.git?.after?.diffNameStatus?.length ?? 0,
      riskLevel: launch.policyDecision?.riskLevel ?? "unknown",
    })),
  };
}

function buildRiskSignals(launch, terminal, patch) {
  const signals = [];
  if (launch.status !== "completed") signals.push({ level: "high", code: "launch_not_completed" });
  if (launch.exitCode !== null && launch.exitCode !== 0) signals.push({ level: "high", code: "nonzero_exit" });
  if (!terminal.available && launch.status === "completed") signals.push({ level: "medium", code: "terminal_log_missing" });
  if ((launch.git?.after?.status ?? []).some((line) => line.startsWith("??"))) {
    signals.push({ level: "medium", code: "untracked_files" });
  }
  if ((launch.git?.before?.status ?? []).length > 0) signals.push({ level: "medium", code: "preexisting_workspace_changes" });
  if (launch.policyDecision?.riskLevel === "high") signals.push({ level: "high", code: "high_risk_policy" });
  if (launch.git?.after?.insideWorkTree && (!patch.available || !patch.complete)) {
    signals.push({ level: "high", code: "diff_evidence_incomplete" });
  }
  if (!launch.git?.changed && launch.status === "completed") signals.push({ level: "info", code: "no_workspace_changes" });
  return signals;
}

function readTerminalEvidence(store, terminalLog) {
  if (!terminalLog?.path) return { available: false, path: null, bytes: 0, excerpt: "" };
  const root = path.resolve(store.root);
  const filePath = path.resolve(store.root, terminalLog.path);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    return { available: false, path: terminalLog.path, bytes: 0, excerpt: "", error: "path_outside_store" };
  }
  if (!fs.existsSync(filePath)) {
    return { available: false, path: terminalLog.path, bytes: terminalLog.bytes ?? 0, excerpt: "" };
  }
  const content = fs.readFileSync(filePath, "utf8");
  return {
    available: true,
    path: terminalLog.path,
    bytes: Buffer.byteLength(content, "utf8"),
    excerpt: content.slice(0, LOG_EXCERPT_CHARS),
    truncated: content.length > LOG_EXCERPT_CHARS,
    sha256: sha256(content),
  };
}

function readDiffEvidence(cwd) {
  try {
    const content = execFileSync("git", ["-C", cwd, "diff", "HEAD", "--no-ext-diff", "--no-color", "--unified=3", "--", ".", ":(exclude).spruceagent/**"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 2 * 1024 * 1024,
    });
    const untrackedOutput = execFileSync("git", ["-C", cwd, "ls-files", "--others", "--exclude-standard", "-z", "--", ".", ":(exclude).spruceagent/**"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 1024 * 1024,
    });
    const untrackedPaths = untrackedOutput.split("\0").filter(Boolean);
    const untracked = untrackedPaths.slice(0, MAX_UNTRACKED_FILES).map((relativePath) => untrackedEvidence(cwd, relativePath));
    const fingerprint = {
      trackedSha256: sha256(content),
      untracked: untracked.map(({ path: filePath, bytes, sha256: fileSha256 }) => ({
        path: filePath,
        bytes,
        sha256: fileSha256,
      })),
    };
    const untrackedExcerpt = untracked
      .filter((item) => item.textExcerpt)
      .map((item) => `\n--- untracked: ${item.path} ---\n${item.textExcerpt}`)
      .join("");
    const excerptContent = `${content}${untrackedExcerpt}`;
    return {
      available: true,
      complete: untrackedPaths.length <= MAX_UNTRACKED_FILES,
      bytes: Buffer.byteLength(content, "utf8") + untracked.reduce((total, item) => total + item.bytes, 0),
      sha256: sha256(JSON.stringify(fingerprint)),
      trackedSha256: fingerprint.trackedSha256,
      untracked,
      excerpt: excerptContent.slice(0, DIFF_EXCERPT_CHARS),
      truncated: excerptContent.length > DIFF_EXCERPT_CHARS || untrackedPaths.length > MAX_UNTRACKED_FILES,
    };
  } catch {
    return {
      available: false,
      complete: false,
      bytes: 0,
      sha256: null,
      trackedSha256: null,
      untracked: [],
      excerpt: "",
      truncated: false,
    };
  }
}

function untrackedEvidence(cwd, relativePath) {
  const root = path.resolve(cwd);
  const filePath = path.resolve(cwd, relativePath);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    return { path: relativePath, bytes: 0, sha256: null, textExcerpt: "", error: "path_outside_workspace" };
  }
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) return { path: relativePath, bytes: 0, sha256: null, textExcerpt: "", kind: "non_file" };
  const preview = Buffer.alloc(Math.min(stat.size, 2000));
  const descriptor = fs.openSync(filePath, "r");
  try {
    if (preview.length) fs.readSync(descriptor, preview, 0, preview.length, 0);
  } finally {
    fs.closeSync(descriptor);
  }
  return {
    path: relativePath,
    bytes: stat.size,
    sha256: sha256File(filePath),
    textExcerpt: preview.includes(0) ? "" : preview.toString("utf8"),
  };
}

function assertCandidateEvidenceUnchanged(store, candidate) {
  if (candidate.terminal?.available) {
    const currentTerminal = readTerminalEvidence(store, candidate.terminal);
    if (!currentTerminal.available || currentTerminal.sha256 !== candidate.terminal.sha256) {
      throw new Error(`candidate terminal evidence changed after review creation: ${candidate.launchId}`);
    }
  }
  if (candidate.diff?.patch?.available) {
    const currentPatch = readDiffEvidence(candidate.workspacePath);
    if (!currentPatch.available || currentPatch.sha256 !== candidate.diff.patch.sha256) {
      throw new Error(`candidate diff evidence changed after review creation: ${candidate.launchId}`);
    }
  }
}

function fingerprintEvidence(launch, terminal, patch) {
  return sha256(JSON.stringify({
    launchId: launch.id,
    status: launch.status,
    exitCode: launch.exitCode,
    terminalSha256: terminal.sha256 ?? null,
    diffSha256: patch.sha256 ?? null,
    gitAfter: launch.git?.after ?? null,
  }));
}

function sha256(value) {
  return crypto.createHash("sha256").update(Buffer.isBuffer(value) ? value : String(value)).digest("hex");
}

function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  const descriptor = fs.openSync(filePath, "r");
  const buffer = Buffer.alloc(64 * 1024);
  try {
    let bytesRead;
    do {
      bytesRead = fs.readSync(descriptor, buffer, 0, buffer.length, null);
      if (bytesRead) hash.update(buffer.subarray(0, bytesRead));
    } while (bytesRead);
  } finally {
    fs.closeSync(descriptor);
  }
  return hash.digest("hex");
}

function commonGoal(launches) {
  const goals = [...new Set(launches.map((launch) => launch.goal).filter(Boolean))];
  return goals.length === 1 ? goals[0] : "Compare agent launch candidates";
}

function reviewListItem(review) {
  return {
    id: review.id,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    status: review.status,
    goal: review.goal,
    launchIds: review.launchIds,
    candidateCount: review.candidateCount,
    decision: review.decision,
    reviewableCount: review.candidates?.filter((candidate) => candidate.reviewable).length ?? 0,
  };
}

function reviewIndexItem(review) {
  return reviewListItem(review);
}

function appendReviewTraceEvents(store, review, type) {
  for (const candidate of review.candidates) {
    appendTraceEvent(store, candidate.trace.traceId, type, {
      reviewId: review.id,
      status: review.status,
      candidateCount: review.candidateCount,
      selectedLaunchId: review.decision?.selectedLaunchId ?? null,
      outcome: review.decision?.outcome ?? null,
      effect: review.decision?.effect ?? "record_only",
    });
  }
}

function appendAudit(store, type, review) {
  appendJsonl(path.join(store.root, "audit.jsonl"), {
    type,
    reviewId: review.id,
    status: review.status,
    launchIds: review.launchIds,
    selectedLaunchId: review.decision?.selectedLaunchId ?? null,
    createdAt: nowIso(),
    actor: review.decision?.decidedBy ?? review.createdBy,
  });
}

function safeReadTraceEvents(store, traceId) {
  try {
    return readTraceEvents(store, traceId);
  } catch {
    return [];
  }
}

function reviewPath(store, reviewId) {
  return storeItemPath(store, "launch-reviews", reviewId);
}

function reviewIndexPath(store) {
  return path.join(store.root, "launch-review-index.jsonl");
}

function countBy(items, keyFn) {
  return items.reduce((counts, item) => {
    const key = keyFn(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function difference(values, baseline) {
  const baselineSet = new Set(baseline);
  return values.filter((value) => !baselineSet.has(value));
}
