import type { Issue, ValidationResult } from "./validate.js";

const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

export const DOCTRINE_BRIEF = `
Three-paragraph commit doctrine:

  <imperative subject line, <=72 chars, no trailing period>

  Selected State:
      The ground truth this commit starts from — what the system
      currently has.

  Underlying Problem:
      The missing capability or defect that state carries.

  How Addressed:
      The change itself — what was built and the evidence it works.

Rewrite the message to satisfy all three paragraphs, in order, and retry.
Do not use --lenient to bypass errors.

Docs: https://github.com/parker-brown-family/craft-commit`;

export function formatHuman(result: ValidationResult, color = true): string {
  if (result.issues.length === 0) return color ? `${DIM}commit message ok${RESET}` : "commit message ok";
  const lines: string[] = [];
  for (const i of result.issues) {
    lines.push(renderIssue(i, color));
  }
  lines.push("");
  if (result.valid) {
    lines.push("ok (warnings only)");
  } else {
    lines.push(color ? `${BOLD}${RED}rejected${RESET}` : "rejected");
    lines.push(DOCTRINE_BRIEF);
  }
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
