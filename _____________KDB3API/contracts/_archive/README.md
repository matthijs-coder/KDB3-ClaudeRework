# Contracts archive

Finished or superseded contract documents, moved here in Phase 0 of the KDB3 cleanup refactor.

- Contents: per-change `*-contractdelta.md`, `*-execution-spec.md` and `*-fix-spec.md` work orders, port reports, agent hand-off and launch prompts (including those formerly in `futureTodo/`), two architecture design reviews, and the Dutch `overdracht/` writeback hand-over.
- Why: the contract-per-change workflow is retired. Living contracts in `../` describe the current behaviour.
- Everything here is historical only. Do not implement against it. History is preserved (`git log --follow <file>`).
- Layout is flat. `overdracht/` is a subfolder because its `writeback.md` would be confused with the living `../writeback.md`.
- Contract deltas still cited from JS comments (and the templates still referenced by `.cursor/rules/`) stayed in `../` and move here when those references are rewritten.
