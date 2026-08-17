import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { describe, it } from "node:test";
import { promisify } from "node:util";

const run = promisify(execFile);

describe("cli", () => {
  it("prints usage for --help", async () => {
    const { stdout, stderr } = await run("node", ["dist/src/cli.js", "--help"]);

    assert.match(stdout, /Usage: connector-impact preview/);
    assert.equal(stderr, "");
  });

  for (const help of [["--help"], ["-h"], ["help"]]) {
    it(`accepts standalone help form ${help[0]}`, async () => {
      const { stdout, stderr } = await run("node", ["dist/src/cli.js", ...help]);

      assert.match(stdout, /Usage: connector-impact preview/);
      assert.equal(stderr, "");
    });
  }

  for (const argv of [
    ["--help", "--bogus"],
    ["help", "nonsense"],
    ["preview", "fixtures/crm-update.yaml", "--help"],
    ["preview", "fixtures/crm-update.yaml", "-h"]
  ]) {
    it(`rejects combined help form: ${argv.join(" ")}`, async () => {
      await assert.rejects(
        run("node", ["dist/src/cli.js", ...argv]),
        (error: { code: number; stdout: string; stderr: string }) => {
          assert.equal(error.code, 1);
          assert.equal(error.stdout, "");
          assert.match(error.stderr, /Help must be used on its own/);
          return true;
        }
      );
    });
  }

  it("renders redacted json from a fixture manifest", async () => {
    const { stdout } = await run("node", ["dist/src/cli.js", "preview", "fixtures/github-comment.json", "--format", "json"]);
    assert.match(stdout, /\[REDACTED\]/);
    assert.doesNotMatch(stdout, /ghp_secret/);
    assert.equal(JSON.parse(stdout).execution, "out-of-scope");
  });

  it("normalizes markdown structure characters from a manifest", async () => {
    const directory = await mkdtemp(join(tmpdir(), "connector-impact-cli-"));
    const path = join(directory, "markdown.json");
    await writeFile(path, JSON.stringify({
      connector: "crm`\n## Injected",
      action: "update\n- injected item",
      target: "contact-1",
      evidence: ["proof\n```\n## outside payload"],
      rollback: ["undo *everything*"]
    }));

    const { stdout } = await run("node", ["dist/src/cli.js", "preview", path, "--format", "markdown"]);

    assert.equal(stdout.match(/^## /gm)?.length, 5);
    assert.equal(stdout.match(/^```/gm)?.length, 2);
    assert.doesNotMatch(stdout, /^## Injected$|^- injected item/m);
    assert.match(stdout, /crm\\` \\#\\# Injected/);
  });

  for (const format of ["markdown", "json"]) {
    it(`redacts nested target secrets from ${format} output`, async () => {
      const { stdout } = await run("node", ["dist/src/cli.js", "preview", "fixtures/secret-target.yaml", "--format", format]);

      assert.match(stdout, /\[REDACTED\]/);
      assert.doesNotMatch(stdout, /synthetic_target_key|synthetic_nested_authorization|synthetic_array_credential/);
    });
  }

  it("rejects unknown options", async () => {
    await assert.rejects(
      run("node", ["dist/src/cli.js", "preview", "fixtures/crm-update.yaml", "--bogus"]),
      (error: { code: number; stderr: string }) => {
        assert.equal(error.code, 1);
        assert.equal(error.stderr, "Unknown option: --bogus\n");
        return true;
      }
    );
  });

  it("rejects unknown short options", async () => {
    await assert.rejects(
      run("node", ["dist/src/cli.js", "preview", "fixtures/crm-update.yaml", "-x"]),
      (error: { code: number; stderr: string }) => {
        assert.equal(error.code, 1);
        assert.equal(error.stderr, "Unknown option: -x\n");
        return true;
      }
    );
  });

  it("rejects extra positional arguments", async () => {
    await assert.rejects(
      run("node", ["dist/src/cli.js", "preview", "fixtures/crm-update.yaml", "extra"]),
      (error: { code: number; stderr: string }) => {
        assert.equal(error.code, 1);
        assert.equal(error.stderr, "Unexpected argument: extra\n");
        return true;
      }
    );
  });

  for (const [option, flag] of [["--format", "--out"], ["--out", "-h"]]) {
    it(`rejects ${flag} as the value for ${option}`, async () => {
      await assert.rejects(
        run("node", ["dist/src/cli.js", "preview", "fixtures/crm-update.yaml", option, flag]),
        (error: { code: number; stderr: string }) => {
          assert.equal(error.code, 1);
          assert.equal(error.stderr, `Missing value for option: ${option}\n`);
          return true;
        }
      );
    });
  }

  it("does not write a file when trailing arguments make the command invalid", async () => {
    const directory = await mkdtemp(join(tmpdir(), "connector-impact-cli-"));
    const path = join(directory, "must-not-exist.md");

    await assert.rejects(
      run("node", ["dist/src/cli.js", "preview", "fixtures/crm-update.yaml", "--out", path, "extra"]),
      (error: { code: number; stderr: string }) => {
        assert.equal(error.code, 1);
        assert.equal(error.stderr, "Unexpected argument: extra\n");
        return true;
      }
    );
    await assert.rejects(access(path));
  });

  for (const [label, outputPath] of [
    ["direct", (path: string) => path],
    ["normalized", (path: string) => join(path, "..", basename(path))]
  ] as const) {
    it(`rejects a ${label} output path collision with the input manifest`, async () => {
      const directory = await mkdtemp(join(tmpdir(), "connector-impact-cli-"));
      const manifestPath = join(directory, "manifest.json");
      const original = JSON.stringify({ connector: "crm", action: "update", target: "c1" });
      await writeFile(manifestPath, original);

      await assert.rejects(
        run("node", ["dist/src/cli.js", "preview", manifestPath, "--format", "json", "--out", outputPath(manifestPath)]),
        (error: { code: number; stdout: string; stderr: string }) => {
          assert.equal(error.code, 1);
          assert.equal(error.stdout, "");
          assert.equal(error.stderr, "Output path must differ from the input manifest\n");
          return true;
        }
      );
      assert.equal(await readFile(manifestPath, "utf8"), original);
    });
  }

  it("writes a preview when the output path differs from the input manifest", async () => {
    const directory = await mkdtemp(join(tmpdir(), "connector-impact-cli-"));
    const manifestPath = join(directory, "manifest.json");
    const outputPath = join(directory, "preview.json");
    const original = JSON.stringify({ connector: "crm", action: "update", target: "c1" });
    await writeFile(manifestPath, original);

    const { stdout, stderr } = await run("node", [
      "dist/src/cli.js", "preview", manifestPath, "--format", "json", "--out", outputPath
    ]);

    assert.equal(stdout, "");
    assert.equal(stderr, "");
    assert.equal(JSON.parse(await readFile(outputPath, "utf8")).connector, "crm");
    assert.equal(await readFile(manifestPath, "utf8"), original);
  });

  it("rejects malformed manifest fields without rendering a preview", async () => {
    const directory = await mkdtemp(join(tmpdir(), "connector-impact-cli-"));
    const path = join(directory, "invalid.json");
    await writeFile(path, JSON.stringify({ connector: {}, action: "update", target: "c1" }));

    await assert.rejects(
      run("node", ["dist/src/cli.js", "preview", path]),
      (error: { code: number; stdout: string; stderr: string }) => {
        assert.equal(error.code, 1);
        assert.equal(error.stdout, "");
        assert.equal(error.stderr, 'Manifest field "connector" must be a non-empty string\n');
        return true;
      }
    );
  });

  for (const [format, target, message] of [
    ["markdown", [], 'Manifest field "target" must contain at least one target'],
    ["json", {}, 'Manifest field "target" must contain at least one target property']
  ] as const) {
    it(`rejects an empty ${Array.isArray(target) ? "array" : "object"} target before rendering ${format}`, async () => {
      const directory = await mkdtemp(join(tmpdir(), "connector-impact-cli-"));
      const path = join(directory, "empty-target.json");
      await writeFile(path, JSON.stringify({ connector: "crm", action: "update_contact", target }));

      await assert.rejects(
        run("node", ["dist/src/cli.js", "preview", path, "--format", format]),
        (error: { code: number; stdout: string; stderr: string }) => {
          assert.equal(error.code, 1);
          assert.equal(error.stdout, "");
          assert.equal(error.stderr, `${message}\n`);
          return true;
        }
      );
    });
  }

  for (const [field, value, expectedField] of [
    ["connector", "   ", "connector"],
    ["action", "\t", "action"],
    ["target", " \n ", "target"],
    ["evidence", ["  "], "evidence[0]"],
    ["rollback", ["\t"], "rollback[0]"]
  ] as const) {
    it(`rejects whitespace-only ${field} strings with a field-specific error`, async () => {
      const directory = await mkdtemp(join(tmpdir(), "connector-impact-cli-"));
      const path = join(directory, `${field}.json`);
      await writeFile(path, JSON.stringify({
        connector: "crm",
        action: "update",
        target: "c1",
        [field]: value
      }));

      await assert.rejects(
        run("node", ["dist/src/cli.js", "preview", path]),
        (error: { code: number; stdout: string; stderr: string }) => {
          assert.equal(error.code, 1);
          assert.equal(error.stdout, "");
          assert.equal(error.stderr, `Manifest field "${expectedField}" must be a non-empty string\n`);
          return true;
        }
      );
    });
  }

  for (const option of ["--format", "--out"]) {
    it(`rejects a missing ${option} value`, async () => {
      await assert.rejects(
        run("node", ["dist/src/cli.js", "preview", "fixtures/crm-update.yaml", option]),
        (error: { code: number; stderr: string }) => {
          assert.equal(error.code, 1);
          assert.equal(error.stderr, `Missing value for option: ${option}\n`);
          return true;
        }
      );
    });
  }
});
