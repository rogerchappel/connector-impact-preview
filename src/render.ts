import { redactValue } from "./redact.js";
import type { ImpactPreview } from "./types.js";

export function renderJson(preview: ImpactPreview): string {
  return `${JSON.stringify(redactValue(preview), null, 2)}\n`;
}

export function renderMarkdown(preview: ImpactPreview): string {
  return [
    "# Connector Impact Preview",
    "",
    `Connector: \`${preview.connector}\``,
    `Action: \`${preview.action}\``,
    `Target: \`${preview.targetSummary}\``,
    `Impact: **${preview.impact}**`,
    "Execution: `out-of-scope`",
    "",
    "## Changed Fields",
    preview.changedFields.length ? preview.changedFields.map((change) => `- \`${change.field}\`: ${safe(change.before)} -> ${safe(change.after)}`).join("\n") : "- None detected",
    "",
    "## Payload",
    "```json",
    JSON.stringify(preview.redactedPayload, null, 2),
    "```",
    "",
    "## Evidence",
    preview.evidence.length ? preview.evidence.map((item) => `- ${item}`).join("\n") : "- Missing",
    "",
    "## Rollback",
    preview.rollback.length ? preview.rollback.map((item) => `- ${item}`).join("\n") : "- Missing",
    "",
    "## Warnings",
    preview.warnings.length ? preview.warnings.map((item) => `- ${item}`).join("\n") : "- None"
  ].join("\n");
}

function safe(value: unknown): string {
  return JSON.stringify(redactValue(value));
}
