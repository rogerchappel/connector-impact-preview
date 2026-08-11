import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { parse as parseYaml } from "yaml";

import type { ConnectorManifest } from "./types.js";

export async function loadManifest(path: string): Promise<ConnectorManifest> {
  const text = await readFile(path, "utf8");
  const extension = extname(path).toLowerCase();
  const parsed = extension === ".json" ? JSON.parse(text) : parseYaml(text);
  return validateManifest(parsed);
}

function validateManifest(value: unknown): ConnectorManifest {
  if (!value || typeof value !== "object") throw new Error("Manifest must be an object");
  const manifest = value as Partial<ConnectorManifest>;
  return {
    connector: requiredString(manifest.connector, "connector"),
    action: requiredString(manifest.action, "action"),
    target: requiredTarget(manifest.target),
    payload: optionalObject(manifest.payload, "payload"),
    before: optionalObject(manifest.before, "before"),
    after: optionalObject(manifest.after, "after"),
    evidence: optionalArray(manifest.evidence, "evidence"),
    rollback: optionalArray(manifest.rollback, "rollback")
  };
}

function optionalObject(value: unknown, field: string): Record<string, unknown> | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Manifest field "${field}" must be an object`);
  }
  return value as Record<string, unknown>;
}

function optionalArray(value: unknown, field: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new Error(`Manifest field "${field}" must be an array`);
  }
  return value.map((item, index) => requiredString(item, `${field}[${index}]`));
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Manifest field "${field}" must be a non-empty string`);
  }
  return value;
}

function requiredTarget(value: unknown): ConnectorManifest["target"] {
  if (typeof value === "string") return requiredString(value, "target");
  if (Array.isArray(value)) {
    if (value.length === 0) {
      throw new Error('Manifest field "target" must contain at least one target');
    }
    return value.map((item, index) => requiredString(item, `target[${index}]`));
  }
  if (value && typeof value === "object") return value as Record<string, unknown>;
  throw new Error('Manifest field "target" must be a non-empty string, an array of non-empty strings, or an object');
}
