# Execution Spec: take-from-launchpad places shells in the tab's page (WP-P)

> Mechanical spec for Grok 4.7. Architecture lives in `widgetBase-parameterSetRestore-dropboxTarget-contractdelta.md` (**Approved**, PO vastenburg 2026-10-06). Do **not** re-decide D1 (central), D2 (warn, no hard fail) or D3 (no z-index change).
> No harness. Production tree only: `_____________KDB3API/KDB3/js/**`.
> One writer. Exclusive allowlist. Echo Section A before editing.

---

**Status:** `Executed` — review PASS-WITH-NITS 2026-10-06; Section K live pending (spec review: 1 MUST-FIX + 6 NITs patched before execution)
**Authoring AI:** Cursor coordinator, 2026-10-06
**Executing AI:** grok 4.7 (W1)
**Reviewer:** coordinator + grok 4.7 review + PO Cognos

---

## Exclusive allowlist

**May edit:**

- `KDB3/js/dashboard/widgets/widgetBase/actions/handleTakeFromLaunchpad.js`

**Must not edit:** everything else — incl. `placeWidgetOnCanvas.js`, `placeSerializedWidgetEntry.js`, `handleParameterSetRestore.js`, any tab-mutation / history / replay file, any `tabs/**`, `dragDrop/**`, `writeback/**`, CSS, contracts, `.mdc`. No commit/push.

## Section A. Pre-flight read list

Echo one sentence per row before editing.

1. `.cursor/rules/kdb-object.mdc`
2. `.cursor/rules/state.mdc` — no new state; read tabs only via `_KDB.api.tabs.getState()` (dispatch-style snapshot, precedent `widgetBase/effects/waitForScopedShells.js:121-138`); never read `_KDB.state.tabs` directly.
3. `.cursor/rules/runtime.mdc` — no runtime keys.
4. `.cursor/rules/module-public-api.mdc`
5. `.cursor/rules/events.mdc` — no events.
6. `.cursor/rules/feature-structure.mdc` — ≤150 lines.
7. `.cursor/rules/naming.mdc` — `_` prefix only on boundary inputs.
8. `.cursor/rules/error-handling.mdc`
9. `.cursor/rules/amd.mdc` — one define, named factory-scope helpers, no nested functions.
10. `.cursor/rules/dom.mdc` — no DOM access in this file (actions/).
11. `.cursor/rules/cognos-adapter.mdc` — no host access.
12. `contracts/widgetBase-parameterSetRestore-dropboxTarget-contractdelta.md` §2, §4, §5.
13. Live files: `handleTakeFromLaunchpad.js` (51 lines, 7 imports), `widgetBase/view/placeWidgetOnCanvas.js:24-45` (`resolveDropboxEl`, read only), `widgetBase/effects/waitForScopedShells.js:121-138` (tabs read precedent), `tabs/state/buildTabTargets.js`. `getState().tabTargets` entries are `{ tabId, pageId, visible }` only (no `scopeId`); `getState()` returns `undefined` when tabs is disposed.
14. This spec.

## Section C. Per-file specification

#### `dashboard/widgets/widgetBase/actions/handleTakeFromLaunchpad.js` (edit)

- **Imports:** unchanged (7). No new import.
- **Line 20** `const dropboxId = payload.dropboxId || payload.tabId;` becomes
  `const dropboxId = resolveTakeDropboxId(_context._KDB, payload, widgetId);`
- Nothing else in `handleTakeFromLaunchpad` changes. In particular `succeededPayload.tabId` keeps `payload.tabId` (tab identity, not the page).
- **New factory-scope helper** `resolveTakeDropboxId(_KDB, payload, widgetId)` (function declaration at AMD factory scope, directly below `handleTakeFromLaunchpad`):
  1. `if (typeof payload.dropboxId === "string" && payload.dropboxId !== "") { return payload.dropboxId; }` — before any `getState()` call.
  2. `const tabId = payload.tabId;` — if not a non-empty string: `return tabId;` (unchanged behaviour: placement fails downstream as today; no warn).
  3. Inside `try`: `const state = _KDB.api && _KDB.api.tabs && typeof _KDB.api.tabs.getState === "function" ? _KDB.api.tabs.getState() : null;` `const tabTargets = state && state.tabTargets ? state.tabTargets : {};` One pass with a plain `for` loop over `Object.keys(tabTargets)` (no `forEach` callback, no nested function). Per entry `t`:
     - if `t && t.tabId === tabId && typeof t.pageId === "string" && t.pageId !== "" && t.pageId !== t.tabId` → `return t.pageId;` (no warn);
     - if `t && t.pageId === tabId && t.pageId !== t.tabId` → `return tabId;` (a real page id was already passed; no warn).
     - An entry with `t.pageId === t.tabId` is **not** a passthrough and returns nothing.
  4. After the loop (no entry, `pageId === tabId`, empty `pageId`, or `getState()` missing / `undefined`): `console.warn("[widgetBase.takeFromLaunchpad] no distinct page for tab; placing in tab container", { widgetId: widgetId, tabId: tabId }); return tabId;`
  5. `catch (err)`: `console.error("[widgetBase.takeFromLaunchpad] page resolve failed", { widgetId: widgetId, tabId: tabId }, err); return tabId;` This is the PO-approved D2 conversion (delta §4.2 / §5), an explicit exception to the `error-handling.mdc` rethrow default for non-boundaries: do not rethrow, do not stop to ask.
  - Compare ids with raw `===`. Do not normalise (no `_tabpanel` stripping), do not read `scopeId` (absent on this projection).
- Lines target ≤ 120 (hard 150).
- **Rules to apply:** `amd.mdc`, `naming.mdc`, `error-handling.mdc`, `state.mdc`, `module-public-api.mdc`, `feature-structure.mdc`.

## Section J. Acceptance (self-verification)

1. One file changed per allowlist; nothing else.
2. Line 20 replaced; `resolveTakeDropboxId` at factory scope with try/catch; no nested functions; no new import (still 7); `succeededPayload.tabId` unchanged.
3. Rules 1–5 of Section C exactly: `dropboxId` returns before `getState()`; distinct page returned without warn; real page id passthrough only when `t.pageId !== t.tabId`; `pageId === tabId` entry → warn + `tabId`; `getState()` missing/`undefined` → warn + `tabId`; catch logs + `tabId`, no rethrow.
4. `node --check` on the file.
5. Report: Section A echoes, line count, import count, diff summary, deviations, Section J pass/fail.

## Section K. Live acceptance (PO)

Fresh load, restore `oude parameterset.txt` as before (context top), then click each visible tab and run the console table check from 2026-10-06:

1. Every restored shell's `parent` is that tab's page (`…_00000004`-style child id), not the tab wrapper; positions inside the canvas as on tab 1.
2. kdbControl not covered by restored widgets (D3 retest: also select a widget that overlaps the control area, if any).
3. Restore result phases unchanged; `widgetBaseRestore` ok.
4. Duplicate or move a tab with widgets onto a slot whose `getState().tabTargets` entry has `pageId !== tabId`: parent is that `pageId`; the widget's `frame.tabId` stays the tab id. If that entry has `pageId === tabId`, the D2 warning is expected and the parent stays the wrapper.
5. Delete a tab with widgets, restore it, and undo/redo a launchpad transfer. Tab delete and restore rebuild on the slot's own stock and do not take a shell across tabs (`tabs-tabMutation-rebuildOnSlotStock-contractdelta.md` §1, live 2026-10-07). Launchpad-transfer undo/redo still uses a tabId-only take and follows the page rule. Canvas-drop redo is unchanged (passes `dropboxId`).
6. No `no distinct page for tab` warning for normal tabs.
7. Known risk: a distinct `pageId` whose page node is not in the DOM makes `placeWidgetOnCanvas` return `WIDGET_BASE_DROP_FAILED` (today the wrapper would be used). Watch for this on tabs never opened before the action; report it, do not work around it.

## Section L. Forbidden

Editing any other file; changing `placeWidgetOnCanvas.js` / `resolveDropboxEl`; hard-failing when no page exists; writing `pageId` into widget state; reading `_KDB.state.tabs` or tabs internals; DOM queries in this file; new imports; z-index / CSS changes; commit/push; improvising (stop and report).

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-10-06 | — → `Draft` | — | Written from Approved delta (D1 central, D2 warn, D3 retest). |
| 2026-10-06 | `Draft` → `Ready for execution` (pending go) | coordinator | Grok 4.7 spec review PASS-WITH-FIXES; MUST-FIX + NITs patched; known risk K.7 recorded. |
| 2026-10-06 | `Ready for execution` → `Executed` (live pending) | PO go; W1 grok 4.7 | Only `handleTakeFromLaunchpad.js` changed (79 lines, 7 imports, `node --check` ok). Independent review PASS-WITH-NITS (loop name `t` kept as specified; unrelated working-tree files: contracts + PO version string in `KDB.js`). Coordinator diff check ok. |
