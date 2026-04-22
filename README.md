# craft-commit

**A deterministic, LLM-free commit-message linter that enforces a
three-paragraph narrative doctrine — so agents and humans can both ship
commits worth reading six months later.**

---

## What it does (the solution)

Reads a git commit message. Checks that it has an imperative subject line
and three ordered paragraphs: **Selected State**, **Underlying Problem**,
**How Addressed**. Exits `0` if valid, `1` if not. Runs as a `commit-msg`
hook so the check happens automatically, on every commit, in any tool.

No LLM calls. No network. Pure parser. Exit code is the contract.

## The problem

The 50/72-character subject convention was invented in 2008 for
`git log --oneline` on terminal widths nobody uses anymore. It forces
lossy compression of the one artifact that will outlive every Slack
thread, Linear ticket, and design doc referenced in a change: the
commit message.

Narrative conventions enforced by human reviewers drift the moment
reviewers get tired. Agents can't enforce narrative conventions *at all*
unless the rule is machine-checkable. Without a deterministic check,
commit history decays into noise — and the only permanent record of
*why* a change happened becomes unreadable.

## How it works

Every valid message has three paragraphs, in order, each with a
non-empty body:

```
<imperative subject line, ≤72 chars, no trailing period>

Selected State:
The ground truth this commit starts from — what the system currently
has.

Underlying Problem:
The missing capability or defect that state carries.

How Addressed:
The change itself — what was built, where, and the evidence it works.
```

Trailers (`Signed-off-by:`, `Co-authored-by:`, `Refs:`, `Closes:`, etc.)
and git comment lines (`#…`) are stripped before validation. Rejections
print every issue with a stable code so an agent or human can read the
output, rewrite the message, and retry.

---

## Install & use

There are two audiences. Pick the one that fits.

### a) Agentic — integrate craft-commit into an agent harness

**Primary use case.** Paste the following block verbatim into your
agent's rules file — `CLAUDE.md`, `AGENTS.md`, `.augment/rules/commit.md`,
`.cursorrules`, or whatever your harness reads on startup:

```md
## Commit messages — three-paragraph doctrine (enforced by craft-commit)

Before running `git commit`, write the message to a file and lint it:

    npx -y @parker-brown-family/craft-commit <path-to-msg-file>

If the exit code is non-zero, rewrite the message until it passes. Every
commit must have:

1. An imperative subject line, ≤72 chars, no trailing period.
2. A blank line.
3. Three labeled paragraphs, in order:
   - **Selected State:** the ground truth this commit starts from.
   - **Underlying Problem:** the defect or gap that state carries.
   - **How Addressed:** the change itself, with the evidence it works.

Never pass `--lenient` to bypass errors. Rewrite the message instead.
```

Then install the hook in every repo you want enforced:

```sh
cd your-repo
npx -y @parker-brown-family/craft-commit install-hook
```

From that point forward, the agent's commits are machine-checked on
every `git commit`. Failed messages print the specific issues and the
agent self-corrects without ever revisiting this README.

### b) Conventional — you're a human dev (maybe with light agent assist)

```sh
npm install --save-dev @parker-brown-family/craft-commit
npx craft-commit install-hook
```

Now `git commit` rejects any message that doesn't satisfy the doctrine.
The rejection output tells you exactly what's wrong. To bypass
temporarily (e.g. during a `git revert`), run with `--no-verify` — but
at that point you're lying to yourself about what commits are for.

---

## Reference

### CLI

```sh
craft-commit <path-to-commit-msg-file>   # exit 0 valid, 1 invalid, 2 error
craft-commit                              # read from stdin
craft-commit --json <file>                # machine output
craft-commit --lenient <file>             # downgrade errors to warnings
craft-commit --no-color <file>            # disable ANSI color
craft-commit install-hook [path]          # drop .git/hooks/commit-msg
craft-commit --help                       # usage summary
```

### Library

```ts
import { validate, formatHuman } from "@parker-brown-family/craft-commit";

const result = validate(fs.readFileSync(".git/COMMIT_EDITMSG", "utf8"));
if (!result.valid) {
  console.error(formatHuman(result));
  process.exit(1);
}
```

### Options

| Option | Default | Effect |
|---|---|---|
| `maxSubjectLength` | `72` | soft cap on subject chars |
| `minParagraphWords` | `3` | too-short sections emit `section.too_short` warning |
| `lenient` | `false` | downgrade all errors to warnings |
| `requiredSections` | `["Selected State", "Underlying Problem", "How Addressed"]` | override labels (e.g. `["Context", "Change"]`) |

### Issue codes

| Code | Severity | Meaning |
|---|---|---|
| `subject.missing` | error | commit has no subject line |
| `subject.too_long` | error | subject exceeds `maxSubjectLength` |
| `subject.trailing_period` | warning | subject ends with `.` |
| `subject.lowercase_start` | warning | subject begins with a lowercase letter |
| `body.missing_blank_after_subject` | error | no blank line between subject and body |
| `section.missing` | error | a required doctrine section is absent |
| `section.empty` | error | section label present but body empty |
| `section.too_short` | warning | section body shorter than `minParagraphWords` |
| `section.out_of_order` | error | sections appear in the wrong order |

### Provenance

The three-paragraph commit doctrine was formalized in the APES context
engine (`/projects/apes`). This linter is a standalone enforcer — no
APES dependency, no coupling beyond the pattern itself.

### License

MIT
