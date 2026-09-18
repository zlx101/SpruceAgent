#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const roots = [
  path.join(root, "apps"),
  path.join(root, "packages", "core", "src"),
  path.join(root, "scripts"),
  path.join(root, "tests"),
];

const files = roots.flatMap((dir) => collectJs(dir)).sort();
if (!files.length) {
  console.error("[check] no JavaScript files found");
  process.exit(1);
}

let failed = 0;
for (const file of files) {
  const relative = path.relative(root, file);
  const result = await runNodeCheck(file);
  if (result.status !== 0) {
    failed += 1;
    console.error(`[check] failed ${relative}`);
    if (result.stderr) process.stderr.write(result.stderr);
  }
}

if (failed) {
  console.error(`[check] ${failed} of ${files.length} files failed node --check.`);
  process.exit(1);
}

console.log(`[check] ${files.length} JavaScript files parsed cleanly.`);

function collectJs(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectJs(fullPath);
    return entry.isFile() && entry.name.endsWith(".js") ? [fullPath] : [];
  });
}

function runNodeCheck(file) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["--check", file], { cwd: root });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (status) => resolve({ status: status ?? 1, stderr }));
  });
}
