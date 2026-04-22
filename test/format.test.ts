import { describe, expect, test } from "bun:test";
import { formatHuman, formatJson, DOCTRINE_BRIEF } from "../src/format.js";
import { validate } from "../src/validate.js";

const GOOD = `Fix the bug

Selected State:
One two three.

Underlying Problem:
One two three.

How Addressed:
One two three.`;

describe("formatHuman", () => {
  test("valid + zero issues emits tight success line, no doctrine", () => {
    const r = validate(GOOD);
    const out = formatHuman(r, false);
    expect(out).toBe("commit message ok");
    expect(out).not.toContain("Selected State");
  });

  test("valid + warnings only does not append doctrine block", () => {
    const r = validate("Fix the bug.\n\nSelected State:\nOne two three.\n\nUnderlying Problem:\nOne two three.\n\nHow Addressed:\nOne two three.");
    const out = formatHuman(r, false);
    expect(r.valid).toBe(true);
    expect(out).toContain("ok (warnings only)");
    expect(out).not.toContain(DOCTRINE_BRIEF.trim());
  });

  test("rejection output includes the doctrine brief inline", () => {
    const r = validate("fix\n\nSelected State:\nempty.\n\nHow Addressed:\nDid something.");
    const out = formatHuman(r, false);
    expect(r.valid).toBe(false);
    expect(out).toContain("rejected");
    expect(out).toContain("Three-paragraph commit doctrine:");
    expect(out).toContain("Selected State:");
    expect(out).toContain("Underlying Problem:");
    expect(out).toContain("How Addressed:");
    expect(out).toContain("Do not use --lenient");
    expect(out).toContain("github.com/parker-brown-family/craft-commit");
  });

  test("doctrine brief stays under the 400-token budget (~1600 chars)", () => {
    expect(DOCTRINE_BRIEF.length).toBeLessThan(1600);
  });

  test("color mode wraps rejected in ANSI", () => {
    const r = validate("");
    const out = formatHuman(r, true);
    expect(out).toContain("\x1b[1m\x1b[31mrejected\x1b[0m");
  });
});

describe("formatJson", () => {
  test("machine output is parseable and does not carry the doctrine", () => {
    const r = validate("");
    const out = formatJson(r);
    const parsed = JSON.parse(out);
    expect(parsed.valid).toBe(false);
    expect(out).not.toContain("Three-paragraph commit doctrine:");
  });
});
