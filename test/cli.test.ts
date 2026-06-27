import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { describe, it } from "node:test";
import { promisify } from "node:util";

const run = promisify(execFile);

describe("cli", () => {
  it("renders redacted json from a fixture manifest", async () => {
    const { stdout } = await run("node", ["dist/src/cli.js", "preview", "fixtures/github-comment.json", "--format", "json"]);
    assert.match(stdout, /\[REDACTED\]/);
    assert.doesNotMatch(stdout, /ghp_secret/);
    assert.equal(JSON.parse(stdout).execution, "out-of-scope");
  });
});
