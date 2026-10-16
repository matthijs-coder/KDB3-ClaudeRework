# Structure Audit Rubric (KDB3)

> Read-only audit criteria for reviewing structural weaknesses in `_____________KDB3API/KDB3/js/**` (a Cognos-dashboard extension). Used by the structure-audit lead + its per-module investigation subagents so findings are consistent and comparable. This is an **audit** rubric — it produces findings, not fixes. Criteria are anchored on `architecture/projectStructureRules.md` and the 10 MUST rules in `.cursor/rules/`.

## Severity
- **P0** — rule violation with correctness/leak/coupling risk (foreign state write, uncleaned runtime, DOM in state, reducer side-effects, raw Cognos host access with upgrade risk).
- **P1** — clear rule/maintainability breach without immediate correctness risk (oversized file, god-controller, duplication, mixed API shape, scattered Cognos calls).
- **P2** — hygiene/consistency (naming, dead/debug code, weak folder names, minor bloat).

## Dimensions (flag per file, cite `file:line`)

1. **File size** — flag files over the limits (`projectStructureRules.md`: JS executable target 80–120, hard 150; orchestrator 40–80, hard 120; controller function 20–40, hard 60; config 150–250). Note over-limit files + concrete split candidates. `KDB.js` bootstrap exception up to 500 wiring-only lines.
2. **Orchestrator vs controller** — orchestrator must be wiring-only (no business logic/reducer/listener bodies). Controller (`create<Module>Controller.js`) *may* have multiple methods — that is intended. Flag the real anti-pattern: a **god-controller** that inlines logic instead of delegating to named helpers under `state/ view/ effects/`, or business logic hidden in inline/nested callbacks.
3. **Cognos isolation / adapter layer** — the isolating layer is `_KDB.services.cognosHost` (`core/services/cognosHost/`). Inner ring `core/cognosAPI/` is an allowed caller of `__getDashboardAPI()` (layer-1 internal) and **must** use it. Finding = a *feature* file outside ring 1 and outside layer 1 calling `_KDB.cognosAPI.*` or `__getDashboardAPI()`, except the exceptions register (PDF capture root) and `KDB.js` boot/teardown. A per-module `create*Adapter` wrapping `_KDB.cognosAPI` is a finding, not a fix. Tabs wrapping the injected `tabs` facet is OK. This is the Cognos-upgrade-resilience check: Cognos change should touch ring 1, not feature modules.
4. **State vs runtime** — DOM nodes / jQuery / listeners / AbortControllers / promises / Cognos handles in `_KDB.state` (should be `_KDB.runtime.<owner>`); live DOM in `_KDB.elements` (selectors only). Every listener/subscription/observer/timer/abortController must have a cleanup path in `destroy`; flag leaks.
5. **Foreign state writes** — a module writing another module's `_KDB.state.<subtree>` directly instead of via the owner's public API/dispatch. (P0.)
6. **Public API shape** — mixed shape on one surface (dispatch + named commands), ad-hoc `read*` on `_KDB.api.<module>` bypassing selectors, missing `_isDisposed` guard or a guard that `throw`s.
7. **Reducer purity** — reducers doing DOM/Cognos/events/history/async; effects writing foreign state.
8. **Duplication & namespaces** — repeated logic across files/modules; helpers copied instead of using `_KDB.utils`; Cognos vocabulary duplicated instead of `_KDB.cognosAPI`; forbidden legacy namespaces (`_KDB.utilities`/`_KDB.generalFunctions`/`_KDB.dropdownOptions`); ad-hoc top-level keys (`_KDB.cache`/`tmp`/`shared`).
9. **AMD hygiene** — inline/nested subfunction definitions inside the entry function/callbacks (extract to factory-scope helpers); multiple `define`; CommonJS mixing; >6 imports (smell) / >10 (restructure).
10. **Events** — hardcoded event-name string literals instead of constants from the emitter's `events/eventNames.js`; fact-events without a consumer (pollution); request-events where a direct API call fits; subscriptions without teardown; events not in `eventSubscribe.md`.
11. **Naming** — mixed-language/Dutch-German technical identifiers; vague folders (`helpers/common/misc/manager/shared/stuff`); weak verbs (`handle/do/process/manage`); lifecycle terms outside `lifecycleVocabulary.md`.
12. **Contract drift** — code diverged from its `contracts/<module>.md` (public API / state subtree / events / ownership no longer match).
13. **Dead / debug code** — `console.log` and temporary dev/debug code; unused exports/branches.
14. **Over-defensiveness / bloat** — mechanical `try/catch` around local sync code with no boundary; redundant guards; needless abstraction inflating line count.
15. **Cross-module consistency** — do modules follow the same folder layout (`config/ state/ view/ effects/ events/`) and the same conventions? Flag divergence. `adapters/` is optional; do not require it for Cognos isolation (that is `_KDB.services.cognosHost`).

## Finding format (per item)
`<dimension> | <severity> | file:line | one-line description | suggested action | est. line reduction (if applicable)`

Behavior-preserving note: suggested actions must be structural/cleanup only — no functional change. Anything that might alter behavior is flagged as "needs discussion", not "fix".
