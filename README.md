# craft-commit

Lint git commit messages for the three-paragraph doctrine: **Selected
State**, **Underlying Problem**, **How Addressed**. Deterministic, no
LLM, pre-commit-hook ready.

## Why

Commit messages age into the only record of why a change was made. A
one-line subject is great for the log; it's terrible as deliberation
memory. The three-paragraph doctrine forces the author to state the
ground truth they're starting from, the defect that state carries, and
the change they're making — in that order.

## The doctrine

```
<imperative subject line, ≤72 chars, no trailing period>

Selected State:
What the system currently has. The ground truth you are starting from.

Underlying Problem:
The missing capability or defect that state carries.

How Addressed:
The change itself — what was built, where, and the evidence it works.
```

Trailers (`Signed-off-by:`, `Co-authored-by:`, `Refs:`, `Closes:`, etc.)
and git comment lines (`#…`) are stripped before validation.

## Install

```sh
npm install --save-dev @parker-brown-family/craft-commit
# or
bun add -d @parker-brown-family/craft-commit
```

## Use — CLI

```sh
craft-commit <path-to-commit-msg-file>   # exit 0 valid, 1 invalid, 2 error
craft-commit                              # read from stdin
craft-commit --json <file>                # machine output
craft-commit --lenient <file>             # downgrade errors to warnings
craft-commit install-hook                 # drop .git/hooks/commit-msg
```

## Use — git hook

```sh
cd your-repo
craft-commit install-hook
```

Subsequent `git commit` invocations will reject messages that don't
satisfy the doctrine. Removing it is `rm .git/hooks/commit-msg`.

## Use — library

```ts
import { validate, formatHuman } from "@parker-brown-family/craft-commit";

const result = validate(fs.readFileSync(".git/COMMIT_EDITMSG", "utf8"));
if (!result.valid) {
  console.error(formatHuman(result));
  process.exit(1);
}
```

Options:

| Option | Default | Effect |
|---|---|---|
| `maxSubjectLength` | `72` | soft cap on subject chars |
| `minParagraphWords` | `3` | too-short sections emit `section.too_short` warning |
| `lenient` | `false` | downgrade all errors to warnings |
| `requiredSections` | `["Selected State", "Underlying Problem", "How Addressed"]` | override labels (e.g. `["Context", "Change"]`) |

## Issue codes

| Code | Severity | Meaning |
|---|---|---|
| `subject.missing` | error | commit has no subject line |
| `subject.too_long` | error | subject exceeds `maxSubjectLength` |
| `subject.trailing_period` | warning | subject ends with `.` |
| `subject.lowercase_start` | warning | subject begins with lowercase letter |
| `body.missing_blank_after_subject` | error | no blank line between subject and body |
| `section.missing` | error | a required doctrine section is absent |
| `section.empty` | error | section label present but body empty |
| `section.too_short` | warning | section body shorter than `minParagraphWords` |
| `section.out_of_order` | error | sections appear in the wrong order |

## Provenance

Commit doctrine convention formalized in the APES context engine
(`/home/pbrown/.../apes`). This linter is a standalone enforcer — no
APES dependency.

## License

MIT
