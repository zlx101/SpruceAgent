import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { approveTicket, getApprovalTicket, listApprovalTickets, rejectTicket } from "./approvals.js";
import { buildWorkspaceIndex, readWorkspaceIndex, searchWorkspaceContext } from "./context.js";
import { evaluateTrace, getEvaluation, listEvaluations } from "./evaluations.js";
import {
  evaluateSkillCandidate,
  getSkillEvaluation,
  getSkillEvaluationContract,
  listSkillEvaluations,
} from "./skill-evaluations.js";
import { getSkillPromotionContract, promoteSkillCandidate } from "./skill-promotion.js";
import {
  exportSkillPackage,
  getSkillPackage,
  getSkillPackageContract,
  getSkillPackageImport,
  importSkillPackage,
  listSkillPackageImports,
  listSkillPackages,
} from "./skill-packages.js";
import {
  createSkillReplayFixture,
  getSkillReplayContract,
  getSkillReplayFixture,
  getSkillReplayResult,
  listSkillReplayFixtures,
  listSkillReplayResults,
  replaySkillFixture,
} from "./skill-replay.js";
import { executeTool } from "./executor.js";
import { listMemory } from "./memory.js";
import {
  executeApprovedCandidateStep,
  getCandidateApprovalContract,
  requestCandidateApprovals,
} from "./candidate-approvals.js";
import { getCandidateExecutionContract } from "./candidate-executor.js";
import { getRunContinuationContract, resumeAgentRun } from "./agent-continuation.js";
import { getRunDetail, getRunDetailContract } from "./run-detail.js";
import { getRunInbox, getRunInboxContract } from "./run-inbox.js";
import { getLlmAdapterContract } from "./llm.js";
import { runAgent } from "./agent-runner.js";
import { readJson, writeJson } from "./storage.js";
import { listTools } from "./tools.js";
import { listTraces } from "./trace.js";
import {
  getWorkflowDetailContract,
  getWorkflowInbox,
  getWorkflowInboxContract,
  getWorkflowRunDetail,
} from "./workflow-state.js";
import { getWorkflowContinuationContract, resumeWorkflowRun } from "./workflow-continuation.js";
import {
  createWorkflowFromDraft,
  draftWorkflow,
  getWorkflowBuilderContract,
} from "./workflow-builder.js";
import {
  archiveWorkflow,
  createWorkflow,
  getWorkflow,
  getWorkflowVersion,
  listWorkflowVersions,
  listWorkflows,
  restoreWorkflowVersion,
  runWorkflow,
  updateWorkflow,
} from "./workflows.js";
import { getSkillVersion, listSkillVersions, listSkills, restoreSkillVersion } from "./skills.js";

const DEFAULT_GATEWAY_HOST = "127.0.0.1";
const DEFAULT_GATEWAY_PORT = 7357;
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const WORKBENCH_ROOT = path.join(PROJECT_ROOT, "apps", "desktop");
const SHOWCASE_ROOT = path.join(PROJECT_ROOT, "apps", "showcase");

export const GATEWAY_ROUTE_CONTRACT = Object.freeze({
  version: "0.1.0",
  basePath: "/v1",
  localOnly: true,
  auth: {
    type: "bearer-token",
    requiredForV1: true,
  },
  routes: [
    {
      id: "health",
      method: "GET",
      path: "/health",
      authRequired: false,
      description: "Check that the local gateway process is alive.",
    },
    {
      id: "workbench",
      method: "GET",
      path: "/workbench",
      authRequired: false,
      description: "Serve the local SpruceAgent Workbench UI.",
    },
    {
      id: "showcase",
      method: "GET",
      path: "/showcase",
      authRequired: false,
      description: "Serve the public SpruceAgent showcase page.",
    },
    {
      id: "status",
      method: "GET",
      path: "/v1/status",
      authRequired: true,
      description: "Read local workspace and gateway status.",
    },
    {
      id: "inbox",
      method: "GET",
      path: "/v1/inbox",
      authRequired: true,
      description: "Read the Run State / Inbox workbench projection.",
    },
    {
      id: "inbox.contract",
      method: "GET",
      path: "/v1/inbox/contract",
      authRequired: true,
      description: "Read the Run Inbox contract.",
    },
    {
      id: "tools.list",
      method: "GET",
      path: "/v1/tools",
      authRequired: true,
      description: "List registered tools.",
    },
    {
      id: "skills.list",
      method: "GET",
      path: "/v1/skills",
      authRequired: true,
      description: "List local skills by status.",
    },
    {
      id: "skill_evaluations.contract",
      method: "GET",
      path: "/v1/skill-evaluations/contract",
      authRequired: true,
      description: "Read the SkillForge Evaluation Harness contract.",
    },
    {
      id: "skill_evaluations.list",
      method: "GET",
      path: "/v1/skill-evaluations",
      authRequired: true,
      description: "List skill evaluation reports.",
    },
    {
      id: "skill_evaluations.get",
      method: "GET",
      path: "/v1/skill-evaluations/:evaluationId",
      authRequired: true,
      description: "Read a skill evaluation report by id.",
    },
    {
      id: "skill_evaluations.create",
      method: "POST",
      path: "/v1/skills/:skillId/evaluations",
      authRequired: true,
      description: "Evaluate a candidate or approved skill without executing it.",
    },
    {
      id: "skill_promotion.contract",
      method: "GET",
      path: "/v1/skills/promotion-contract",
      authRequired: true,
      description: "Read the Skill Promotion Gate contract.",
    },
    {
      id: "skills.promote",
      method: "POST",
      path: "/v1/skills/:skillId/promote",
      authRequired: true,
      description: "Promote a candidate skill after passing the evaluation gate.",
    },
    {
      id: "skills.versions",
      method: "GET",
      path: "/v1/skills/:skillId/versions",
      authRequired: true,
      description: "List skill version snapshots.",
    },
    {
      id: "skills.version",
      method: "GET",
      path: "/v1/skills/:skillId/versions/:revision",
      authRequired: true,
      description: "Read a skill version snapshot.",
    },
    {
      id: "skills.restore",
      method: "POST",
      path: "/v1/skills/:skillId/versions/:revision/restore",
      authRequired: true,
      description: "Restore an approved skill from a version snapshot.",
    },
    {
      id: "skill_packages.contract",
      method: "GET",
      path: "/v1/skills/package-contract",
      authRequired: true,
      description: "Read the portable Skill Package contract.",
    },
    {
      id: "skill_packages.export",
      method: "POST",
      path: "/v1/skills/:skillId/package-export",
      authRequired: true,
      description: "Export an approved skill and evidence as a portable package.",
    },
    {
      id: "skill_packages.list",
      method: "GET",
      path: "/v1/skill-packages",
      authRequired: true,
      description: "List exported local skill packages.",
    },
    {
      id: "skill_packages.get",
      method: "GET",
      path: "/v1/skill-packages/:packageId",
      authRequired: true,
      description: "Read a skill package.",
    },
    {
      id: "skill_packages.import",
      method: "POST",
      path: "/v1/skill-packages/import",
      authRequired: true,
      description: "Import a skill package as a candidate skill.",
    },
    {
      id: "skill_packages.imports.list",
      method: "GET",
      path: "/v1/skill-package-imports",
      authRequired: true,
      description: "List skill package import records.",
    },
    {
      id: "skill_packages.imports.get",
      method: "GET",
      path: "/v1/skill-package-imports/:importId",
      authRequired: true,
      description: "Read a skill package import record.",
    },
    {
      id: "skill_replay.contract",
      method: "GET",
      path: "/v1/skills/replay-contract",
      authRequired: true,
      description: "Read the static Skill Replay contract.",
    },
    {
      id: "skill_replay.fixtures.list",
      method: "GET",
      path: "/v1/skill-replay/fixtures",
      authRequired: true,
      description: "List skill replay fixtures.",
    },
    {
      id: "skill_replay.fixtures.get",
      method: "GET",
      path: "/v1/skill-replay/fixtures/:fixtureId",
      authRequired: true,
      description: "Read a skill replay fixture.",
    },
    {
      id: "skill_replay.fixtures.create",
      method: "POST",
      path: "/v1/skills/:skillId/replay-fixtures",
      authRequired: true,
      description: "Create a static replay fixture for a skill.",
    },
    {
      id: "skill_replay.run",
      method: "POST",
      path: "/v1/skill-replay/fixtures/:fixtureId/run",
      authRequired: true,
      description: "Run static replay checks for a fixture.",
    },
    {
      id: "skill_replay.results.list",
      method: "GET",
      path: "/v1/skill-replay/results",
      authRequired: true,
      description: "List skill replay results.",
    },
    {
      id: "skill_replay.results.get",
      method: "GET",
      path: "/v1/skill-replay/results/:resultId",
      authRequired: true,
      description: "Read a skill replay result.",
    },
    {
      id: "tools.run",
      method: "POST",
      path: "/v1/tools/run",
      authRequired: true,
      description: "Execute a tool through TrustKernel policy and approval gates.",
    },
    {
      id: "context.index",
      method: "POST",
      path: "/v1/context/index",
      authRequired: true,
      description: "Build or refresh the local workspace index.",
    },
    {
      id: "context.search",
      method: "POST",
      path: "/v1/context/search",
      authRequired: true,
      description: "Search indexed workspace context.",
    },
    {
      id: "runs.create",
      method: "POST",
      path: "/v1/runs",
      authRequired: true,
      description: "Start an Agent Run Loop v0 run.",
    },
    {
      id: "runs.get",
      method: "GET",
      path: "/v1/runs/:traceId",
      authRequired: true,
      description: "Read a structured run detail and trace view.",
    },
    {
      id: "run_detail.contract",
      method: "GET",
      path: "/v1/runs/detail-contract",
      authRequired: true,
      description: "Read the Run Detail contract.",
    },
    {
      id: "workflows.list",
      method: "GET",
      path: "/v1/workflows",
      authRequired: true,
      description: "List local workflows.",
    },
    {
      id: "workflows.create",
      method: "POST",
      path: "/v1/workflows",
      authRequired: true,
      description: "Create a local workflow definition without executing it.",
    },
    {
      id: "workflows.update",
      method: "PATCH",
      path: "/v1/workflows/:workflowId",
      authRequired: true,
      description: "Update a workflow definition and preserve the previous revision.",
    },
    {
      id: "workflows.archive",
      method: "POST",
      path: "/v1/workflows/:workflowId/archive",
      authRequired: true,
      description: "Archive a workflow definition without deleting history.",
    },
    {
      id: "workflows.versions",
      method: "GET",
      path: "/v1/workflows/:workflowId/versions",
      authRequired: true,
      description: "List workflow revision history.",
    },
    {
      id: "workflows.version",
      method: "GET",
      path: "/v1/workflows/:workflowId/versions/:revision",
      authRequired: true,
      description: "Read one workflow revision.",
    },
    {
      id: "workflows.restore",
      method: "POST",
      path: "/v1/workflows/:workflowId/versions/:revision/restore",
      authRequired: true,
      description: "Restore a workflow from a prior revision.",
    },
    {
      id: "workflow_inbox",
      method: "GET",
      path: "/v1/workflows/inbox",
      authRequired: true,
      description: "Read workflow run inbox state.",
    },
    {
      id: "workflow_inbox.contract",
      method: "GET",
      path: "/v1/workflows/inbox-contract",
      authRequired: true,
      description: "Read the Workflow Inbox contract.",
    },
    {
      id: "workflow_detail.contract",
      method: "GET",
      path: "/v1/workflows/detail-contract",
      authRequired: true,
      description: "Read the Workflow Detail contract.",
    },
    {
      id: "workflow_continuation.contract",
      method: "GET",
      path: "/v1/workflows/continuation-contract",
      authRequired: true,
      description: "Read the Workflow Continuation contract.",
    },
    {
      id: "workflow_runs.get",
      method: "GET",
      path: "/v1/workflows/runs/:traceId",
      authRequired: true,
      description: "Read a structured workflow run detail and trace view.",
    },
    {
      id: "workflow_runs.resume",
      method: "POST",
      path: "/v1/workflows/runs/:traceId/resume",
      authRequired: true,
      description: "Resume an approval-gated workflow tool step from an existing workflow trace.",
    },
    {
      id: "workflows.get",
      method: "GET",
      path: "/v1/workflows/:workflowId",
      authRequired: true,
      description: "Read a workflow by id.",
    },
    {
      id: "workflows.run",
      method: "POST",
      path: "/v1/workflows/:workflowId/run",
      authRequired: true,
      description: "Run a workflow through the local runtime.",
    },
    {
      id: "approvals.list",
      method: "GET",
      path: "/v1/approvals",
      authRequired: true,
      description: "List approval tickets, optionally filtered by status.",
    },
    {
      id: "approvals.get",
      method: "GET",
      path: "/v1/approvals/:approvalId",
      authRequired: true,
      description: "Read an approval ticket by id.",
    },
    {
      id: "approvals.approve",
      method: "POST",
      path: "/v1/approvals/:approvalId/approve",
      authRequired: true,
      description: "Approve a pending approval ticket.",
    },
    {
      id: "approvals.reject",
      method: "POST",
      path: "/v1/approvals/:approvalId/reject",
      authRequired: true,
      description: "Reject a pending approval ticket.",
    },
    {
      id: "evaluations.list",
      method: "GET",
      path: "/v1/evaluations",
      authRequired: true,
      description: "List evaluation reports.",
    },
    {
      id: "evaluations.get",
      method: "GET",
      path: "/v1/evaluations/:evaluationId",
      authRequired: true,
      description: "Read an evaluation report by id.",
    },
    {
      id: "evaluations.trace",
      method: "POST",
      path: "/v1/evaluations/trace",
      authRequired: true,
      description: "Evaluate a trace by id.",
    },
    {
      id: "contract",
      method: "GET",
      path: "/v1/contract",
      authRequired: true,
      description: "Read the GatewayMesh route contract.",
    },
    {
      id: "llm.contract",
      method: "GET",
      path: "/v1/llm/contract",
      authRequired: true,
      description: "Read the LLM adapter contract.",
    },
    {
      id: "workflow_builder.contract",
      method: "GET",
      path: "/v1/workflow-builder/contract",
      authRequired: true,
      description: "Read the Workflow Builder contract.",
    },
    {
      id: "workflow_builder.draft",
      method: "POST",
      path: "/v1/workflow-builder/draft",
      authRequired: true,
      description: "Draft a workflow definition from a goal without executing it.",
    },
    {
      id: "workflow_builder.save",
      method: "POST",
      path: "/v1/workflow-builder/save",
      authRequired: true,
      description: "Save a reviewed workflow draft as a workflow definition without running it.",
    },
    {
      id: "candidate.contract",
      method: "GET",
      path: "/v1/candidate/contract",
      authRequired: true,
      description: "Read the Candidate Execution contract.",
    },
    {
      id: "candidate.approval_contract",
      method: "GET",
      path: "/v1/candidate/approval-contract",
      authRequired: true,
      description: "Read the Candidate Approval contract.",
    },
    {
      id: "candidate.request_approvals",
      method: "POST",
      path: "/v1/candidate/approvals",
      authRequired: true,
      description: "Create approval tickets for approval-gated candidate steps.",
    },
    {
      id: "candidate.execute_approved",
      method: "POST",
      path: "/v1/candidate/execute-approved",
      authRequired: true,
      description: "Execute an approved candidate step through TrustKernel.",
    },
    {
      id: "run_continuation.contract",
      method: "GET",
      path: "/v1/runs/continuation-contract",
      authRequired: true,
      description: "Read the Run Continuation contract.",
    },
    {
      id: "runs.resume",
      method: "POST",
      path: "/v1/runs/:traceId/resume",
      authRequired: true,
      description: "Resume an approval-gated candidate step from an existing run trace.",
    },
  ],
});

export function getGatewayRouteContract() {
  return GATEWAY_ROUTE_CONTRACT;
}

export function ensureGatewayToken(store, options = {}) {
  const config = readConfig(store);
  const gateway = config.gateway ?? {};
  if (!options.rotate && gateway.localApiTokenHash) {
    return {
      created: false,
      token: null,
      tokenPrefix: gateway.localApiTokenPrefix ?? null,
    };
  }

  const token = `spruce_local_${crypto.randomBytes(32).toString("base64url")}`;
  config.gateway = {
    ...gateway,
    localApiTokenHash: hashToken(token),
    localApiTokenPrefix: token.slice(0, 18),
    localOnly: true,
    updatedAt: new Date().toISOString(),
  };
  writeJson(configPath(store), config);
  return {
    created: true,
    token,
    tokenPrefix: config.gateway.localApiTokenPrefix,
  };
}

export function getGatewayAuthStatus(store) {
  const config = readConfig(store);
  return {
    tokenConfigured: Boolean(config.gateway?.localApiTokenHash),
    tokenPrefix: config.gateway?.localApiTokenPrefix ?? null,
    localOnly: true,
  };
}

export function verifyGatewayToken(store, token) {
  const expected = readConfig(store).gateway?.localApiTokenHash;
  if (!expected || !token) return false;
  const actual = hashToken(token);
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(actual, "hex");
  return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

export function createGatewayServer(store, options = {}) {
  const handler = createGatewayHandler(store, options);
  return http.createServer(handler);
}

export async function startGatewayServer(store, options = {}) {
  const host = options.host ?? DEFAULT_GATEWAY_HOST;
  const port = Number(options.port ?? DEFAULT_GATEWAY_PORT);
  if (!isLocalHost(host) && !options.allowRemote) {
    throw new Error("gateway refuses non-local host unless allowRemote is explicitly set");
  }

  const token = ensureGatewayToken(store);
  const server = createGatewayServer(store, options);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });
  const address = server.address();
  return {
    server,
    host,
    port: typeof address === "object" && address ? address.port : port,
    tokenCreated: token.created,
    token: token.token,
    tokenPrefix: token.tokenPrefix,
  };
}

export function createGatewayHandler(store, options = {}) {
  return async function gatewayHandler(request, response) {
    try {
      const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
      if (request.method === "GET" && url.pathname === "/health") {
        return sendJson(response, 200, {
          ok: true,
          service: "spruceagent-gateway",
          localOnly: true,
        });
      }

      if (request.method === "GET" && isStaticPagePath(url.pathname)) {
        return sendStaticPageAsset(response, url.pathname);
      }

      if (!verifyRequest(store, request, options)) {
        return sendJson(response, 401, {
          error: "unauthorized",
          message: "Bearer token is required for GatewayMesh Local API.",
        });
      }

      const body = await readBody(request);
      const result = await routeRequest(store, request, url, body);
      return sendJson(response, result.statusCode ?? 200, result.body);
    } catch (error) {
      return sendJson(response, error.statusCode ?? 500, {
        error: "gateway_error",
        message: error.message,
      });
    }
  };
}

async function routeRequest(store, request, url, body) {
  const pathParts = url.pathname.split("/").filter(Boolean);
  if (pathParts[0] !== "v1") {
    return notFound();
  }

  if (request.method === "GET" && url.pathname === "/v1/status") {
    return ok(gatewayStatus(store));
  }

  if (request.method === "GET" && url.pathname === "/v1/inbox") {
    return ok(getRunInbox(store, {
      limit: url.searchParams.get("limit") ?? undefined,
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/inbox/contract") {
    return ok(getRunInboxContract());
  }

  if (request.method === "GET" && url.pathname === "/v1/contract") {
    return ok(getGatewayRouteContract());
  }

  if (request.method === "GET" && url.pathname === "/v1/llm/contract") {
    return ok(getLlmAdapterContract());
  }

  if (request.method === "GET" && url.pathname === "/v1/workflow-builder/contract") {
    return ok(getWorkflowBuilderContract());
  }

  if (request.method === "GET" && url.pathname === "/v1/candidate/contract") {
    return ok(getCandidateExecutionContract());
  }

  if (request.method === "GET" && url.pathname === "/v1/candidate/approval-contract") {
    return ok(getCandidateApprovalContract());
  }

  if (request.method === "GET" && url.pathname === "/v1/runs/continuation-contract") {
    return ok(getRunContinuationContract());
  }

  if (request.method === "GET" && url.pathname === "/v1/runs/detail-contract") {
    return ok(getRunDetailContract());
  }

  if (request.method === "GET" && url.pathname === "/v1/tools") {
    return ok(listTools());
  }

  if (request.method === "GET" && url.pathname === "/v1/skills") {
    return ok(listSkills(store, url.searchParams.get("status") ?? "approved"));
  }

  if (request.method === "GET" && url.pathname === "/v1/skill-evaluations/contract") {
    return ok(getSkillEvaluationContract());
  }

  if (request.method === "GET" && url.pathname === "/v1/skill-evaluations") {
    return ok(listSkillEvaluations(store));
  }

  if (request.method === "GET" && pathParts[1] === "skill-evaluations" && pathParts[2]) {
    return ok(getSkillEvaluation(store, pathParts[2]));
  }

  if (request.method === "POST" && pathParts[1] === "skills" && pathParts[2] && pathParts[3] === "evaluations") {
    return ok(evaluateSkillCandidate(store, pathParts[2], {
      status: body.status,
      traceId: body.traceId,
      trustMode: body.trustMode,
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/skills/promotion-contract") {
    return ok(getSkillPromotionContract());
  }

  if (request.method === "POST" && pathParts[1] === "skills" && pathParts[2] && pathParts[3] === "promote") {
    return ok(promoteSkillCandidate(store, pathParts[2], {
      evaluationId: body.evaluationId,
      minimumScore: body.minimumScore,
      useLatestEvaluation: Boolean(body.useLatestEvaluation),
      trustMode: body.trustMode,
      by: body.by ?? body.actor ?? "gateway-user",
      reason: body.reason,
    }));
  }

  if (request.method === "GET" && pathParts[1] === "skills" && pathParts[2] && pathParts[3] === "versions" && !pathParts[4]) {
    return ok(listSkillVersions(store, pathParts[2]));
  }

  if (request.method === "GET" && pathParts[1] === "skills" && pathParts[2] && pathParts[3] === "versions" && pathParts[4] && !pathParts[5]) {
    return ok(getSkillVersion(store, pathParts[2], pathParts[4]));
  }

  if (request.method === "POST" && pathParts[1] === "skills" && pathParts[2] && pathParts[3] === "versions" && pathParts[4] && pathParts[5] === "restore") {
    return ok(restoreSkillVersion(store, pathParts[2], pathParts[4], {
      by: body.by ?? body.actor ?? "gateway-user",
      reason: body.reason,
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/skills/package-contract") {
    return ok(getSkillPackageContract());
  }

  if (request.method === "POST" && pathParts[1] === "skills" && pathParts[2] && pathParts[3] === "package-export") {
    return ok(exportSkillPackage(store, pathParts[2], {
      status: body.status,
      by: body.by ?? body.actor ?? "gateway-user",
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/skill-packages") {
    return ok(listSkillPackages(store));
  }

  if (request.method === "GET" && pathParts[1] === "skill-packages" && pathParts[2] && !pathParts[3]) {
    return ok(getSkillPackage(store, pathParts[2]));
  }

  if (request.method === "POST" && url.pathname === "/v1/skill-packages/import") {
    const pkg = body.packageId ? getSkillPackage(store, body.packageId) : body.package;
    return ok(importSkillPackage(store, pkg, {
      name: body.name,
      summary: body.summary,
      preserveSourceTraceIds: Boolean(body.preserveSourceTraceIds),
      includeSourceMetadata: body.includeSourceMetadata,
      by: body.by ?? body.actor ?? "gateway-user",
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/skill-package-imports") {
    return ok(listSkillPackageImports(store));
  }

  if (request.method === "GET" && pathParts[1] === "skill-package-imports" && pathParts[2]) {
    return ok(getSkillPackageImport(store, pathParts[2]));
  }

  if (request.method === "GET" && url.pathname === "/v1/skills/replay-contract") {
    return ok(getSkillReplayContract());
  }

  if (request.method === "GET" && url.pathname === "/v1/skill-replay/fixtures") {
    return ok(listSkillReplayFixtures(store));
  }

  if (request.method === "GET" && pathParts[1] === "skill-replay" && pathParts[2] === "fixtures" && pathParts[3] && !pathParts[4]) {
    return ok(getSkillReplayFixture(store, pathParts[3]));
  }

  if (request.method === "POST" && pathParts[1] === "skills" && pathParts[2] && pathParts[3] === "replay-fixtures") {
    return ok(createSkillReplayFixture(store, pathParts[2], {
      status: body.status,
      evaluationId: body.evaluationId,
      name: body.name,
      description: body.description,
      minimumScore: body.minimumScore,
    }));
  }

  if (request.method === "POST" && pathParts[1] === "skill-replay" && pathParts[2] === "fixtures" && pathParts[3] && pathParts[4] === "run") {
    return ok(replaySkillFixture(store, pathParts[3], {
      status: body.status,
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/skill-replay/results") {
    return ok(listSkillReplayResults(store));
  }

  if (request.method === "GET" && pathParts[1] === "skill-replay" && pathParts[2] === "results" && pathParts[3]) {
    return ok(getSkillReplayResult(store, pathParts[3]));
  }

  if (request.method === "POST" && url.pathname === "/v1/tools/run") {
    return ok(await executeTool(store, {
      toolName: body.toolName,
      input: body.input ?? {},
      trustMode: body.trustMode ?? "approve",
      approvalId: body.approvalId,
      traceId: body.traceId,
      timeoutMs: body.timeoutMs,
      requester: body.actor ?? "gateway-user",
    }));
  }

  if (request.method === "POST" && url.pathname === "/v1/context/index") {
    const index = buildWorkspaceIndex(store, {
      maxBytes: body.maxBytes,
    });
    return ok({
      indexedAt: index.indexedAt,
      documentCount: index.documentCount,
      skippedCount: index.skippedCount,
      maxBytes: index.maxBytes,
    });
  }

  if (request.method === "POST" && url.pathname === "/v1/context/search") {
    return ok(searchWorkspaceContext(store, body.query ?? "", {
      limit: body.limit,
      snippetLength: body.snippetLength,
    }));
  }

  if (request.method === "POST" && url.pathname === "/v1/runs") {
    return ok(await runAgent(store, {
      goal: body.goal,
      contextQuery: body.contextQuery ?? body.context,
      trustMode: body.trustMode ?? "approve",
      dryRun: Boolean(body.dryRun),
      contextLimit: body.contextLimit ?? body.limit,
      skillId: body.skillId,
      executeSkill: Boolean(body.executeSkill),
      llmProvider: body.llmProvider,
      llmModel: body.llmModel,
      llmBaseUrl: body.llmBaseUrl,
      llmTimeoutMs: body.llmTimeoutMs,
      llmTemperature: body.llmTemperature,
      llmMaxTokens: body.llmMaxTokens,
      promotePlan: Boolean(body.promotePlan),
      plannerAllowedTools: body.plannerAllowedTools,
      requestCandidateApprovals: Boolean(body.requestCandidateApprovals),
      executeCandidatePlan: Boolean(body.executeCandidatePlan),
      candidateApprovalIds: body.candidateApprovalIds,
      actor: body.actor ?? "gateway-user",
      channel: "gateway",
    }));
  }

  if (request.method === "POST" && url.pathname === "/v1/workflow-builder/draft") {
    return ok(await draftWorkflow(store, {
      goal: body.goal,
      contextQuery: body.contextQuery ?? body.context,
      contextLimit: body.contextLimit ?? body.limit,
      skillId: body.skillId,
      name: body.name,
      summary: body.summary,
      includeMemoryStep: body.includeMemoryStep,
      llmProvider: body.llmProvider ?? "mock",
      llmModel: body.llmModel,
      llmBaseUrl: body.llmBaseUrl,
      llmApiKey: body.llmApiKey,
      llmTimeoutMs: body.llmTimeoutMs,
      llmTemperature: body.llmTemperature,
      llmMaxTokens: body.llmMaxTokens,
    }));
  }

  if (request.method === "POST" && url.pathname === "/v1/workflow-builder/save") {
    return ok(await createWorkflowFromDraft(store, {
      draft: body.draft,
      goal: body.goal,
      contextQuery: body.contextQuery ?? body.context,
      contextLimit: body.contextLimit ?? body.limit,
      skillId: body.skillId,
      name: body.name,
      summary: body.summary,
      includeMemoryStep: body.includeMemoryStep,
      llmProvider: body.llmProvider ?? "mock",
      llmModel: body.llmModel,
      llmBaseUrl: body.llmBaseUrl,
      llmApiKey: body.llmApiKey,
      llmTimeoutMs: body.llmTimeoutMs,
      llmTemperature: body.llmTemperature,
      llmMaxTokens: body.llmMaxTokens,
    }));
  }

  if (request.method === "GET" && pathParts[1] === "runs" && pathParts[2] && !pathParts[3]) {
    return ok(getRunDetail(store, pathParts[2]));
  }

  if (request.method === "POST" && pathParts[1] === "runs" && pathParts[2] && pathParts[3] === "resume") {
    return ok(await resumeAgentRun(store, {
      traceId: pathParts[2],
      stepId: body.stepId,
      approvalId: body.approvalId,
      approvalIds: body.approvalIds,
      trustMode: body.trustMode ?? "approve",
      actor: body.actor ?? "gateway-user",
      timeoutMs: body.timeoutMs,
    }));
  }

  if (request.method === "POST" && url.pathname === "/v1/candidate/approvals") {
    return ok(requestCandidateApprovals(store, {
      candidatePlan: body.candidatePlan,
      traceId: body.traceId,
      trustMode: body.trustMode ?? "approve",
      actor: body.actor ?? "gateway-user",
    }));
  }

  if (request.method === "POST" && url.pathname === "/v1/candidate/execute-approved") {
    return ok(await executeApprovedCandidateStep(store, {
      candidatePlan: body.candidatePlan,
      stepId: body.stepId,
      approvalId: body.approvalId,
      traceId: body.traceId,
      trustMode: body.trustMode ?? "approve",
      actor: body.actor ?? "gateway-user",
      timeoutMs: body.timeoutMs,
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/workflows") {
    return ok(listWorkflows(store, {
      status: url.searchParams.get("status") ?? "active",
    }));
  }

  if (request.method === "POST" && url.pathname === "/v1/workflows") {
    return ok(createWorkflow(store, {
      name: body.name,
      summary: body.summary,
      steps: body.steps ?? [],
      metadata: {
        ...(body.metadata ?? {}),
        createdFrom: body.createdFrom ?? "gateway",
      },
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/workflows/inbox") {
    return ok(getWorkflowInbox(store, {
      limit: url.searchParams.get("limit") ?? undefined,
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/workflows/inbox-contract") {
    return ok(getWorkflowInboxContract());
  }

  if (request.method === "GET" && url.pathname === "/v1/workflows/detail-contract") {
    return ok(getWorkflowDetailContract());
  }

  if (request.method === "GET" && url.pathname === "/v1/workflows/continuation-contract") {
    return ok(getWorkflowContinuationContract());
  }

  if (request.method === "GET" && pathParts[1] === "workflows" && pathParts[2] === "runs" && pathParts[3]) {
    return ok(getWorkflowRunDetail(store, pathParts[3]));
  }

  if (request.method === "POST" && pathParts[1] === "workflows" && pathParts[2] === "runs" && pathParts[3] && pathParts[4] === "resume") {
    return ok(await resumeWorkflowRun(store, {
      traceId: pathParts[3],
      stepId: body.stepId,
      approvalId: body.approvalId,
      approvalIds: body.approvalIds,
      trustMode: body.trustMode ?? "approve",
      actor: body.actor ?? "gateway-user",
    }));
  }

  if (request.method === "PATCH" && pathParts[1] === "workflows" && pathParts[2] && !pathParts[3]) {
    return ok(updateWorkflow(store, pathParts[2], {
      name: body.name,
      summary: body.summary,
      steps: body.steps,
      status: body.status,
      metadata: body.metadata,
      updatedBy: body.actor ?? "gateway-user",
      reason: body.reason,
    }));
  }

  if (request.method === "POST" && pathParts[1] === "workflows" && pathParts[2] && pathParts[3] === "archive") {
    return ok(archiveWorkflow(store, pathParts[2], {
      archivedBy: body.actor ?? "gateway-user",
      reason: body.reason,
    }));
  }

  if (request.method === "GET" && pathParts[1] === "workflows" && pathParts[2] && pathParts[3] === "versions" && !pathParts[4]) {
    return ok(listWorkflowVersions(store, pathParts[2]));
  }

  if (request.method === "GET" && pathParts[1] === "workflows" && pathParts[2] && pathParts[3] === "versions" && pathParts[4] && !pathParts[5]) {
    return ok(getWorkflowVersion(store, pathParts[2], pathParts[4]));
  }

  if (request.method === "POST" && pathParts[1] === "workflows" && pathParts[2] && pathParts[3] === "versions" && pathParts[4] && pathParts[5] === "restore") {
    return ok(restoreWorkflowVersion(store, pathParts[2], pathParts[4], {
      restoredBy: body.actor ?? "gateway-user",
      reason: body.reason,
    }));
  }

  if (request.method === "GET" && pathParts[1] === "workflows" && pathParts[2]) {
    return ok(getWorkflow(store, pathParts[2]));
  }

  if (request.method === "POST" && pathParts[1] === "workflows" && pathParts[2] && pathParts[3] === "run") {
    return ok(await runWorkflow(store, pathParts[2], {
      goal: body.goal,
      trustMode: body.trustMode ?? "approve",
      dryRun: Boolean(body.dryRun),
      actor: body.actor ?? "gateway-user",
      channel: "gateway",
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/approvals") {
    return ok(listApprovalTickets(store, url.searchParams.get("status") ?? undefined));
  }

  if (request.method === "GET" && pathParts[1] === "approvals" && pathParts[2]) {
    return ok(getApprovalTicket(store, pathParts[2]));
  }

  if (request.method === "POST" && pathParts[1] === "approvals" && pathParts[2] && pathParts[3] === "approve") {
    return ok(approveTicket(store, pathParts[2], {
      resolvedBy: body.by ?? body.actor ?? "gateway-user",
      reason: body.reason ?? "approved from gateway",
    }));
  }

  if (request.method === "POST" && pathParts[1] === "approvals" && pathParts[2] && pathParts[3] === "reject") {
    return ok(rejectTicket(store, pathParts[2], {
      resolvedBy: body.by ?? body.actor ?? "gateway-user",
      reason: body.reason ?? "rejected from gateway",
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/evaluations") {
    return ok(listEvaluations(store));
  }

  if (request.method === "GET" && pathParts[1] === "evaluations" && pathParts[2]) {
    return ok(getEvaluation(store, pathParts[2]));
  }

  if (request.method === "POST" && url.pathname === "/v1/evaluations/trace") {
    return ok(evaluateTrace(store, body.traceId));
  }

  return notFound();
}

function gatewayStatus(store) {
  const index = readWorkspaceIndex(store);
  return {
    root: store.root,
    auth: getGatewayAuthStatus(store),
    memoryCount: listMemory(store).length,
    traceCount: listTraces(store).length,
    pendingApprovalCount: listApprovalTickets(store, "pending").length,
    indexedDocumentCount: index?.documentCount ?? 0,
    indexedAt: index?.indexedAt ?? null,
    candidateSkillCount: listSkills(store, "candidates").length,
    approvedSkillCount: listSkills(store, "approved").length,
    workflowCount: listWorkflows(store).length,
    evaluationCount: listEvaluations(store).length,
    skillEvaluationCount: listSkillEvaluations(store).length,
    skillReplayFixtureCount: listSkillReplayFixtures(store).length,
    skillReplayResultCount: listSkillReplayResults(store).length,
    skillPackageCount: listSkillPackages(store).length,
    skillPackageImportCount: listSkillPackageImports(store).length,
  };
}

function verifyRequest(store, request, options) {
  if (options.disableAuth) return true;
  const header = request.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  return verifyGatewayToken(store, token);
}

async function readBody(request) {
  if (request.method === "GET" || request.method === "HEAD") return {};
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1024 * 1024) {
      const error = new Error("request body too large");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("request body must be valid JSON");
    error.statusCode = 400;
    throw error;
  }
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(`${JSON.stringify(body, null, 2)}\n`);
}

function sendStaticPageAsset(response, pathname) {
  const filePath = resolveStaticPageAsset(pathname);
  if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return sendJson(response, 404, {
      error: "not_found",
      message: "Static asset not found.",
    });
  }
  response.writeHead(200, {
    "content-type": contentTypeFor(filePath),
    "cache-control": "no-store",
  });
  response.end(fs.readFileSync(filePath));
}

function ok(body) {
  return { statusCode: 200, body };
}

function notFound() {
  return {
    statusCode: 404,
    body: {
      error: "not_found",
      message: "Gateway route not found.",
    },
  };
}

function isStaticPagePath(pathname) {
  return isWorkbenchPath(pathname) || isShowcasePath(pathname);
}

function isWorkbenchPath(pathname) {
  return pathname === "/workbench" || pathname.startsWith("/workbench/");
}

function isShowcasePath(pathname) {
  return pathname === "/" || pathname === "/showcase" || pathname.startsWith("/showcase/");
}

function resolveStaticPageAsset(pathname) {
  if (isWorkbenchPath(pathname)) return resolveAsset(WORKBENCH_ROOT, pathname, "/workbench");
  if (isShowcasePath(pathname)) return resolveAsset(SHOWCASE_ROOT, pathname, "/showcase");
  return null;
}

function resolveAsset(root, pathname, mountPath) {
  const relativePath = pathname === "/" || pathname === mountPath
    ? "index.html"
    : pathname.replace(new RegExp(`^${mountPath}/?`), "");
  const resolved = path.resolve(root, relativePath);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return resolved;
}

function contentTypeFor(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

function isLocalHost(host) {
  return host === "127.0.0.1" || host === "::1" || host === "localhost";
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function readConfig(store) {
  return readJson(configPath(store));
}

function configPath(store) {
  return path.join(store.root, "config.json");
}
