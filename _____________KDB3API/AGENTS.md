# KDB3 — notes for coding agents

KDB3 is an IBM Cognos Analytics dashboard extension. Production code is `KDB3/js/**` (AMD modules, no build step; entry `KDB3/js/KDB.js`).

Read first: `.cursor/rules/core.mdc` (the rules every change must follow). Topic rules in `.cursor/rules/` cover module structure, public APIs, state, runtime, events, error handling, DOM, the Cognos adapter, naming and AMD. Human-oriented summary: `architecture/projectStructureRules.md`.

Before a PR, run from the repo root:

- `node tools/check-all.mjs` (must pass)
- `node tools/line-report.mjs` (file size report)
- manual Cognos checks from `tools/smoke-checklist.md` for the areas you touched

Do not change the frozen external contract (`KDB3/spec.json`, extension entry points, saved parameter sets v2/v3, settings/storage formats, `_KDB.api.*` / `_KDB.services.*` names, event names) without a written note in the PR and explicit review.
