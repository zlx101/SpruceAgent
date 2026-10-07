import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  boundedUserCommandLimits,
  commandMatchesGitMutation,
  commandUsesShellControlSyntax,
  parseUserCommand,
  USER_COMMAND_LIMITS,
} from "../packages/core/src/forbidden-commands.js";
import {
  createStore,
  ensureStore,
  executeTool,
  launchAgentWorkspace,
  prepareAgentWorkspace,
} from "../packages/core/src/index.js";

const reviewedCommand = "node -e \"require('fs').writeFileSync('review-output.txt','reviewed')\"";

test("plain commands and quoted node -e are not shell control syntax", () => {
  assert.equal(commandUsesShellControlSyntax("node -v"), false);
  assert.equal(commandUsesShellControlSyntax("echo spruce"), false);
  assert.equal(commandUsesShellControlSyntax(reviewedCommand), false);
  assert.equal(commandUsesShellControlSyntax("echo hello!"), false);
  assert.equal(commandUsesShellControlSyntax("echo (ok)"), false);
  assert.equal(
    commandUsesShellControlSyntax("node -e \"const fs=require('fs');process.exit(fs.readFileSync('attested-output.txt','utf8')==='ok'?0:1)\""),
    false,
  );
});

test("shell metacharacters that can diverge from the git-mutation regex are shell control syntax", () => {
  assert.equal(commandUsesShellControlSyntax("g^it push"), true);
  assert.equal(commandUsesShellControlSyntax("echo ok & git push"), true);
  assert.equal(commandUsesShellControlSyntax("echo ok | git push"), true);
  assert.equal(commandUsesShellControlSyntax("git push\n"), true);
  assert.equal(commandUsesShellControlSyntax("%COMSPEC%"), true);
  assert.equal(commandUsesShellControlSyntax("echo ok; git push"), true);
  assert.equal(commandUsesShellControlSyntax("type < secret.txt"), true);
  assert.equal(commandUsesShellControlSyntax("echo ok > out.txt"), true);
  assert.equal(commandUsesShellControlSyntax("echo \u0060whoami\u0060"), true);
  assert.equal(commandUsesShellControlSyntax("echo $HOME"), true);
  assert.equal(commandUsesShellControlSyntax("git push\r"), true);
});

test("git mutation detection sees through executable suffixes, paths, and global options", () => {
  assert.equal(commandMatchesGitMutation("git.exe push"), true);
  assert.equal(commandMatchesGitMutation("GIT.EXE commit -m x"), true);
  assert.equal(commandMatchesGitMutation("\"C:\\Program Files\\Git\\bin\\git.exe\" push origin main"), true);
  assert.equal(commandMatchesGitMutation("/usr/bin/git reset --hard"), true);
  assert.equal(commandMatchesGitMutation("git -C . push"), true);
  assert.equal(commandMatchesGitMutation("git -c user.name=x commit -m y"), true);
  assert.equal(commandMatchesGitMutation("git --git-dir=.git --no-pager checkout main"), true);
  assert.equal(commandMatchesGitMutation("cmd /c git.exe push"), true);
  assert.equal(commandMatchesGitMutation("gh.exe pr merge 1"), true);
});

test("read-only git commands and node scripts are not git mutations", () => {
  assert.equal(commandMatchesGitMutation("git status"), false);
  assert.equal(commandMatchesGitMutation("git.exe log --oneline"), false);
  assert.equal(commandMatchesGitMutation("git -C . diff --stat"), false);
  assert.equal(commandMatchesGitMutation("git -c core.pager=cat show HEAD"), false);
  assert.equal(commandMatchesGitMutation(reviewedCommand), false);
  assert.equal(commandMatchesGitMutation("node -v"), false);
});

test("agent launcher rejects git.exe and git -C push before approval", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const workspace = prepareAgentWorkspace(store, {
    adapterId: "local-shell-agent",
    goal: "Reject disguised git mutation",
  });

  for (const command of ["git.exe push", "git -C . push"]) {
    await assert.rejects(
      () => launchAgentWorkspace(store, { workspaceId: workspace.id, execute: true, command }),
      /blocks git mutation/,
    );
  }
});

test("user commands are split into argv without a shell", () => {
  assert.deepEqual(parseUserCommand("node -v"), { executable: "node", args: ["-v"] });
  assert.deepEqual(parseUserCommand(reviewedCommand), {
    executable: "node",
    args: ["-e", "require('fs').writeFileSync('review-output.txt','reviewed')"],
  });
  assert.deepEqual(parseUserCommand("node script.js \"a b\" 'c d'"), {
    executable: "node",
    args: ["script.js", "a b", "c d"],
  });
  assert.deepEqual(parseUserCommand("\"C:\\Program Files\\nodejs\\node.exe\" -v"), {
    executable: "C:\\Program Files\\nodejs\\node.exe",
    args: ["-v"],
  });
});

test("user commands reject shell interpreters, unterminated quotes, and empty input", () => {
  for (const command of ["cmd /c node -v", "cmd.exe /c dir", "powershell -c Get-Date", "pwsh.exe -NoProfile", "bash -c ls", "/bin/sh -c ls", "wsl ls"]) {
    assert.throws(() => parseUserCommand(command, "test"), /test blocks shell interpreters/, command);
  }
  assert.throws(() => parseUserCommand("node -e \"process.exit(0)", "test"), /unterminated quote/);
  assert.throws(() => parseUserCommand("   ", "test"), /test requires a command/);
  assert.throws(() => parseUserCommand("node -v & dir", "test"), /test blocks shell control syntax/);
});

test("shell.execute passes quoted arguments to the program literally", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const result = await executeTool(store, {
    toolName: "shell.execute",
    input: { command: "node -e \"process.stdout.write(JSON.stringify(process.argv.slice(1)))\" \"a b\" 'c d' plain" },
    approved: true,
  });

  assert.equal(result.status, "succeeded");
  assert.deepEqual(JSON.parse(result.output.stdout), ["a b", "c d", "plain"]);
});

test("shell.execute refuses shell interpreters even with allowCritical", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const result = await executeTool(store, {
    toolName: "shell.execute",
    input: { command: "cmd /c node -v" },
    approved: true,
    allowCritical: true,
  });

  assert.equal(result.status, "failed");
  assert.match(result.error.message, /shell\.execute blocks shell interpreters/);
});

test("user command limits default, accept in-range values, and reject unbounded values", () => {
  assert.deepEqual(boundedUserCommandLimits({}, "test"), {
    timeout: USER_COMMAND_LIMITS.timeoutMs.default,
    maxBuffer: USER_COMMAND_LIMITS.maxBuffer.default,
  });
  assert.deepEqual(boundedUserCommandLimits({ timeoutMs: "5000", maxBuffer: 65536 }, "test"), {
    timeout: 5000,
    maxBuffer: 65536,
  });
  for (const input of [
    { timeoutMs: 0 },
    { timeoutMs: "abc" },
    { timeoutMs: 1.5 },
    { timeoutMs: USER_COMMAND_LIMITS.timeoutMs.max + 1 },
    { maxBuffer: USER_COMMAND_LIMITS.maxBuffer.min - 1 },
    { maxBuffer: Number.MAX_SAFE_INTEGER },
  ]) {
    assert.throws(() => boundedUserCommandLimits(input, "test"), /test (timeoutMs|maxBuffer) must be an integer between/, JSON.stringify(input));
  }
});

test("shell.execute and agent launcher refuse unbounded limits before running", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const result = await executeTool(store, {
    toolName: "shell.execute",
    input: { command: "node -e \"require('fs').writeFileSync('ran.txt','x')\"" },
    approved: true,
    timeoutMs: 24 * 60 * 60 * 1000,
  });
  assert.equal(result.status, "failed");
  assert.match(result.error.message, /shell\.execute timeoutMs must be an integer between/);
  assert.equal(fs.existsSync(path.join(dir, "ran.txt")), false);

  const workspace = prepareAgentWorkspace(store, {
    adapterId: "local-shell-agent",
    goal: "Reject unbounded launcher limits",
  });
  await assert.rejects(
    () => launchAgentWorkspace(store, {
      workspaceId: workspace.id,
      execute: true,
      command: "node -v",
      maxBuffer: 1024 * 1024 * 1024,
    }),
    /agent launcher maxBuffer must be an integer between/,
  );
});

test("agent launcher rejects caret-escaped git push before execution", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const workspace = prepareAgentWorkspace(store, {
    adapterId: "local-shell-agent",
    goal: "Reject shell control syntax",
  });

  await assert.rejects(
    () => launchAgentWorkspace(store, {
      workspaceId: workspace.id,
      execute: true,
      command: "g^it push",
    }),
    /agent launcher blocks shell control syntax before execution/,
  );
});
