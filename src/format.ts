import type { Issue, ValidationResult } from "./validate.js";

const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

export function formatHuman(result: ValidationResult, color = true): string {
  if (result.issues.length === 0) return color ? `${DIM}commit message ok${RESET}` : "commit message ok";
  const lines: string[] = [];
  for (const i of result.issues) {
    lines.push(renderIssue(i, color));
  }
  lines.push("");
  lines.push(result.valid ? "ok (warnings only)" : "rejected");
  return lines.join("\n");
}

function renderIssue(i: Issue, color: boolean): string {
  const tag = i.severity === "error" ? "ERROR  " : "WARN   ";
  const col = i.severity === "error" ? RED : YELLOW;
  const loc = i.line ? `line ${i.line}` : "—";
  const head = color ? `${col}${tag}${RESET}` : tag;
  return `${head} ${i.code.padEnd(34)} ${loc.padEnd(8)} ${i.message}`;
}

export function formatJson(result: ValidationResult): string {
  return JSON.stringify(result, null, 2);
}
