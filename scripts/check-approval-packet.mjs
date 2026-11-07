import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const packet = JSON.parse(await readFile(new URL("../examples/approval-packet.json", import.meta.url), "utf8"));
const preview = JSON.parse(await readFile(new URL("../fixtures/crm-preview.json", import.meta.url), "utf8"));

assert.equal(packet.decision, "pending");
assert.deepEqual(packet.preview, {
  connector: preview.connector,
  action: preview.action,
  target: preview.targetSummary,
  impact: preview.impact,
  changed_fields: preview.changedFields,
  redacted_payload: preview.redactedPayload,
  evidence: preview.evidence,
  rollback: preview.rollback,
  warnings: preview.warnings,
  execution: preview.execution
});
console.log("Approval packet fields match the CRM preview JSON contract.");
