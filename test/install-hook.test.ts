import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installHook } from "../src/install-hook.js";

let dir = "";

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "craft-commit-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("installHook", () => {
  test("refuses a non-git directory", () => {
    const r = installHook(dir);
    expect(r.installed).toBe(false);
    expect(r.note).toContain("not a git repository");
  });

  test("installs a commit-msg hook in a fresh git repo", () => {
    execSync("git init -q", { cwd: dir });
    const r = installHook(dir);
    expect(r.installed).toBe(true);
    expect(existsSync(r.path)).toBe(true);
    const body = readFileSync(r.path, "utf8");
    expect(body).toContain("exec craft-commit");
  });

  test("skips when own hook already present", () => {
    execSync("git init -q", { cwd: dir });
    installHook(dir);
    const r = installHook(dir);
    expect(r.installed).toBe(false);
    expect(r.note).toContain("already installed");
  });

  test("refuses to clobber a foreign hook", () => {
    execSync("git init -q", { cwd: dir });
    writeFileSync(join(dir, ".git/hooks/commit-msg"), "#!/bin/sh\necho hi\n");
    const r = installHook(dir);
    expect(r.installed).toBe(false);
    expect(r.note).toContain("different commit-msg hook");
  });
});
