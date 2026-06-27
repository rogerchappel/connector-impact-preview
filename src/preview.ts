import { redactValue } from "./redact.js";
import type { ConnectorManifest, FieldChange, ImpactLevel, ImpactPreview } from "./types.js";

const destructiveAction = /\b(delete|remove|archive|merge|close|deactivate|disable|overwrite|bulk)\b/i;
const writeAction = /\b(create|update|post|send|comment|assign|change|edit|write)\b/i;
const broadTarget = /\b(all|workspace|organization|org|channel|everyone|bulk|team|global)\b/i;

export function previewManifest(manifest: ConnectorManifest): ImpactPreview {
  const changedFields = diffFields(manifest.before ?? {}, manifest.after ?? {}, manifest.payload ?? {});
  const warnings = buildWarnings(manifest, changedFields);
  return {
    connector: manifest.connector,
    action: manifest.action,
    targetSummary: summarizeTarget(manifest.target),
    impact: classifyImpact(manifest, changedFields, warnings),
    changedFields,
    redactedPayload: redactValue(manifest.payload ?? {}) as Record<string, unknown>,
    evidence: manifest.evidence ?? [],
    rollback: manifest.rollback ?? [],
    warnings,
    execution: "out-of-scope"
  };
}

function diffFields(before: Record<string, unknown>, after: Record<string, unknown>, payload: Record<string, unknown>): FieldChange[] {
  const fields = [...new Set([...Object.keys(before), ...Object.keys(after), ...Object.keys(payload)])].sort();
  return fields
    .filter((field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]) || field in payload)
    .map((field) => ({ field, before: before[field], after: field in after ? after[field] : payload[field] }));
}

function buildWarnings(manifest: ConnectorManifest, changedFields: FieldChange[]): string[] {
  const warnings: string[] = [];
  if (!manifest.evidence?.length) warnings.push("missing evidence");
  if (!manifest.rollback?.length) warnings.push("missing rollback notes");
  if (destructiveAction.test(manifest.action)) warnings.push("destructive action");
  if (broadTarget.test(summarizeTarget(manifest.target))) warnings.push("broad target");
  if (changedFields.length > 5) warnings.push("many changed fields");
  if (writeAction.test(manifest.action) && !manifest.payload && !manifest.after) warnings.push("write action without payload or after snapshot");
  return warnings;
}

function classifyImpact(manifest: ConnectorManifest, changedFields: FieldChange[], warnings: string[]): ImpactLevel {
  if (warnings.includes("destructive action") || warnings.includes("broad target")) return "high";
  if (warnings.includes("missing rollback notes") || changedFields.length > 3) return "medium";
  if (warnings.includes("missing evidence")) return "medium";
  return "low";
}

function summarizeTarget(target: ConnectorManifest["target"]): string {
  if (Array.isArray(target)) return target.join(", ");
  if (target && typeof target === "object") return Object.entries(target).map(([key, value]) => `${key}=${String(value)}`).join(", ");
  return String(target);
}
