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
  for (const key of ["connector", "action", "target"] as const) {
    if (!manifest[key]) throw new Error(`Manifest missing required field: ${key}`);
  }
  return {
    connector: String(manifest.connector),
    action: String(manifest.action),
    target: manifest.target as ConnectorManifest["target"],
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
  return value.map(String);
}
