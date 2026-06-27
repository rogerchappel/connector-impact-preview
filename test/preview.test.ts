import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { loadManifest, previewManifest, renderJson, renderMarkdown } from "../src/index.js";

const fixture = (name: string): string => new URL(`fixtures/${name}`, `file://${process.cwd()}/`).pathname;

describe("connector impact preview", () => {
  it("loads yaml manifests and classifies narrow updates as low impact", async () => {
    const manifest = await loadManifest(fixture("crm-update.yaml"));
    const preview = previewManifest(manifest);
    assert.equal(preview.connector, "crm");
    assert.equal(preview.impact, "low");
    assert.deepEqual(preview.changedFields.map((change) => change.field), ["apiKey", "stage"]);
  });

  it("classifies broad destructive actions as high impact", async () => {
    const manifest = await loadManifest(fixture("workspace-delete.yaml"));
    const preview = previewManifest(manifest);
    assert.equal(preview.impact, "high");
    assert.ok(preview.warnings.includes("destructive action"));
    assert.ok(preview.warnings.includes("broad target"));
    assert.ok(preview.warnings.includes("missing rollback notes"));
  });

  it("redacts secret-like keys in json output", async () => {
    const manifest = await loadManifest(fixture("github-comment.json"));
    const preview = previewManifest(manifest);
    const rendered = renderJson(preview);
    assert.match(rendered, /\[REDACTED\]/);
    assert.doesNotMatch(rendered, /ghp_secret/);
  });

  it("renders markdown approval evidence", async () => {
    const manifest = await loadManifest(fixture("slack-message.yaml"));
    const markdown = renderMarkdown(previewManifest(manifest));
    assert.match(markdown, /Connector Impact Preview/);
    assert.match(markdown, /Execution: `out-of-scope`/);
    assert.match(markdown, /\[REDACTED\]/);
  });
});
