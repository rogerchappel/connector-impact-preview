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
  const installedPackage = join(directory, "node_modules", "connector-impact-preview");
  const manifest = JSON.parse(readFileSync(join(installedPackage, "package.json"), "utf8"));
  for (const [label, target] of [
    ["bin connector-impact", manifest.bin?.["connector-impact"]],
    ["export .", manifest.exports?.["."]]
  ]) {
    const packagePath = typeof target === "string" ? target.replace(/^\.\//, "") : "";
    if (!packagePath || !files.has(packagePath)) {
      throw new Error(`Package smoke failed; ${label} target is absent from tarball: ${target ?? "<missing>"}`);
    }
    try {
      readFileSync(join(installedPackage, packagePath));
    } catch {
      throw new Error(`Package smoke failed; ${label} target is missing after install: ${target}`);
    }
  }
  execFileSync(process.execPath, [
    "--input-type=module",
    "-e",
    `const api = await import(${JSON.stringify(join(installedPackage, manifest.exports["."]))}); if (typeof api.loadManifest !== "function" || typeof api.previewManifest !== "function") throw new Error("Public export is missing expected API functions");`
  ], { cwd: directory, stdio: "pipe" });
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
