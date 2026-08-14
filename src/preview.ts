import { isSecretKey, redactValue } from "./redact.js";
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
    .map((field) => ({
      field,
      before: redactFieldValue(field, before[field]),
      after: redactFieldValue(field, field in after ? after[field] : payload[field])
    }));
}

function redactFieldValue(field: string, value: unknown): unknown {
  return isSecretKey(field) ? "[REDACTED]" : redactValue(value);
}

function buildWarnings(manifest: ConnectorManifest, changedFields: FieldChange[]): string[] {
  const warnings: string[] = [];
  if (!manifest.evidence?.length) warnings.push("missing evidence");
  if (!manifest.rollback?.length) warnings.push("missing rollback notes");
  if (destructiveAction.test(normalizeAction(manifest.action))) warnings.push("destructive action");
  if (broadTarget.test(summarizeTarget(manifest.target))) warnings.push("broad target");
  if (changedFields.length > 5) warnings.push("many changed fields");
  if (writeAction.test(normalizeAction(manifest.action)) && !manifest.payload && !manifest.after) warnings.push("write action without payload or after snapshot");
  return warnings;
}

function classifyImpact(manifest: ConnectorManifest, changedFields: FieldChange[], warnings: string[]): ImpactLevel {
  if (warnings.includes("destructive action") || warnings.includes("broad target")) return "high";
  if (warnings.includes("missing rollback notes") || warnings.includes("write action without payload or after snapshot") || changedFields.length > 3) return "medium";
  if (warnings.includes("missing evidence")) return "medium";
  return "low";
}

function normalizeAction(action: string): string {
  return action
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ");
}

function summarizeTarget(target: ConnectorManifest["target"]): string {
  const redacted = redactValue(target) as ConnectorManifest["target"];
  if (Array.isArray(redacted)) return redacted.map(formatTargetValue).join(", ");
  if (redacted && typeof redacted === "object") {
    return Object.entries(redacted).map(([key, value]) => `${key}=${formatTargetValue(value)}`).join(", ");
  }
  return String(redacted);
}

function formatTargetValue(value: unknown): string {
  return value && typeof value === "object" ? JSON.stringify(value) : String(value);
}
