import fs from "node:fs";
import path from "node:path";
import { createId, nowIso } from "./id.js";
import { appendJsonl, readJson, readJsonl, writeJson } from "./storage.js";
import { readTraceEvents } from "./trace.js";

export function listSkills(store, status = "approved") {
  const dir = path.join(store.root, "skills", status);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")));
}

export function getSkill(store, skillId, status = "approved") {
  const filePath = skillPath(store, status, skillId);
  if (!fs.existsSync(filePath)) {
    throw new Error(`skill not found: ${skillId}`);
  }
  return readJson(filePath);
}

export function getApprovedSkill(store, skillId) {
  const skill = getSkill(store, skillId, "approved");
  if (skill.status !== "approved") {
    throw new Error(`skill is not approved: ${skillId}`);
  }
  if (!Array.isArray(skill.executableSteps)) {
    const hydrated = {
      ...skill,
      executableSteps: compileExecutableSteps(skill.steps),
      updatedAt: nowIso(),
      metadata: {
        ...skill.metadata,
        hydratedExecutableStepsAt: nowIso(),
      },
    };
    writeJson(skillPath(store, "approved", skillId), hydrated);
    return hydrated;
  }
  return skill;
}

export function proposeSkill(store, input) {
  const skill = {
    id: createId("skill"),
    name: input.name,
    version: "0.1.0",
    status: "candidate",
    summary: input.summary,
    steps: input.steps ?? [],
    sourceTraceIds: input.sourceTraceIds ?? [],
    eval: {},
    createdAt: nowIso(),
    updatedAt: nowIso(),
    metadata: input.metadata ?? {},
  };

  if (!skill.name || !skill.summary) {
    throw new Error("skill name and summary are required");
  }

  writeJson(skillPath(store, "candidates", skill.id), skill);
  return skill;
}

export function approveSkill(store, skillId, input = {}) {
  const candidate = getSkill(store, skillId, "candidates");
  if (candidate.status !== "candidate") {
    throw new Error(`skill is not a candidate: ${skillId}`);
  }
  if (!candidate.steps?.length) {
    throw new Error(`skill has no steps: ${skillId}`);
  }

  const approved = {
    ...candidate,
    status: "approved",
    revision: nextSkillRevision(store, skillId),
    executableSteps: compileExecutableSteps(candidate.steps),
    updatedAt: nowIso(),
    metadata: {
      ...candidate.metadata,
      approvedAt: nowIso(),
      approvedBy: input.approvedBy ?? "local-user",
      approvalReason: input.reason ?? "approved",
      approvalMode: input.approvalMode ?? "manual",
      evaluationId: input.evaluationId ?? candidate.metadata?.evaluationId ?? null,
      promotedAt: input.promotedAt ?? null,
      promotedBy: input.promotedBy ?? null,
      limits: [
        ...(candidate.metadata?.limits ?? []),
        "Approved skills are not automatically allowed to execute high-risk tools.",
        "Skill invocation v0 uses approved skills as planning guidance.",
      ],
    },
  };

  writeJson(skillPath(store, "approved", skillId), approved);
  const candidateFilePath = skillPath(store, "candidates", skillId);
  if (fs.existsSync(candidateFilePath)) {
    fs.unlinkSync(candidateFilePath);
  }
  recordSkillVersion(store, approved, {
    event: input.approvalMode === "promotion_gate" ? "skill.promoted" : "skill.approved",
    actor: input.promotedBy ?? input.approvedBy ?? "local-user",
    reason: input.reason ?? "approved",
    evaluationId: input.evaluationId ?? null,
  });
  return approved;
}

export function listSkillVersions(store, skillId) {
  return readJsonl(skillVersionIndexPath(store))
    .filter((entry) => entry.skillId === skillId)
    .sort((a, b) => Number(a.revision) - Number(b.revision));
}

export function getSkillVersion(store, skillId, revision) {
  const filePath = skillVersionPath(store, skillId, revision);
  if (!fs.existsSync(filePath)) {
    throw new Error(`skill version not found: ${skillId} revision ${revision}`);
  }
  return readJson(filePath);
}

export function restoreSkillVersion(store, skillId, revision, input = {}) {
  const snapshot = getSkillVersion(store, skillId, revision);
  if (snapshot.skill?.status !== "approved") {
    throw new Error(`only approved skill versions can be restored: ${skillId} revision ${revision}`);
  }
  const restoredAt = nowIso();
  const restored = {
    ...snapshot.skill,
    status: "approved",
    revision: nextSkillRevision(store, skillId),
    executableSteps: compileExecutableSteps(snapshot.skill.steps),
    updatedAt: restoredAt,
    metadata: {
      ...snapshot.skill.metadata,
      restoredAt,
      restoredBy: input.restoredBy ?? input.by ?? "local-user",
      restoredFromRevision: Number(revision),
      restoreReason: input.reason ?? "restored",
    },
  };

  writeJson(skillPath(store, "approved", skillId), restored);
  recordSkillVersion(store, restored, {
    event: "skill.restored",
    actor: input.restoredBy ?? input.by ?? "local-user",
    reason: input.reason ?? "restored",
    evaluationId: restored.metadata?.evaluationId ?? null,
  });
  return restored;
}

export function compileExecutableSteps(steps = []) {
  return steps
    .map((step, index) => parseExecutableStep(step, index))
    .filter(Boolean);
}

export function parseExecutableStep(step, index = 0) {
  const match = String(step).match(/^Use\s+([a-z][a-z0-9_.-]*)\s+with input\s+({.*})$/i);
  if (!match) return null;

  try {
    return {
      id: `skill_step_${index + 1}`,
      toolName: match[1],
      input: JSON.parse(match[2]),
      source: step,
    };
  } catch {
    return null;
  }
}

export function extractSkillFromTrace(store, traceId, input = {}) {
  const events = readTraceEvents(store, traceId);
  if (!events.length) {
    throw new Error(`trace has no events: ${traceId}`);
  }

  const started = events.find((event) => event.type === "trace.started");
  const planEvent = events.find((event) => event.type === "agent.plan");
  const toolResults = events
    .filter((event) => event.type === "tool.result")
    .map((event) => event.payload)
    .filter((payload) => payload.toolName);

  const reusableSteps = [];
  if (planEvent?.payload?.steps?.length) {
    for (const step of planEvent.payload.steps) {
      if (step.toolName) {
        reusableSteps.push(`Use ${step.toolName} with input ${JSON.stringify(step.input ?? {})}`);
      } else if (step.kind === "context_review") {
        reusableSteps.push("Retrieve and review relevant workspace context before execution");
      }
    }
  }

  for (const result of toolResults) {
    if (result.status === "requires_approval") {
      reusableSteps.push(`Request approval before ${result.toolName}`);
    }
    if (result.status === "succeeded") {
      reusableSteps.push(`Verify ${result.toolName} succeeded`);
    }
  }

  const uniqueSteps = dedupe(reusableSteps);
  if (uniqueSteps.length < Number(input.minSteps ?? 2)) {
    throw new Error(`trace does not contain enough reusable steps: ${traceId}`);
  }

  const goal = started?.payload?.goal ?? planEvent?.payload?.goal ?? "Untitled trace";
  const name = input.name ?? createSkillName(goal);
  const summary = input.summary ?? `Reusable workflow extracted from trace ${traceId}: ${goal}`;

  return proposeSkill(store, {
    name,
    summary,
    steps: uniqueSteps,
    sourceTraceIds: [traceId],
    metadata: {
      extractor: "trace_to_skill_v0",
      sourceEventCount: events.length,
      toolResultCount: toolResults.length,
      limits: [
        "Rule-based extraction only.",
        "No LLM synthesis was used.",
        "Candidate requires review before approval.",
      ],
    },
  });
}

function dedupe(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function createSkillName(goal) {
  const cleaned = String(goal)
    .replace(/[^\p{L}\p{N}\s_-]+/gu, "")
    .trim()
    .split(/\s+/)
    .slice(0, 8)
    .join(" ");
  return cleaned ? `${cleaned} Workflow` : "Extracted Trace Workflow";
}

function skillPath(store, status, skillId) {
  return path.join(store.root, "skills", status, `${skillId}.json`);
}

function recordSkillVersion(store, skill, input) {
  const snapshot = {
    id: createId("skill_version"),
    skillId: skill.id,
    revision: skill.revision ?? nextSkillRevision(store, skill.id),
    version: skill.version,
    status: skill.status,
    event: input.event,
    actor: input.actor ?? "local-user",
    reason: input.reason ?? "approved",
    evaluationId: input.evaluationId ?? skill.metadata?.evaluationId ?? null,
    createdAt: nowIso(),
    skill,
  };
  writeJson(skillVersionPath(store, skill.id, snapshot.revision), snapshot);
  appendJsonl(skillVersionIndexPath(store), {
    id: snapshot.id,
    skillId: snapshot.skillId,
    revision: snapshot.revision,
    version: snapshot.version,
    status: snapshot.status,
    event: snapshot.event,
    evaluationId: snapshot.evaluationId,
    createdAt: snapshot.createdAt,
  });
  return snapshot;
}

function nextSkillRevision(store, skillId) {
  const versions = listSkillVersions(store, skillId);
  return versions.length ? Math.max(...versions.map((version) => Number(version.revision) || 0)) + 1 : 1;
}

function skillVersionIndexPath(store) {
  return path.join(store.root, "skill-version-index.jsonl");
}

function skillVersionPath(store, skillId, revision) {
  return path.join(store.root, "skill-history", skillId, `${revision}.json`);
}
