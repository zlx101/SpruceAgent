#!/usr/bin/env node
import { spawn } from "node:child_process";
import {
  RELEASE_VERIFICATION_CONTRACT,
  createStore,
  ensureStore,
  persistReleaseVerificationReport,
} from "../packages/core/src/index.js";

const steps = Object.freeze([
  {
    id: "doctor",
    label: "Doctor",
    operatorCommand: "npm run doctor",
    commands: [
      ["apps/cli/bin/spruce.js", "doctor"],
    ],
    expected: "SpruceAgent doctor reports no failed alpha-readiness checks.",
  },
  {
    id: "deployment_preflight",
    label: "Deployment Preflight",
    operatorCommand: "npm run deploy:preflight",
    commands: [
      ["apps/cli/bin/spruce.js", "deploy", "preflight"],
    ],
    expected: "Deployment preflight has no failed long-running runtime checks.",
  },
  {
    id: "syntax_check",
    label: "Syntax Check",
    operatorCommand: "npm run check",
    commands: [
      ["--check", "apps/cli/bin/spruce.js"],
      ["--check", "apps/desktop/app.js"],
      ["--check", "apps/showcase/app.js"],
      ["--check", "packages/core/src/release-verifications.js"],
      ["--check", "packages/core/src/release-artifacts.js"],
      ["--check", "scripts/alpha-smoke.js"],
      ["--check", "scripts/release-verify.js"],
    ],
    expected: "CLI, Workbench, showcase, release verification, and release artifact scripts parse cleanly.",
  },
  {
    id: "test",
    label: "Test",
    operatorCommand: "npm test",
    commands: [
      ["--test"],
    ],
    expected: "The full Node test suite passes.",
  },
  {
    id: "alpha_smoke",
    label: "Alpha Smoke",
    operatorCommand: "npm run alpha:smoke",
    commands: [
      ["scripts/alpha-smoke.js"],
    ],
    expected: "The local alpha smoke path returns ok=true.",
  },
]);

const startedAt = new Date().toISOString();
const results = [];

for (const step of steps) {
  const result = await runStep(step);
  results.push(result);
  if (result.status !== "passed") break;
}

const failed = results.find((result) => result.status !== "passed");
const report = {
  ...RELEASE_VERIFICATION_CONTRACT,
  startedAt,
  finishedAt: new Date().toISOString(),
  status: failed ? "failed" : "passed",
  summary: {
    stepCount: steps.length,
    completedCount: results.length,
    passedCount: results.filter((result) => result.status === "passed").length,
    failedCount: results.filter((result) => result.status === "failed").length,
    skippedCount: steps.length - results.length,
  },
  results,
  nextActions: failed
    ? [`Fix ${failed.id}: ${failed.expected}`]
    : ["Release verification passed. Continue with repository hygiene and release notes review."],
};

const finalReport = persistReport(report);

console.log("");
console.log("[release:verify] summary");
console.log(JSON.stringify(finalReport, null, 2));

if (finalReport.status !== "passed") process.exitCode = 1;

async function runStep(step) {
  const started = Date.now();
  const commandResults = [];
  console.log("");
  console.log(`[release:verify] ${step.label}`);
  console.log(`[release:verify] operator command: ${step.operatorCommand}`);

  for (const args of step.commands) {
    const command = commandLabel(args);
    console.log(`[release:verify] ${command}`);
    const result = await runCommand(args);
    commandResults.push(result);
    if (result.status !== "passed") {
      return {
        id: step.id,
        label: step.label,
        command,
        operatorCommand: step.operatorCommand,
        status: "failed",
        exitCode: result.exitCode,
        durationMs: Date.now() - started,
        expected: step.expected,
        observed: result.observed,
        commandResults,
      };
    }
  }

  return {
    id: step.id,
    label: step.label,
    command: step.commands.map(commandLabel).join(" && "),
    operatorCommand: step.operatorCommand,
    status: "passed",
    exitCode: 0,
    durationMs: Date.now() - started,
    expected: step.expected,
    observed: commandResults.at(-1)?.observed ?? {},
    commandResults,
  };
}

function runCommand(args) {
  return new Promise((resolve) => {
    const started = Date.now();
    let stdout = "";
    let stderr = "";
    let child;
    try {
      child = spawn(process.execPath, args, {
        cwd: process.cwd(),
        env: process.env,
        shell: false,
        windowsHide: true,
      });
    } catch (error) {
      resolve({
        command: commandLabel(args),
        status: "failed",
        exitCode: null,
        durationMs: Date.now() - started,
        observed: {
          error: error.message,
        },
      });
      return;
    }

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(chunk);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(chunk);
    });

    child.on("error", (error) => {
      resolve({
        command: commandLabel(args),
        status: "failed",
        exitCode: null,
        durationMs: Date.now() - started,
        observed: {
          error: error.message,
        },
      });
    });

    child.on("close", (code) => {
      resolve({
        command: commandLabel(args),
        status: code === 0 ? "passed" : "failed",
        exitCode: code,
        durationMs: Date.now() - started,
        observed: summarizeOutput(stdout, stderr),
      });
    });
  });
}

function commandLabel(args) {
  return `node ${args.join(" ")}`;
}

function summarizeOutput(stdout, stderr) {
  const parsed = parseJsonFromOutput(stdout);
  return {
    status: parsed?.status ?? (parsed?.ok === true ? "passed" : parsed?.ok === false ? "failed" : null),
    ok: typeof parsed?.ok === "boolean" ? parsed.ok : null,
    warningCount: Number.isFinite(parsed?.summary?.warningCount) ? parsed.summary.warningCount : null,
    failedCount: Number.isFinite(parsed?.summary?.failedCount) ? parsed.summary.failedCount : null,
    stderrLineCount: stderr.trim() ? stderr.trim().split(/\r?\n/).length : 0,
  };
}

function parseJsonFromOutput(output) {
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(output.slice(start, end + 1));
  } catch {
    return null;
  }
}

function persistReport(report) {
  try {
    const store = ensureStore(createStore(process.cwd()));
    return persistReleaseVerificationReport(store, report);
  } catch (error) {
    return {
      ...report,
      status: "failed",
      persistence: {
        status: "failed",
        error: String(error?.message || error),
      },
      nextActions: [
        `Fix release verification persistence: ${String(error?.message || error)}`,
        ...(report.nextActions || []),
      ],
    };
  }
}
