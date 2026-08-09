import { nowIso } from "./id.js";
import { runDueAutopilots } from "./autopilots.js";

export const AUTOPILOT_RUNNER_CONTRACT = Object.freeze({
  version: "0.1.0",
  interface: "spruceagent.autopilot-runner",
  safetyBoundary: [
    "The runner is opt-in and never starts from rule creation or Gateway startup unless explicitly requested.",
    "Each tick only calls Autopilot's existing idempotent due runner, whose sole v0 effect is creating open local Execution Tasks.",
    "The runner never launches agents, executes tools, runs workflows, grants approvals, or owns generated tasks.",
    "A failed tick is recorded in runner health and does not terminate the host or silently retry concurrently.",
  ],
});

export function createAutopilotRunner(store, input = {}) {
  const intervalMs = boundedInterval(input.intervalMs);
  const actor = String(input.actor ?? "autopilot-runner").trim() || "autopilot-runner";
  let timer = null;
  let running = false;
  let inFlight = false;
  let lastTickAt = null;
  let lastSuccessAt = null;
  let lastResult = null;
  let lastError = null;

  async function tick(options = {}) {
    if (inFlight) return { skipped: true, reason: "tick_in_flight", health: snapshot() };
    inFlight = true;
    lastTickAt = nowIso();
    try {
      lastResult = runDueAutopilots(store, { now: options.now, limit: options.limit, actor });
      lastSuccessAt = nowIso();
      lastError = null;
      return { skipped: false, result: lastResult, health: snapshot() };
    } catch (error) {
      lastError = String(error?.message ?? error ?? "unknown runner error").slice(0, 500);
      return { skipped: false, error: lastError, health: snapshot() };
    } finally {
      inFlight = false;
    }
  }

  function start() {
    if (timer) return snapshot();
    running = true;
    timer = setInterval(() => { void tick(); }, intervalMs);
    return snapshot();
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    running = false;
    return snapshot();
  }

  function snapshot() {
    return {
      version: AUTOPILOT_RUNNER_CONTRACT.version,
      interface: AUTOPILOT_RUNNER_CONTRACT.interface,
      running,
      inFlight,
      intervalMs,
      actor,
      lastTickAt,
      lastSuccessAt,
      lastResult: lastResult ? { considered: lastResult.considered, resultCount: lastResult.results.length, evaluatedAt: lastResult.evaluatedAt } : null,
      lastError,
      limits: AUTOPILOT_RUNNER_CONTRACT.safetyBoundary,
    };
  }

  return { start, stop, tick, snapshot };
}

function boundedInterval(value) {
  const intervalMs = value === undefined || value === null ? 60000 : Number(value);
  if (!Number.isSafeInteger(intervalMs) || intervalMs < 1000 || intervalMs > 3600000) {
    throw new Error("intervalMs must be an integer between 1000 and 3600000");
  }
  return intervalMs;
}
