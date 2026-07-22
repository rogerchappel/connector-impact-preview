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
    payload: optionalObject(manifest.payload),
    before: optionalObject(manifest.before),
    after: optionalObject(manifest.after),
    evidence: arrayOrEmpty(manifest.evidence),
    rollback: arrayOrEmpty(manifest.rollback)
  };
}

function optionalObject(value: unknown): Record<string, unknown> | undefined {
  return value === undefined ? undefined : objectOrEmpty(value);
}

function objectOrEmpty(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function arrayOrEmpty(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}
