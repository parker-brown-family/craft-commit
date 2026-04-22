#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { validate } from "./validate.js";
import { formatHuman, formatJson } from "./format.js";
import { installHook } from "./install-hook.js";

interface Args {
  path?: string;
  json: boolean;
  lenient: boolean;
  noColor: boolean;
  installHook: boolean;
  hookPath?: string;
  help: boolean;
}

function parseArgs(argv: string[]): Args {
  const a: Args = { json: false, lenient: false, noColor: false, installHook: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i]!;
    if (v === "--help" || v === "-h") a.help = true;
    else if (v === "--json") a.json = true;
    else if (v === "--lenient") a.lenient = true;
    else if (v === "--no-color") a.noColor = true;
    else if (v === "install-hook") {
      a.installHook = true;
      if (argv[i + 1] && !argv[i + 1]!.startsWith("-")) a.hookPath = argv[++i]!;
    } else if (!v.startsWith("-")) a.path = v;
  }
  return a;
}

const USAGE = `craft-commit — lint git commit messages for the three-paragraph doctrine

Usage:
  craft-commit <commit-msg-file>   validate a commit-msg file
  craft-commit                      read commit message from stdin
  craft-commit install-hook [path]  install .git/hooks/commit-msg at [path] (default: .)

Options:
  --json        emit JSON instead of human output
  --lenient     downgrade all errors to warnings (exit 0)
  --no-color    disable ANSI color
  -h, --help    show this help
`;

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(USAGE);
    return 0;
  }
  if (args.installHook) {
    const result = installHook(args.hookPath ?? process.cwd());
    process.stdout.write(`${result.installed ? "installed" : "skipped"}: ${result.path}\n`);
    if (result.note) process.stdout.write(`${result.note}\n`);
    return result.installed ? 0 : 1;
  }
  const raw = args.path ? readFileSync(args.path, "utf8") : await readStdin();
  const result = validate(raw, { lenient: args.lenient });
  const color = !args.noColor && process.stdout.isTTY;
  process.stdout.write((args.json ? formatJson(result) : formatHuman(result, color)) + "\n");
  return result.valid ? 0 : 1;
}

main().then((c) => process.exit(c)).catch((e) => {
  process.stderr.write(`craft-commit: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(2);
});
