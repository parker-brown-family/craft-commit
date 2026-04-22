import { describe, expect, test } from "bun:test";
import { validate } from "../src/validate.js";

const GOOD = `Expand test suite to 40-case golden corpus and add CI

Selected State:
The v0.0.1 scaffold carried 14 handcrafted unit tests. The repo had no CI
and the README documented only the default pattern set.

Underlying Problem:
Fourteen curated cases are enough to prove the scoring cascade wires up
but not enough to catch regressions when patterns are tuned.

How Addressed:
Added test/golden/corpus.json with 44 labeled utterances. Added a
GitHub Actions workflow running bun test and bun run build on push.`;

describe("accepts canonical three-paragraph doctrine message", () => {
  test("valid=true, zero issues", () => {
    const r = validate(GOOD);
    expect(r.valid).toBe(true);
    expect(r.issues.length).toBe(0);
  });
});

describe("subject rules", () => {
  test("empty message rejected", () => {
    const r = validate("");
    expect(r.valid).toBe(false);
    expect(r.issues[0]?.code).toBe("subject.missing");
  });

  test("subject longer than 72 chars emits error", () => {
    const subj = "x".repeat(80);
    const r = validate(`${subj}\n\nSelected State:\nA.\n\nUnderlying Problem:\nB.\n\nHow Addressed:\nC.`);
    expect(r.issues.some((i) => i.code === "subject.too_long")).toBe(true);
    expect(r.valid).toBe(false);
  });

  test("configurable maxSubjectLength", () => {
    const r = validate(
      "A relatively short subject line\n\nSelected State:\nOne two three.\n\nUnderlying Problem:\nOne two three.\n\nHow Addressed:\nOne two three.",
      { maxSubjectLength: 20 },
    );
    expect(r.issues.some((i) => i.code === "subject.too_long")).toBe(true);
  });

  test("trailing period emits warning, remains valid", () => {
    const r = validate(
      "Fix the bug.\n\nSelected State:\nOne two three.\n\nUnderlying Problem:\nOne two three.\n\nHow Addressed:\nOne two three.",
    );
    expect(r.issues.some((i) => i.code === "subject.trailing_period")).toBe(true);
    expect(r.valid).toBe(true);
  });

  test("lowercase-start emits warning, remains valid", () => {
    const r = validate(
      "fix the bug\n\nSelected State:\nOne two three.\n\nUnderlying Problem:\nOne two three.\n\nHow Addressed:\nOne two three.",
    );
    expect(r.issues.some((i) => i.code === "subject.lowercase_start")).toBe(true);
    expect(r.valid).toBe(true);
  });

  test("missing blank line after subject emits error", () => {
    const r = validate(
      "Fix the bug\nSelected State:\nOne two three.\n\nUnderlying Problem:\nOne two three.\n\nHow Addressed:\nOne two three.",
    );
    expect(r.issues.some((i) => i.code === "body.missing_blank_after_subject")).toBe(true);
    expect(r.valid).toBe(false);
  });
});

describe("section rules", () => {
  test("missing section rejected with actionable code", () => {
    const r = validate(
      "Fix the bug\n\nSelected State:\nOne two three.\n\nHow Addressed:\nOne two three.",
    );
    const missing = r.issues.filter((i) => i.code === "section.missing");
    expect(missing.length).toBe(1);
    expect(missing[0]?.message).toContain("Underlying Problem");
    expect(r.valid).toBe(false);
  });

  test("empty section body rejected", () => {
    const r = validate(
      "Fix the bug\n\nSelected State:\n\nUnderlying Problem:\nOne two three.\n\nHow Addressed:\nOne two three.",
    );
    expect(r.issues.some((i) => i.code === "section.empty")).toBe(true);
    expect(r.valid).toBe(false);
  });

  test("too-short section body emits warning only", () => {
    const r = validate(
      "Fix the bug\n\nSelected State:\nOne.\n\nUnderlying Problem:\nOne two three.\n\nHow Addressed:\nOne two three.",
      { minParagraphWords: 3 },
    );
    expect(r.issues.some((i) => i.code === "section.too_short")).toBe(true);
    expect(r.valid).toBe(true);
  });

  test("out-of-order sections rejected", () => {
    const r = validate(
      "Fix the bug\n\nHow Addressed:\nOne two three.\n\nSelected State:\nOne two three.\n\nUnderlying Problem:\nOne two three.",
    );
    expect(r.issues.some((i) => i.code === "section.out_of_order")).toBe(true);
    expect(r.valid).toBe(false);
  });

  test("section labels are case-insensitive", () => {
    const r = validate(
      "Fix the bug\n\nselected state:\nOne two three.\n\nunderlying problem:\nOne two three.\n\nhow addressed:\nOne two three.",
    );
    expect(r.valid).toBe(true);
  });
});

describe("trailers and comments", () => {
  test("git comment lines ignored", () => {
    const r = validate(
      "Fix the bug\n# Please enter the commit message\n\nSelected State:\nOne two three.\n\nUnderlying Problem:\nOne two three.\n\nHow Addressed:\nOne two three.\n# On branch main\n",
    );
    expect(r.valid).toBe(true);
  });

  test("Signed-off-by trailer stripped before analysis", () => {
    const r = validate(
      "Fix the bug\n\nSelected State:\nOne two three.\n\nUnderlying Problem:\nOne two three.\n\nHow Addressed:\nOne two three.\n\nSigned-off-by: Parker <p@b.f>\nCo-authored-by: Claude <c@a.i>\n",
    );
    expect(r.valid).toBe(true);
    expect(r.issues.length).toBe(0);
  });
});

describe("lenient mode", () => {
  test("downgrades all errors to warnings and reports valid=true", () => {
    const r = validate("", { lenient: true });
    expect(r.valid).toBe(true);
    expect(r.issues.every((i) => i.severity === "warning")).toBe(true);
  });
});

describe("custom sections", () => {
  test("requiredSections override", () => {
    const msg = "Fix the bug\n\nContext:\nOne two three.\n\nChange:\nOne two three.";
    const r = validate(msg, { requiredSections: ["Context", "Change"] });
    expect(r.valid).toBe(true);
  });
});
