# Progress Log

## 2026-07-19

- Item: F001
- Summary: Created the isolated worktree, loaded product and design context, started three read-only audits, and confirmed the supported agent-init command starts the branch-scoped development server.
- Files: `docs/agent-runs/directory-routes/feature-list.json`, `docs/agent-runs/directory-routes/progress.md`
- Verification: `./scripts/agent-init.sh`
- Blockers: none
- Next: Finish source archaeology and implement the directory registry as a route-only input.

- Item: F001-F005
- Summary: Implemented versioned deterministic directory snapshots, route-only resolution, exact-address Join and permalink behavior, atomic subscription provenance, consented winner-change actions, per-slot automatic switching with safe undo, exact action-route redirects, localized disclosure/update UI, and the architecture decision record.
- Files: `src/data/seedit-directories/`, `src/hooks/use-directory-list.ts`, `src/hooks/use-resolved-community-route.ts`, `src/lib/utils/directory-subscriptions.ts`, `src/lib/utils/directory-account-transforms.ts`, `src/components/directory-*`, `src/components/exact-community-action-route/`, `docs/architecture/directory-routes.md`
- Verification: 25 test files / 168 tests; build, lint, type-check, Knip, AI workflow parity, generated LLM context, changed-scope React Doctor, translation coverage, and `git diff --check` pass.
- Blockers: Full-repository React Doctor still exits on pre-existing findings outside this change; changed-scope React Doctor reports no issues.
- Next: Finish the multi-engine desktop/mobile and throttled Chromium browser pass, then split the Seedit diff into focused commits without pushing it.

- Item: F006
- Summary: Completed the final quality gate and browser matrix. Directory aliases disclose and join the exact winner, exact-address routes remain exact, submit aliases canonicalize before rendering, and no directory slug enters account subscriptions.
- Files: `docs/agent-runs/directory-routes/feature-list.json`, `docs/agent-runs/directory-routes/progress.md`
- Verification: 25 test files / 168 tests; build, lint, type-check, Knip, AI workflow parity, changed-scope React Doctor, generated LLM context, and `git diff --check`; Chrome, Firefox, and WebKit at 1440x1000 and 390x844; Chromium mid-throttle warm navigation; light and dark themes; no horizontal overflow.
- Blockers: Full-repository React Doctor retains pre-existing findings outside this change; external P2P router CORS/404/521 failures were observed during browser verification but produced no directory-feature exceptions.
- Next: Review the four focused local commits; keep the Seedit branch unpushed until explicitly approved.
