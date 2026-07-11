#!/usr/bin/env node
import { writeFile } from "node:fs/promises";

import { loadManifest, previewManifest, renderJson, renderMarkdown } from "./index.js";
import type { OutputFormat } from "./types.js";

interface Args {
  command?: string;
  manifest?: string;
  format: OutputFormat;
  out?: string;
  help?: boolean;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage(process.stdout);
    return;
  }
  if (args.command !== "preview" || !args.manifest) {
    usage(process.stderr);
    process.exitCode = 2;
    return;
  }
  const manifest = await loadManifest(args.manifest);
  const preview = previewManifest(manifest);
  const output = args.format === "json" ? renderJson(preview) : renderMarkdown(preview);
  if (args.out) await writeFile(args.out, output);
  else process.stdout.write(output);
}

function parseArgs(argv: string[]): Args {
  const args: Args = { command: argv[0], manifest: argv[1], format: "markdown" };
  if (argv.includes("--help") || argv.includes("-h") || argv[0] === "help") args.help = true;
  for (let index = 2; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--format") args.format = parseFormat(argv[++index]);
    else if (value === "--out") args.out = argv[++index];
  }
  return args;
}

function parseFormat(value: string | undefined): OutputFormat {
  if (value === "json" || value === "markdown") return value;
  throw new Error(`Unsupported format: ${value ?? ""}`);
}

function usage(stream: NodeJS.WriteStream): void {
  stream.write("Usage: connector-impact preview <manifest.json|yaml> [--format markdown|json] [--out file]\n");
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
