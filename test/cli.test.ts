import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { promisify } from "node:util";

const run = promisify(execFile);

describe("cli", () => {
  it("prints usage for --help", async () => {
    const { stdout, stderr } = await run("node", ["dist/src/cli.js", "--help"]);

    assert.match(stdout, /Usage: connector-impact preview/);
    assert.equal(stderr, "");
  });

  it("renders redacted json from a fixture manifest", async () => {
    const { stdout } = await run("node", ["dist/src/cli.js", "preview", "fixtures/github-comment.json", "--format", "json"]);
    assert.match(stdout, /\[REDACTED\]/);
    assert.doesNotMatch(stdout, /ghp_secret/);
    assert.equal(JSON.parse(stdout).execution, "out-of-scope");
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
