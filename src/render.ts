import { redactValue } from "./redact.js";
import type { ImpactPreview } from "./types.js";

export function renderJson(preview: ImpactPreview): string {
  return `${JSON.stringify(redactValue(preview), null, 2)}\n`;
}

export function renderMarkdown(preview: ImpactPreview): string {
  return [
    "# Connector Impact Preview",
    "",
    `Connector: ${markdownText(preview.connector)}`,
    `Action: ${markdownText(preview.action)}`,
    `Target: ${markdownText(preview.targetSummary)}`,
    `Impact: **${preview.impact}**`,
    "Execution: `out-of-scope`",
    "",
    "## Changed Fields",
    preview.changedFields.length ? preview.changedFields.map((change) => `- ${markdownText(change.field)}: ${markdownValue(change.before)} -> ${markdownValue(change.after)}`).join("\n") : "- None detected",
    "",
    "## Payload",
    "```json",
    JSON.stringify(preview.redactedPayload, null, 2),
    "```",
    "",
    "## Evidence",
    preview.evidence.length ? preview.evidence.map((item) => `- ${markdownText(item)}`).join("\n") : "- Missing",
    "",
    "## Rollback",
    preview.rollback.length ? preview.rollback.map((item) => `- ${markdownText(item)}`).join("\n") : "- Missing",
    "",
    "## Warnings",
    preview.warnings.length ? preview.warnings.map((item) => `- ${markdownText(item)}`).join("\n") : "- None"
  ].join("\n");
}

function markdownValue(value: unknown): string {
  return markdownText(JSON.stringify(redactValue(value)) ?? "undefined");
}

function markdownText(value: string): string {
  return value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/([`*_{}\[\]()<>#+\-.!|])/g, "\\$1")
    .replace(/\\\[REDACTED\\\]/g, "[REDACTED]");
}
