---
name: code-quality-review
description: Advisory pre-push/pre-PR code quality review for current diffs. Use when asked to review code quality, run a pre-PR or pre-push quality pass, inspect AI-generated changes, check for over-engineering, or before pushing/opening a PR. Reports suggestions only; does not block or edit unless explicitly asked.
---

# Code Quality Review

Run an advisory review of the current diff. This is a suggestion pass for the author before push or PR, not a blocking CI gate.

## Scope

- If the user supplies a base, review against that base.
- Otherwise review branch changes against `master` plus any staged, unstaged, or untracked files.
- Read `AGENTS.md` and any nested `AGENTS.md` files that cover changed paths. For UI work, also read the repo design guidance named there.
- Skim nearby source before judging a hunk. Do not review from the patch alone when surrounding patterns matter.
- Do not re-run or duplicate deterministic tools such as build, lint, typecheck, React Doctor, or Knip. Mention them only when the diff suggests they are especially relevant.

## Review Lenses

1. **Documented standards**: flag clear drift from repo policy, directory rules, design rules, or known-surprises guidance.
2. **Simplicity**: look for speculative abstractions, wrappers with one caller, new configuration nobody sets, avoidable dependencies, boilerplate, or code that a native platform feature, standard library, or existing dependency already covers.
3. **Structure**: look for wrong-layer logic, conditionals growing into state machines, duplicated helpers, file-size sprawl, unclear ownership, or casts and optionality that blur trust boundaries.
4. **Interface and tests**: prefer deep modules with small useful interfaces over shallow pass-through modules. Tests should exercise public behavior and survive internal refactors. Risky logic should have a fast feedback loop.
5. **Scope control**: identify behavior that was not requested, changes unrelated to the task, or cleanup that should be split out.

## Output

- If there are no high-confidence findings, say: `No high-confidence advisory findings. Ship.`
- Otherwise report at most 8 findings, ordered by expected payoff.
- Use this format: `[standard|simplicity|structure|testability|scope] path:line - Finding. Suggestion. Confidence: high|medium.`
- Keep findings specific and actionable. Skip nits, style preferences, and anything the repo tooling already handles.
- End with `Advisory only; not a blocker.`

## Boundaries

- Do not suggest deleting tests, accessibility, security checks, trust-boundary validation, data-loss protection, or error handling unless you provide an equally safe simpler replacement.
- Respect documented product constraints and historical decisions. If a suggestion appears to contradict an ADR, known surprise, or explicit repo policy, call that out instead of presenting it as a straightforward cleanup.
- Do not edit files unless the user explicitly asks you to apply the review findings.
