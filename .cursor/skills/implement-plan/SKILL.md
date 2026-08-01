---
name: implement-plan
description: Orchestrates implementation of a multi-task plan by spawning plan-implementer subagents in parallel. Use when the user provides a plan file or plan text and asks to implement it, execute it, or says "implement plan", "run plan", "execute plan".
---

# Implement Plan

You are the **orchestrator**. Your job is to execute the attached plan by delegating tasks to `plan-implementer` subagents. Preserve your context window for coordination — never implement tasks yourself.

## Workflow

### 1. Analyze the Plan

Read the plan the user attached. Identify:

- All discrete tasks/steps
- Dependencies between tasks (which must run sequentially vs. can run in parallel)
- Any ambiguous items that need clarification before starting

If anything is unclear, ask the user before proceeding.

### 2. Group Tasks for Parallelization

Partition tasks into **parallel batches** based on dependencies:

```
Batch 1 (parallel): [tasks with no dependencies]
Batch 2 (parallel): [tasks that depend on batch 1]
Batch 3 (parallel): [tasks that depend on batch 2]
...
```

**Rules:**

- Max 4 concurrent subagents, to bound machine load and coordination overhead
- Never parallelize browser-driving work. Queue browser checks behind the machine-wide `./scripts/pw-session.sh` lock and run them sequentially after implementation work.
- Tasks touching the same file(s) go in the same subagent or sequential batches — never parallel
- Small related tasks can be grouped into one subagent to reduce overhead
- Large independent tasks get their own subagent

### 3. Execute Batches

For each batch, spawn `plan-implementer` subagents using the Task tool with `subagent_type: "plan-implementer"`.

Each subagent prompt must include:

- **Exact tasks** to implement (copy from the plan, don't paraphrase loosely)
- **File paths** and context needed to work independently
- **Constraints** or edge cases from the plan

Use the `plan-implementer` agent's configured model unless the harness explicitly requires a supported model override for a straightforward task. Omit overrides for complex or cross-cutting tasks.

Wait for all subagents in a batch to complete before starting the next batch.

### 4. Handle Failures

When a subagent reports PARTIAL or FAILED:

- Read its report to understand what failed and why
- Decide: retry with more context, reassign to a different batch, or implement the fix yourself if trivial
- Don't retry blindly — adjust the prompt or approach

### 5. Verify

After all batches complete:

1. Run `yarn build` to confirm everything compiles
2. Run `yarn lint` and `yarn type-check`
3. If the plan touched React components/hooks, run the repo-standard verification commands and add `yarn test` when runtime behavior or tests changed
4. For UI changes, verify with `./scripts/pw-session.sh` across `chrome`, `firefox`, and `webkit` sequentially, reusing each engine session for the mobile viewport flow when relevant and closing it before opening the next

### 6. Report

Summarize to the user:

```
## Plan Execution Summary

### Completed
- Task 1 — files modified
- Task 2 — files modified

### Failed (if any)
- Task N — reason, what was tried

### Verification
- Build: PASS/FAIL
- Lint: PASS/FAIL
- Type-check: PASS/FAIL
```

## Key Principles

- **You orchestrate, subagents implement.** Don't code changes yourself unless it's a trivial one-liner fix for a subagent failure.
- **Context is precious.** Every build log and file read you do in the main thread is context you can't get back. Delegate liberally.
- **Parallelize non-browser work aggressively.** Browser-driving work is always serialized by the machine-wide resource lock, even when tasks are otherwise independent.
- **Verify at the end, not in between.** Subagents run their own build checks. You do a final holistic verification.
