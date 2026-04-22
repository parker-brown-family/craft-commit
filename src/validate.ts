/**
 * Three-paragraph commit doctrine validator.
 *
 * A conforming message:
 *
 *   <subject line, imperative mood, <= 72 chars, no trailing period>
 *   <blank>
 *   Selected State:
 *   <non-empty prose>
 *   <blank>
 *   Underlying Problem:
 *   <non-empty prose>
 *   <blank>
 *   How Addressed:
 *   <non-empty prose>
 *
 * Trailers (Signed-off-by:, Co-authored-by:, Refs:, etc.) and comments (lines
 * starting with #) are stripped before validation.
 */

export type Severity = "error" | "warning";

export interface Issue {
  severity: Severity;
  code: string;
  message: string;
  line?: number;
}

export interface ValidateOptions {
  /** Max subject-line length. Default: 72. */
  maxSubjectLength?: number;
  /** Minimum words required per paragraph body. Default: 3. */
  minParagraphWords?: number;
  /** If true, downgrade all errors to warnings. Default: false. */
  lenient?: boolean;
  /** Override the required paragraph labels, in order. */
  requiredSections?: readonly string[];
}

export interface ValidationResult {
  valid: boolean;
  issues: readonly Issue[];
}

export const DEFAULT_SECTIONS = [
  "Selected State",
  "Underlying Problem",
  "How Addressed",
] as const;

const TRAILER_RE = /^[A-Za-z-]+:\s/;
const KNOWN_TRAILERS = new Set([
  "Signed-off-by",
  "Co-authored-by",
  "Refs",
  "Ref",
  "Fixes",
  "Closes",
  "Reviewed-by",
  "Acked-by",
  "Tested-by",
  "Reported-by",
  "Suggested-by",
]);

function stripCommentsAndTrailers(raw: string): string {
  const lines = raw.split(/\r?\n/).filter((l) => !l.startsWith("#"));
  while (lines.length > 0 && lines[lines.length - 1]!.trim() === "") lines.pop();
  let trailerStart = lines.length;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!;
    if (line.trim() === "") break;
    const m = line.match(TRAILER_RE);
    if (m && KNOWN_TRAILERS.has(line.split(":")[0]!)) {
      trailerStart = i;
    } else {
      break;
    }
  }
  return lines.slice(0, trailerStart).join("\n").replace(/\n+$/, "");
}

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export function validate(raw: string, options: ValidateOptions = {}): ValidationResult {
  const maxSubject = options.maxSubjectLength ?? 72;
  const minWords = options.minParagraphWords ?? 3;
  const sections = options.requiredSections ?? DEFAULT_SECTIONS;
  const issues: Issue[] = [];

  const body = stripCommentsAndTrailers(raw);
  const lines = body.split("\n");

  if (lines.length === 0 || lines[0]!.trim() === "") {
    issues.push({ severity: "error", code: "subject.missing", message: "commit subject line is empty", line: 1 });
    return finalize(issues, options.lenient);
  }

  const subject = lines[0]!;
  if (subject.length > maxSubject) {
    issues.push({
      severity: "error",
      code: "subject.too_long",
      message: `subject line is ${subject.length} chars (max ${maxSubject})`,
      line: 1,
    });
  }
  if (/\.$/.test(subject)) {
    issues.push({ severity: "warning", code: "subject.trailing_period", message: "subject ends with a period", line: 1 });
  }
  if (/^[a-z]/.test(subject)) {
    issues.push({ severity: "warning", code: "subject.lowercase_start", message: "subject starts with a lowercase letter", line: 1 });
  }

  if (lines.length < 2 || lines[1]!.trim() !== "") {
    issues.push({ severity: "error", code: "body.missing_blank_after_subject", message: "subject must be followed by a blank line", line: 2 });
  }

  for (const section of sections) {
    const idx = lines.findIndex((l) => l.trim().replace(/:$/, "").toLowerCase() === section.toLowerCase());
    if (idx === -1) {
      issues.push({ severity: "error", code: "section.missing", message: `required section "${section}:" not found` });
      continue;
    }
    const bodyLines: string[] = [];
    for (let j = idx + 1; j < lines.length; j++) {
      const l = lines[j]!;
      if (l.trim() === "") break;
      if (sections.some((s) => l.trim().replace(/:$/, "").toLowerCase() === s.toLowerCase())) break;
      bodyLines.push(l);
    }
    const wc = countWords(bodyLines.join(" "));
    if (wc === 0) {
      issues.push({ severity: "error", code: "section.empty", message: `section "${section}:" has no body`, line: idx + 1 });
    } else if (wc < minWords) {
      issues.push({
        severity: "warning",
        code: "section.too_short",
        message: `section "${section}:" body has ${wc} word(s) (min ${minWords})`,
        line: idx + 1,
      });
    }
  }

  const seen = sections
    .map((s) => ({ s, i: lines.findIndex((l) => l.trim().replace(/:$/, "").toLowerCase() === s.toLowerCase()) }))
    .filter((x) => x.i !== -1);
  for (let i = 1; i < seen.length; i++) {
    if (seen[i]!.i < seen[i - 1]!.i) {
      issues.push({
        severity: "error",
        code: "section.out_of_order",
        message: `section "${seen[i]!.s}:" appears before "${seen[i - 1]!.s}:"`,
      });
    }
  }

  return finalize(issues, options.lenient);
}

function finalize(issues: Issue[], lenient?: boolean): ValidationResult {
  const final = lenient ? issues.map((i) => ({ ...i, severity: "warning" as const })) : issues;
  return { valid: final.every((i) => i.severity !== "error"), issues: final };
}
