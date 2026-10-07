import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { commandMatchesGitMutation, commandUsesShellControlSyntax } from "../packages/core/src/forbidden-commands.js";
import {
  createStore,
  ensureStore,
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
