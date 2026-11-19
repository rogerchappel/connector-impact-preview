import { redactValue } from "./redact.js";
import type { ImpactPreview } from "./types.js";

export function renderJson(preview: ImpactPreview): string {
  return `${JSON.stringify(redactValue(preview), null, 2)}\n`;
}

export function renderMarkdown(preview: ImpactPreview): string {
  const payload = JSON.stringify(preview.redactedPayload, null, 2);
  const payloadFence = markdownFence(payload);

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
    `${payloadFence}json`,
    payload,
    payloadFence,
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

function markdownFence(value: string): string {
  const longestRun = Math.max(0, ...Array.from(value.matchAll(/`+/g), (match) => match[0].length));
  return "`".repeat(Math.max(3, longestRun + 1));
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


export function renderSarif(preview: ImpactPreview): string {
  const level = preview.impact === "high" ? "error" : preview.impact === "medium" ? "warning" : "note";
  const results = preview.changedFields.map((change) => ({
    ruleId: "connector-impact.changed-field",
    level,
    message: { text: `Field ${change.field} changes from ${JSON.stringify(change.before)} to ${JSON.stringify(change.after)}.` },
    locations: [{
      physicalLocation: {
        artifactLocation: { uri: "connector-impact-preview" },
        region: { startLine: 1, startColumn: 1 }
      }
    }]
  }));
  return `${JSON.stringify({
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [{
      tool: { driver: { name: "connector-impact-preview", rules: [{ id: "connector-impact.changed-field", shortDescription: { text: "Connector impact field change" } }] } },
      results
    }]
  }, null, 2)}\n`;
}
