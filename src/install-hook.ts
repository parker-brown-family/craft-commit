import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export interface InstallResult {
  installed: boolean;
  path: string;
  note?: string;
}

const HOOK_BODY = `#!/usr/bin/env sh
# craft-commit — three-paragraph doctrine linter
# installed by @parker-brown-family/craft-commit
exec craft-commit "$1"
`;

const MARKER = "craft-commit — three-paragraph doctrine linter";

export function installHook(repoPath: string): InstallResult {
  const root = resolve(repoPath);
  const gitDir = join(root, ".git");
  if (!existsSync(gitDir)) {
    return { installed: false, path: gitDir, note: "not a git repository (no .git directory)" };
  }
  const hooksDir = join(gitDir, "hooks");
  if (!existsSync(hooksDir)) mkdirSync(hooksDir, { recursive: true });
  const hookPath = join(hooksDir, "commit-msg");
  if (existsSync(hookPath)) {
    const existing = readFileSync(hookPath, "utf8");
    if (existing.includes(MARKER)) {
      return { installed: false, path: hookPath, note: "craft-commit hook already installed" };
    }
    return { installed: false, path: hookPath, note: "a different commit-msg hook already exists; remove it or edit it to call craft-commit" };
  }
  writeFileSync(hookPath, HOOK_BODY, "utf8");
  chmodSync(hookPath, 0o755);
  return { installed: true, path: hookPath };
}
