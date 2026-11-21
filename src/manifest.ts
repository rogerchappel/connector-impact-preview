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

export interface ManifestSchemaProfile {
  /** Connector identifiers to which this profile applies, compared exactly. */
  connectors: readonly string[];
  /** Required top-level manifest fields for matching connectors. */
  requiredFields: readonly string[];
}

/** Opt-in connector-family validation; generic loading remains unchanged. */
export async function loadManifestWithProfile(
  path: string,
  profile: ManifestSchemaProfile
): Promise<ConnectorManifest> {
  validateProfile(profile);
  const manifest = await loadManifest(path);
  if (profile.connectors.includes(manifest.connector)) {
    for (const field of profile.requiredFields) {
      if (!Object.hasOwn(manifest, field) || manifest[field as keyof ConnectorManifest] === undefined) {
        throw new Error(`Manifest for connector "${manifest.connector}" requires field "${field}"`);
      }
    }
  }
  return manifest;
}

const manifestFields = new Set([
  "connector", "action", "target", "payload", "before", "after", "evidence", "rollback"
]);

function validateProfile(profile: ManifestSchemaProfile): void {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    throw new Error("Schema profile must be an object");
  }
  for (const [name, values] of [["connectors", profile.connectors], ["requiredFields", profile.requiredFields]] as const) {
    if (!Array.isArray(values) || values.length === 0 || values.some(value => typeof value !== "string" || value.trim() === "")) {
      throw new Error(`Schema profile "${name}" must be a non-empty array of non-empty strings`);
    }
    if (new Set(values).size !== values.length) {
      throw new Error(`Schema profile "${name}" must not contain duplicates`);
    }
  }
  for (const field of profile.requiredFields) {
    if (!manifestFields.has(field)) throw new Error(`Schema profile field "${field}" is not a supported manifest field`);
  }
}

function validateManifest(value: unknown): ConnectorManifest {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Manifest must be an object");
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
  if (value && typeof value === "object") {
    if (Object.keys(value).length === 0) {
      throw new Error('Manifest field "target" must contain at least one target property');
    }
    return value as Record<string, unknown>;
  }
  throw new Error('Manifest field "target" must be a non-empty string, an array of non-empty strings, or an object');
}
