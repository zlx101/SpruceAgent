import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { nowIso } from "./id.js";
import { readJson, writeJson } from "./storage.js";

const defaultExcludedDirs = new Set([
  ".git",
  ".spruceagent",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".turbo",
  "coverage",
  ".cache",
]);

const defaultTextExtensions = new Set([
  ".cjs",
  ".css",
  ".csv",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".xml",
  ".yaml",
  ".yml",
]);

const sensitiveFileNames = new Set([
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  ".npmrc",
  ".pypirc",
  ".netrc",
  "id_rsa",
  "id_dsa",
  "id_ecdsa",
  "id_ed25519",
]);

const sensitiveExtensions = new Set([
  ".key",
  ".pem",
  ".p12",
  ".pfx",
]);

const secretPatterns = [
  {
    name: "assignment_secret",
    pattern: /\b([A-Z0-9_]*(?:API[_-]?KEY|SECRET|TOKEN|PASSWORD|PRIVATE[_-]?KEY|ACCESS[_-]?KEY)[A-Z0-9_]*\s*[:=]\s*)(["']?)([^\s"',}]{8,})(\2)/gi,
    replacement: (...match) => `${match[1]}${match[2]}[REDACTED]${match[4]}`,
  },
  {
    name: "bearer_token",
    pattern: /\b(Bearer\s+)[A-Za-z0-9._~+/=-]{16,}/gi,
    replacement: (...match) => `${match[1]}[REDACTED]`,
  },
  {
    name: "openai_like_key",
    pattern: /\b(sk-[A-Za-z0-9_-]{16,})\b/g,
    replacement: () => "[REDACTED]",
  },
  {
    name: "github_token",
    pattern: /\b(gh[pousr]_[A-Za-z0-9_]{20,})\b/g,
    replacement: () => "[REDACTED]",
  },
];

export function buildWorkspaceIndex(store, options = {}) {
  const maxBytes = Number(options.maxBytes ?? 256 * 1024);
  const ignoreRules = loadIgnoreRules(store.cwd);
  const documents = [];
  const skipped = [];

  walk(store.cwd, (filePath) => {
    const relativePath = normalizePath(path.relative(store.cwd, filePath));
    const stat = fs.statSync(filePath);
    const extension = path.extname(filePath).toLowerCase();

    const sensitiveReason = classifySensitivePath(relativePath);
    if (sensitiveReason) {
      skipped.push({ path: relativePath, reason: sensitiveReason });
      return;
    }

    const ignoreRule = findMatchingIgnoreRule(relativePath, ignoreRules);
    if (ignoreRule) {
      skipped.push({ path: relativePath, reason: "ignored_by_rule", rule: ignoreRule.raw });
      return;
    }

    if (!defaultTextExtensions.has(extension)) {
      skipped.push({ path: relativePath, reason: "unsupported_extension" });
      return;
    }

    if (stat.size > maxBytes) {
      skipped.push({ path: relativePath, reason: "too_large", bytes: stat.size });
      return;
    }

    const buffer = fs.readFileSync(filePath);
    if (isLikelyBinary(buffer)) {
      skipped.push({ path: relativePath, reason: "binary" });
      return;
    }

    const content = buffer.toString("utf8");
    const redaction = redactSecrets(content);
    documents.push({
      path: relativePath,
      extension,
      bytes: stat.size,
      mtimeMs: stat.mtimeMs,
      hash: hashContent(buffer),
      lineCount: countLines(redaction.content),
      content: redaction.content,
      redacted: redaction.count > 0,
      redactionCount: redaction.count,
    });
  });

  const redactedDocumentCount = documents.filter((document) => document.redacted).length;
  const index = {
    version: 1,
    indexedAt: nowIso(),
    root: store.cwd,
    documentCount: documents.length,
    skippedCount: skipped.length,
    redactedDocumentCount,
    maxBytes,
    documents: documents.sort((a, b) => a.path.localeCompare(b.path)),
    skipped: skipped.sort((a, b) => a.path.localeCompare(b.path)),
    safety: {
      ignoredRuleCount: ignoreRules.length,
      sensitiveSkipCount: skipped.filter((item) => item.reason.startsWith("sensitive_")).length,
      redactedDocumentCount,
      redactionPatterns: secretPatterns.map((item) => item.name),
    },
  };

  writeJson(indexPath(store), index);
  return index;
}

export function readWorkspaceIndex(store) {
  const filePath = indexPath(store);
  if (!fs.existsSync(filePath)) return null;
  return readJson(filePath);
}

export function getIndexedDocument(store, relativePath) {
  const index = readWorkspaceIndex(store);
  if (!index) throw new Error("workspace index not found; run context index first");
  const normalized = normalizePath(relativePath);
  const document = index.documents.find((item) => item.path === normalized);
  if (!document) throw new Error(`indexed document not found: ${relativePath}`);
  return document;
}

export function searchWorkspaceContext(store, query, options = {}) {
  const index = readWorkspaceIndex(store);
  if (!index) throw new Error("workspace index not found; run context index first");

  const terms = tokenize(query);
  if (!terms.length) return [];

  const limit = Number(options.limit ?? 10);
  const snippetLength = Number(options.snippetLength ?? 240);

  return index.documents
    .map((document) => {
      const score = scoreDocument(document, terms, query);
      return {
        path: document.path,
        score,
        bytes: document.bytes,
        lineCount: document.lineCount,
        hash: document.hash,
        snippet: score > 0 ? createSnippet(document.content, terms, snippetLength) : "",
      };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, limit);
}

export function createContextPack(store, query, options = {}) {
  const results = searchWorkspaceContext(store, query, options);
  return {
    query,
    createdAt: nowIso(),
    resultCount: results.length,
    results,
  };
}

export function createSourceMap(store, input = {}) {
  const createdAt = nowIso();
  const index = readWorkspaceIndex(store);
  const context = input.context ?? null;
  const workspaceSources = (context?.results ?? []).map((result, indexInPack) => ({
    id: `source_workspace_${indexInPack + 1}`,
    type: "workspace",
    path: result.path,
    title: result.path,
    score: result.score ?? 0,
    snippet: result.snippet ?? "",
    hash: result.hash ?? null,
    bytes: result.bytes ?? null,
    lineCount: result.lineCount ?? null,
    indexedAt: context.createdAt ?? index?.indexedAt ?? null,
    freshness: freshnessLabel(context.createdAt ?? index?.indexedAt),
    confidence: confidenceFromScore(result.score ?? 0),
    metadata: {
      query: context.query ?? input.query ?? null,
      sourceRank: indexInPack + 1,
    },
  }));
  const memorySources = (input.memories ?? []).map((memory, indexInList) => ({
    id: `source_memory_${indexInList + 1}`,
    type: "memory",
    path: null,
    title: memory.content?.slice(0, 80) || memory.id || "memory",
    score: memory.score ?? null,
    snippet: memory.content ?? "",
    hash: null,
    bytes: null,
    lineCount: null,
    indexedAt: memory.createdAt ?? null,
    freshness: freshnessLabel(memory.createdAt),
    confidence: memory.score === undefined ? "unknown" : confidenceFromScore(memory.score),
    metadata: {
      id: memory.id,
      scope: memory.scope,
      kind: memory.kind,
      tags: memory.tags ?? [],
    },
  }));
  const skillSources = (input.skills ?? []).filter(Boolean).map((skill, indexInList) => ({
    id: `source_skill_${indexInList + 1}`,
    type: "skill",
    path: null,
    title: skill.name ?? skill.id,
    score: null,
    snippet: skill.summary ?? "",
    hash: null,
    bytes: null,
    lineCount: null,
    indexedAt: skill.updatedAt ?? skill.createdAt ?? null,
    freshness: freshnessLabel(skill.updatedAt ?? skill.createdAt),
    confidence: "selected",
    metadata: {
      id: skill.id,
      version: skill.version,
      status: skill.status,
      stepCount: skill.steps?.length ?? 0,
      executableStepCount: skill.executableSteps?.length ?? 0,
    },
  }));
  const llmSources = input.llm ? [{
    id: "source_llm_1",
    type: "llm",
    path: null,
    title: `${input.llm.provider ?? "llm"}:${input.llm.model ?? "unknown"}`,
    score: null,
    snippet: input.llm.planDraft?.summary ?? input.llm.error?.message ?? "",
    hash: null,
    bytes: null,
    lineCount: null,
    indexedAt: input.llm.createdAt ?? null,
    freshness: freshnessLabel(input.llm.createdAt),
    confidence: input.llm.status === "drafted" ? "provider_draft" : "failed",
    metadata: {
      provider: input.llm.provider,
      model: input.llm.model,
      status: input.llm.status,
      proposedStepCount: input.llm.planDraft?.proposedSteps?.length ?? 0,
    },
  }] : [];
  const sources = [
    ...workspaceSources,
    ...memorySources,
    ...skillSources,
    ...llmSources,
  ];
  const byType = sources.reduce((counts, source) => ({
    ...counts,
    [source.type]: (counts[source.type] ?? 0) + 1,
  }), {});

  return {
    version: "0.1.0",
    createdAt,
    query: context?.query ?? input.query ?? null,
    index: index
      ? {
          indexedAt: index.indexedAt,
          documentCount: index.documentCount,
          root: index.root,
        }
      : null,
    summary: {
      sourceCount: sources.length,
      byType,
      topWorkspacePath: workspaceSources[0]?.path ?? null,
    },
    sources,
    limits: [
      "Source Map v0 is evidence metadata, not proof of correctness.",
      "Workspace scores are lexical retrieval scores.",
      "Memory, skill, and LLM sources are included when supplied by the caller.",
    ],
  };
}

function walk(dir, onFile) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (defaultExcludedDirs.has(entry.name)) continue;
      walk(path.join(dir, entry.name), onFile);
      continue;
    }
    if (entry.isFile()) {
      onFile(path.join(dir, entry.name));
    }
  }
}

function loadIgnoreRules(root) {
  const filePath = path.join(root, ".gitignore");
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("!"))
    .map((raw) => ({
      raw,
      directoryOnly: raw.endsWith("/"),
      pattern: raw.replace(/^\/+/, "").replace(/\/+$/, ""),
    }))
    .filter((rule) => rule.pattern && !rule.pattern.includes("**"));
}

function findMatchingIgnoreRule(relativePath, rules) {
  return rules.find((rule) => matchesIgnoreRule(relativePath, rule));
}

function matchesIgnoreRule(relativePath, rule) {
  const normalized = normalizePath(relativePath);
  const pattern = normalizePath(rule.pattern);
  if (rule.directoryOnly) {
    return normalized === pattern || normalized.startsWith(`${pattern}/`) || normalized.includes(`/${pattern}/`);
  }
  if (pattern.includes("*")) {
    return globToRegex(pattern).test(normalized) || globToRegex(`*/${pattern}`).test(normalized);
  }
  if (pattern.includes("/")) {
    return normalized === pattern || normalized.startsWith(`${pattern}/`);
  }
  return normalized === pattern || normalized.endsWith(`/${pattern}`);
}

function globToRegex(pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, "[^/]*");
  return new RegExp(`^${escaped}$`);
}

function classifySensitivePath(relativePath) {
  const normalized = normalizePath(relativePath).toLowerCase();
  const baseName = path.posix.basename(normalized);
  const extension = path.posix.extname(normalized);
  if (sensitiveFileNames.has(baseName)) return "sensitive_filename";
  if (sensitiveExtensions.has(extension)) return "sensitive_extension";
  if (normalized.includes("/.ssh/")) return "sensitive_directory";
  if (normalized.includes("/secrets/") || normalized.includes("/secret/")) return "sensitive_directory";
  if (/(\b|[/_.-])secrets?([/_.-]|$)/i.test(normalized)) return "sensitive_name";
  return null;
}

function redactSecrets(content) {
  let redacted = String(content ?? "");
  let count = 0;
  for (const item of secretPatterns) {
    redacted = redacted.replace(item.pattern, (...args) => {
      count += 1;
      return item.replacement(...args);
    });
  }
  return { content: redacted, count };
}

function scoreDocument(document, terms, rawQuery) {
  const pathText = document.path.toLowerCase();
  const contentText = document.content.toLowerCase();
  const query = String(rawQuery ?? "").toLowerCase();
  let score = 0;

  if (pathText.includes(query)) score += 25;
  if (contentText.includes(query)) score += 20;

  for (const term of terms) {
    if (pathText.includes(term)) score += 8;
    score += countOccurrences(contentText, term);
  }

  return score;
}

function createSnippet(content, terms, snippetLength) {
  const lower = content.toLowerCase();
  const firstHit = terms
    .map((term) => lower.indexOf(term))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0] ?? 0;

  const start = Math.max(0, firstHit - Math.floor(snippetLength / 3));
  const end = Math.min(content.length, start + snippetLength);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < content.length ? "..." : "";
  return `${prefix}${content.slice(start, end).replace(/\s+/g, " ").trim()}${suffix}`;
}

function tokenize(value) {
  return String(value ?? "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}_-]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function countOccurrences(text, term) {
  let count = 0;
  let index = text.indexOf(term);
  while (index >= 0) {
    count += 1;
    index = text.indexOf(term, index + term.length);
  }
  return count;
}

function isLikelyBinary(buffer) {
  if (!buffer.length) return false;
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
  return sample.includes(0);
}

function countLines(content) {
  if (!content) return 0;
  return content.split(/\r?\n/).length;
}

function hashContent(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function normalizePath(value) {
  return String(value).replaceAll(path.sep, "/");
}

function freshnessLabel(value) {
  if (!value) return "unknown";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "unknown";
  const ageMs = Date.now() - time;
  if (ageMs < 0) return "future";
  const ageDays = ageMs / 86400000;
  if (ageDays <= 1) return "fresh";
  if (ageDays <= 7) return "recent";
  if (ageDays <= 30) return "aging";
  return "stale";
}

function confidenceFromScore(score) {
  const value = Number(score ?? 0);
  if (value >= 80) return "high";
  if (value >= 25) return "medium";
  if (value > 0) return "low";
  return "unknown";
}

function indexPath(store) {
  return path.join(store.root, "context", "workspace-index.json");
}
