import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

  it("warns when a loaded write action omits both payload and after", async () => {
    const manifest = await loadManifest(fixture("missing-write-data.yaml"));
    const preview = previewManifest(manifest);

    assert.equal(manifest.payload, undefined);
    assert.equal(manifest.after, undefined);
    assert.equal(preview.impact, "medium");
    assert.deepEqual(preview.changedFields, []);
    assert.ok(preview.warnings.includes("write action without payload or after snapshot"));
  });

  it("distinguishes explicitly empty payload and after from omitted fields", async () => {
    const manifest = await loadManifest(fixture("empty-write-data.yaml"));
    const preview = previewManifest(manifest);

    assert.deepEqual(manifest.payload, {});
    assert.deepEqual(manifest.after, {});
    assert.equal(preview.impact, "low");
    assert.deepEqual(preview.changedFields, []);
    assert.ok(!preview.warnings.includes("write action without payload or after snapshot"));
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

  for (const [field, value, shape] of [
    ["payload", "not-an-object", "object"],
    ["before", ["not", "an", "object"], "object"],
    ["after", null, "object"],
    ["evidence", "not-an-array", "array"],
    ["rollback", { step: "undo" }, "array"]
  ] as const) {
    it(`rejects malformed ${field}`, async () => {
      const directory = await mkdtemp(join(tmpdir(), "connector-impact-manifest-"));
      const path = join(directory, `${field}.json`);
      await writeFile(path, JSON.stringify({
        connector: "crm",
        action: "update",
        target: "c1",
        [field]: value
      }));

      await assert.rejects(loadManifest(path), new Error(`Manifest field "${field}" must be an ${shape}`));
    });
  }
});
