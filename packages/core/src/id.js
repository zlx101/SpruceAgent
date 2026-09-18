import crypto from "node:crypto";

const SAFE_STORE_ID = /^[A-Za-z0-9_-]{1,160}$/;

export function createId(prefix) {
  const stamp = Date.now().toString(36);
  const random = crypto.randomBytes(6).toString("hex");
  return `${prefix}_${stamp}_${random}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function assertSafeStoreId(value, name = "id") {
  const id = String(value ?? "").trim();
  if (!id) throw new Error(`${name} is required`);
  if (!SAFE_STORE_ID.test(id)) {
    throw new Error(`${name} must be a single safe identifier`);
  }
  return id;
}
