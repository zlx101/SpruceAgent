import crypto from "node:crypto";

export function createId(prefix) {
  const stamp = Date.now().toString(36);
  const random = crypto.randomBytes(6).toString("hex");
  return `${prefix}_${stamp}_${random}`;
}

export function nowIso() {
  return new Date().toISOString();
}
