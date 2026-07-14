# Progress Log

## 2026-07-14 12:00

- Item: F001
- Summary: Created the isolated worktree, captured product context, and started source audits for directory removal, .bso shorthand routing, and the starter-set UX.
- Files: `PRODUCT.md`, `docs/agent-runs/starter-subscriptions/feature-list.json`, `docs/agent-runs/starter-subscriptions/progress.md`
- Verification: pending baseline smoke
- Blockers: none
- Next: Run the baseline smoke check, reconcile the three audit reports, and implement F001.

## 2026-07-14 16:20

- Items: F001-F005
- Summary: Replaced Seedit directories with address-owned subscriptions, deterministic `.bso` URL shorthand, versioned default communities, an event-driven home notice, and a provenance-safe review flow.
- Files: `src/hooks/use-auto-subscribe.ts`, `src/hooks/use-default-subscriptions.ts`, `src/hooks/use-starter-subscriptions.ts`, `src/lib/utils/community-route-utils.ts`, `src/lib/utils/starter-subscriptions.ts`, `src/views/starter-subscriptions/`, `src/components/starter-subscriptions-notice/`, plus route integrations, translations, README, and generated LLM docs.
- Verification: 54 tests passed; type-check, lint, and production build passed; focused React Doctor has only the pre-existing large `Post` component warning; Chrome, Firefox, and WebKit passed desktop and mobile checks. A mocked revision-2 list showed the home notice and the keep-current action cleared it without changing subscriptions.
- Blockers: The external `bitsocialnet/lists` payload must adopt `schemaVersion: 1` plus an increasing `revision` before remote default-community updates can activate. Its existing `seedit-directories` folder remains a separate seeder-compatibility concern.
- Next: Coordinate the versioned list publisher and the eventual token-voting aggregation mechanism outside this Seedit worktree.

## 2026-07-14 16:55

- Items: F003-F005
- Summary: Standardized user-facing terminology on “default communities,” retained “default subscriptions” for onboarding behavior, renamed the review route to `/communities/defaults`, and synchronized the copy across all 35 locales. Published the versioned default-community payload to `bitsocialnet/lists` while retaining retired directory files only for seeder discovery.
- Files: `README.md`, `src/app.tsx`, `src/components/starter-subscriptions-notice/starter-subscriptions-notice.tsx`, `src/data/seedit-starter-communities.json`, `src/hooks/use-auto-subscribe.ts`, `src/hooks/use-default-subscriptions.ts`, `public/translations/*/default.json`, generated LLM docs, and `bitsocialnet/lists` commit `139a15d`.
- Verification: All nine renamed UI strings are present in 35/35 locale files with placeholders intact; 56 tests, type-check, lint, production build, and diff checks pass. Chrome, Firefox, and WebKit pass the `/communities/defaults` copy and control checks at 1440x900 and 390x844 with no horizontal overflow.
- Blockers: none
- Next: Keep the Seedit worktree local for review; do not push its branch until explicitly requested.

## 2026-07-14 20:36

- Item: F003
- Summary: Hardened remote default-community refreshes after the final independent review. Malformed successful responses now enter the existing fallback/error path, and a lower remote revision can no longer replace the latest accepted list.
- Files: `src/hooks/use-default-subscriptions.ts`, `src/hooks/use-default-subscriptions.test.ts`
- Verification: Two focused regressions increased the suite to 56 passing tests; type-check, lint, production build, and diff checks pass. A separate subagent confirmed the revision gate uses the latest snapshot and that the existing catch preserves the current list while recording malformed-response errors.
- Blockers: none
- Next: Await review before committing or pushing the Seedit branch.

## 2026-07-15 00:16

- Items: F003-F004
- Summary: Removed the old-client payload mirror and flag from `bitsocialnet/lists`. Seedit now reads only the canonical `communities` field; no compatibility alias is accepted. Kept revision 1 because membership did not change, while synchronizing the list `updatedAt` metadata with Seedit's vendored fallback.
- Files: `bitsocialnet/lists/seedit-default-subscriptions.json`, `bitsocialnet/lists/README.md`, `src/data/seedit-starter-communities.json`, `src/hooks/use-default-subscriptions.ts`, `src/hooks/use-default-subscriptions.test.ts`, `src/lib/utils/legacy-default-subscriptions.test.ts`
- Verification: The published payload shape validates with exactly seven top-level keys and 10 canonical communities; focused tests, type-check, lint, and diff checks pass. The suite now contains 55 tests after removing the obsolete compatibility-acceptance test.
- Blockers: none
- Next: The correction is published in `bitsocialnet/lists` commit `48a0ebd`; keep Seedit local and unpushed.
