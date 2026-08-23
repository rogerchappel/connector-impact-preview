import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const directory = mkdtempSync(join(tmpdir(), "connector-impact-package-"));
const output = execFileSync("npm", ["pack", "--json", "--pack-destination", directory], { encoding: "utf8" });
const [pack] = JSON.parse(output);
const files = new Set(pack.files.map((file) => file.path));

const required = [
  "dist/src/cli.js",
  "dist/src/index.js",
  "fixtures/crm-update.yaml",
  "fixtures/github-comment.json",
  "SKILL.md",
  "README.md",
  "LICENSE",
  "SECURITY.md",
  "CONTRIBUTING.md"
];

const missing = required.filter((file) => !files.has(file));
if (missing.length) {
  console.error(`Package smoke failed; missing files:\n${missing.join("\n")}`);
  process.exit(1);
}

const unintended = [...files].filter((file) => file.startsWith("dist/test/"));
if (unintended.length) {
  console.error(`Package smoke failed; compiled tests were published:\n${unintended.join("\n")}`);
  process.exit(1);
}

try {
  const tarball = join(directory, pack.filename);
  execFileSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarball], {
    cwd: directory,
    stdio: "pipe"
  });
  const cli = join(directory, "node_modules", ".bin", "connector-impact");
  const fixtureRoot = join(directory, "node_modules", "connector-impact-preview", "fixtures");
  execFileSync(cli, ["preview", join(fixtureRoot, "crm-update.yaml"), "--format", "markdown"], {
    cwd: directory,
    stdio: "pipe"
  });
  execFileSync(cli, [
    "preview", join(fixtureRoot, "github-comment.json"), "--format", "json", "--out", "tmp/impact.json"
  ], { cwd: directory, stdio: "pipe" });
  const preview = JSON.parse(readFileSync(join(directory, "tmp", "impact.json"), "utf8"));
  if (preview.connector !== "github") throw new Error("Installed JSON example returned unexpected output");
} finally {
  rmSync(directory, { recursive: true, force: true });
}

console.log(`package smoke ok: ${pack.filename} includes ${pack.files.length} intentional files and installed examples pass`);
