# KDB3 — notes for coding agents

KDB3 is an IBM Cognos Analytics dashboard extension. Production code is `KDB3/js/**` (AMD modules, no build step; entry `KDB3/js/KDB.js`).

Read first: `.cursor/rules/core.mdc` (the rules every change must follow). Topic rules in `.cursor/rules/` cover module structure, public APIs, state, runtime, events, error handling, DOM, the Cognos adapter, naming and AMD. Human-oriented summary: `architecture/projectStructureRules.md`.

Before a PR, run from the repo root:

- `node tools/check-all.mjs` (must pass)
- `node tools/line-report.mjs` (file size report)
- manual Cognos checks from `tools/smoke-checklist.md` for the areas you touched

Do not change the frozen external contract (`KDB3/spec.json`, extension entry points, saved parameter sets v2/v3, settings/storage formats and persisted keys, `_KDB.api.*` / `_KDB.services.*` names, event names) without a written note in the PR and explicit review.

Shared helpers live in the kit (`KDB3/js/core/utils/kit/`); use them instead of local copies.

Phase 1 refactors do not edit `KDB3/js/KDB.js` or `KDB3/js/core/services/__orchestratorServices.js`. When you move or merge a file that is imported from outside its module (find these with `node tools/check-imports.mjs --json` or grep), keep the old path as a one-line shim until Phase 2.

Cognos stays in three separate rings (`core/cognosAPI`, `core/services/cognosHost`, `core/cognosHost`); do not merge them: the pure Cognos wrappers stay isolated and usable on their own, so Cognos upgrades stay contained.
