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

  it("distinguishes named channels from broad channel targets", () => {
    const base = {
      connector: "slack",
      action: "update_topic",
      payload: { topic: "maintenance" },
      evidence: ["ticket-123"],
      rollback: ["restore prior topic"]
    };

    const narrow = previewManifest({ ...base, target: "channel #ops" });
    assert.equal(narrow.impact, "low");
    assert.ok(!narrow.warnings.includes("broad target"));

    for (const target of ["global channel settings", "all channels"]) {
      const broad = previewManifest({ ...base, target });
      assert.equal(broad.impact, "high");
      assert.ok(broad.warnings.includes("broad target"));
    }
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

  for (const action of ["update_contact", "update-contact", "update contact", "updateContact"]) {
    it(`recognizes ${action} as a write action`, () => {
      const preview = previewManifest({
        connector: "crm",
        action,
        target: "contact-1",
        evidence: ["Confirmed request"],
        rollback: ["Restore the previous contact"]
      });

      assert.equal(preview.impact, "medium");
      assert.ok(preview.warnings.includes("write action without payload or after snapshot"));
    });
  }

  for (const action of ["delete_contact", "delete-contact", "delete contact", "deleteContact"]) {
    it(`recognizes ${action} as a destructive action`, () => {
      const preview = previewManifest({
        connector: "crm",
        action,
        target: "contact-1",
        evidence: ["Confirmed request"],
        rollback: ["Restore the deleted contact"]
      });

      assert.equal(preview.impact, "high");
      assert.ok(preview.warnings.includes("destructive action"));
    });
  }

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

  it("recursively redacts changed-field values before rendering", () => {
    const preview = previewManifest({
      connector: "crm",
      action: "update",
      target: "contact-1",
      before: {
        profile: {
          name: "Before Name",
          apiKey: "synthetic_before_key",
          channels: [{ label: "primary", authorization: "synthetic_before_authorization" }]
        }
      },
      after: {
        profile: {
          name: "After Name",
          apiKey: "synthetic_after_key",
          channels: [{ label: "primary", authorization: "synthetic_after_authorization" }]
        }
      },
      payload: {
        contacts: [{ email: "person@example.com", credential: "synthetic_payload_credential" }]
      }
    });

    assert.deepEqual(preview.changedFields, [
      {
        field: "contacts",
        before: undefined,
        after: [{ email: "person@example.com", credential: "[REDACTED]" }]
      },
      {
        field: "profile",
        before: {
          name: "Before Name",
          apiKey: "[REDACTED]",
          channels: [{ label: "primary", authorization: "[REDACTED]" }]
        },
        after: {
          name: "After Name",
          apiKey: "[REDACTED]",
          channels: [{ label: "primary", authorization: "[REDACTED]" }]
        }
      }
    ]);
    assert.doesNotMatch(JSON.stringify(preview.changedFields), /synthetic_(before|after|payload)/);
  });

  it("redacts nested secret-like keys from target summaries in every renderer", () => {
    const preview = previewManifest({
      connector: "crm",
      action: "update",
      target: {
        type: "contact",
        apiKey: "synthetic_target_key",
        routing: {
          authorization: "synthetic_nested_authorization",
          regions: ["apac", { credential: "synthetic_array_credential", scope: "team" }]
        }
      },
      payload: { stage: "qualified" },
      evidence: ["Synthetic fixture"],
      rollback: ["Restore the prior stage"]
    });

    assert.equal(
      preview.targetSummary,
      'type=contact, apiKey=[REDACTED], routing={"authorization":"[REDACTED]","regions":["apac",{"credential":"[REDACTED]","scope":"team"}]}'
    );
    assert.equal(preview.impact, "high");
    assert.ok(preview.warnings.includes("broad target"));

    for (const rendered of [renderMarkdown(preview), renderJson(preview)]) {
      assert.match(rendered, /\[REDACTED\]/);
      assert.doesNotMatch(rendered, /synthetic_target_key|synthetic_nested_authorization|synthetic_array_credential/);
    }
  });

  it("renders markdown approval evidence", async () => {
    const manifest = await loadManifest(fixture("slack-message.yaml"));
    const markdown = renderMarkdown(previewManifest(manifest));
    assert.match(markdown, /Connector Impact Preview/);
    assert.match(markdown, /Execution: `out-of-scope`/);
    assert.match(markdown, /\[REDACTED\]/);
  });

  it("keeps manifest-controlled markdown inside the preview hierarchy", () => {
    const injected = "line`\n## Injected\n- item *bold* [link](url)";
    const preview = previewManifest({
      connector: injected,
      action: injected,
      target: injected,
      before: { [injected]: injected },
      after: { [injected]: `${injected} changed` },
      payload: { note: "```\n## Payload heading" },
      evidence: [injected],
      rollback: [injected]
    });
    preview.warnings.push(injected);

    const markdown = renderMarkdown(preview);

    assert.equal(markdown.match(/^## /gm)?.length, 5);
    assert.equal(markdown.match(/^```/gm)?.length, 2);
    assert.doesNotMatch(markdown, /^## Injected$/m);
    assert.doesNotMatch(markdown, /^- item/m);
    assert.match(markdown, /line\\` \\#\\# Injected \\- item \\\*bold\\\*/);
  });

  it("uses a payload fence longer than manifest-controlled backtick runs", () => {
    const preview = previewManifest({
      connector: "crm",
      action: "update",
      target: "contact-1",
      payload: {
        body: "Example uses ``` fenced code",
        nested: { token: "synthetic_secret" }
      }
    });

    const markdown = renderMarkdown(preview);

    assert.match(markdown, /^````json$/m);
    assert.equal(markdown.match(/^````$/gm)?.length, 1);
    assert.doesNotMatch(markdown, /^```(?:[^`]|$)/gm);
    assert.match(markdown, /Example uses ``` fenced code/);
    assert.match(markdown, /\[REDACTED\]/);
    assert.doesNotMatch(markdown, /synthetic_secret/);
  });

  it("does not normalize JSON output", () => {
    const connector = "crm`\n## Kept in JSON";
    const json = renderJson(previewManifest({
      connector,
      action: "update",
      target: "contact-1"
    }));

    assert.equal(JSON.parse(json).connector, connector);
  });

  it("preserves payload fence delimiters in redacted JSON output", () => {
    const body = "Example uses ``` fenced code";
    const json = renderJson(previewManifest({
      connector: "crm",
      action: "update",
      target: "contact-1",
      payload: { body, password: "synthetic_secret" }
    }));

    const rendered = JSON.parse(json);
    assert.equal(rendered.redactedPayload.body, body);
    assert.equal(rendered.redactedPayload.password, "[REDACTED]");
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

  for (const [field, value, message] of [
    ["connector", {}, 'Manifest field "connector" must be a non-empty string'],
    ["connector", "", 'Manifest field "connector" must be a non-empty string'],
    ["connector", "   ", 'Manifest field "connector" must be a non-empty string'],
    ["action", [], 'Manifest field "action" must be a non-empty string'],
    ["action", null, 'Manifest field "action" must be a non-empty string'],
    ["action", "\t", 'Manifest field "action" must be a non-empty string'],
    ["target", 42, 'Manifest field "target" must be a non-empty string, an array of non-empty strings, or an object'],
    ["target", false, 'Manifest field "target" must be a non-empty string, an array of non-empty strings, or an object'],
    ["target", "", 'Manifest field "target" must be a non-empty string'],
    ["target", " \n ", 'Manifest field "target" must be a non-empty string'],
    ["target", [], 'Manifest field "target" must contain at least one target'],
    ["target", {}, 'Manifest field "target" must contain at least one target property'],
    ["target", ["c1", 2], 'Manifest field "target[1]" must be a non-empty string'],
    ["target", [""], 'Manifest field "target[0]" must be a non-empty string'],
    ["evidence", [null], 'Manifest field "evidence[0]" must be a non-empty string'],
    ["evidence", [true], 'Manifest field "evidence[0]" must be a non-empty string'],
    ["evidence", ["  "], 'Manifest field "evidence[0]" must be a non-empty string'],
    ["rollback", [{}], 'Manifest field "rollback[0]" must be a non-empty string'],
    ["rollback", [""], 'Manifest field "rollback[0]" must be a non-empty string'],
    ["rollback", ["\t"], 'Manifest field "rollback[0]" must be a non-empty string']
  ] as const) {
    it(`rejects invalid ${field} value ${JSON.stringify(value)}`, async () => {
      const directory = await mkdtemp(join(tmpdir(), "connector-impact-manifest-"));
      const path = join(directory, `${field}.json`);
      await writeFile(path, JSON.stringify({
        connector: "crm",
        action: "update",
        target: "c1",
        [field]: value
      }));

      await assert.rejects(loadManifest(path), new Error(message));
    });
  }
});
