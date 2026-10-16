# Execution Spec: take-from-launchpad page target with DOM guard (WP-P A1)

> Mechanical spec for Grok 4.6. Architecture lives in `widgetBase-parameterSetRestore-dropboxTarget-contractdelta.md` §4 + §4A (**Approved**, amended A1, PO vastenburg 2026-10-06). Do **not** re-decide: D1 central, D2 warn / no hard fail, D-P1 (DOM check in the view, not in `actions/`).
> No harness. Production tree only: `_____________KDB3API/KDB3/js/**`.
> One writer. Exclusive allowlist. Echo Section A before editing.

---

**Status:** `Executed` — review PASS 2026-10-06; Section K live pending
**Authoring AI:** Cursor coordinator, 2026-10-06
**Executing AI:** grok 4.6 (W2)
**Reviewer:** coordinator + grok 4.6 review + PO Cognos

---

## Exclusive allowlist

**May edit:**

- `KDB3/js/dashboard/widgets/widgetBase/actions/handleTakeFromLaunchpad.js` (uncommitted WP-P version in the working tree — build on it, do not revert it)
- `KDB3/js/dashboard/widgets/widgetBase/view/placeWidgetOnCanvas.js`

**Must not edit:** everything else — incl. `placeSerializedWidgetEntry.js`, `handleDropCreate.js`, tab-mutation / history / replay files, `tabs/**`, `dragDrop/**`, `writeback/**`, `loadingService/**`, CSS, contracts, `.mdc`. No commit/push.

## Section A. Pre-flight read list

Echo one sentence per row before editing.

1. `.cursor/rules/kdb-object.mdc`
2. `.cursor/rules/state.mdc` — no new state.
3. `.cursor/rules/runtime.mdc` — no runtime keys.
4. `.cursor/rules/module-public-api.mdc`
5. `.cursor/rules/events.mdc` — no events.
6. `.cursor/rules/feature-structure.mdc` — actions: no DOM; ≤150 lines.
7. `.cursor/rules/naming.mdc`
8. `.cursor/rules/error-handling.mdc`
9. `.cursor/rules/amd.mdc` — one define, named factory-scope helpers, no nested functions.
10. `.cursor/rules/dom.mdc` — DOM access only in the view.
11. `contracts/widgetBase-parameterSetRestore-dropboxTarget-contractdelta.md` §4, §4A, §5.
12. `contracts/widgetBase-takeFromLaunchpad-pageTarget-execution-spec.md` (WP-P, executed) Section C — the current behaviour of `resolveTakeDropboxId`.
13. Live files (read fully): `handleTakeFromLaunchpad.js` (~80 lines, 7 imports; `resolveTakeDropboxId` at ~42-69), `placeWidgetOnCanvas.js` (~113 lines, 2 imports; `resolveDropboxEl` 24-45). Callers of `placeWidgetOnCanvas` other than the take (e.g. `handleDropCreate.js`) — read only, they must stay unchanged.
14. This spec.

## Section C. Per-file specification

#### `widgetBase/actions/handleTakeFromLaunchpad.js` (edit)

- Imports unchanged (7). `resolveTakeDropboxId` unchanged.
- The `_placeWidgetOnCanvas(...)` request (line ~21) gets one extra field: `fallbackDropboxId: resolveTakeFallbackDropboxId(payload, dropboxId)`.
- New factory-scope helper `resolveTakeFallbackDropboxId(payload, dropboxId)` (no DOM, no state read): returns `payload.tabId` when **all** hold: `payload.dropboxId` is not a non-empty string; `payload.tabId` is a non-empty string; `dropboxId !== payload.tabId`. Otherwise returns `null`. Plain conditionals; no try/catch needed (pure, cannot throw on these inputs) — if the writer adds one, it must log and rethrow.
- Nothing else changes (`succeededPayload.tabId` stays `payload.tabId`; D2 warn in `resolveTakeDropboxId` unchanged).

#### `widgetBase/view/placeWidgetOnCanvas.js` (edit)

- Imports unchanged (2).
- Line 6 `const dropboxEl = resolveDropboxEl(_KDB, request.dropboxId);` becomes `const dropboxEl = resolveTargetDropboxEl(_KDB, request);`.
- New factory-scope helper `resolveTargetDropboxEl(_KDB, request)`:
  1. `const fallbackId = request.fallbackDropboxId;` If it is not a non-empty string, or equals `request.dropboxId` → `return resolveDropboxEl(_KDB, request.dropboxId);` (today's behaviour, every caller without the field).
  2. Inside `try`: `const pageEl = request.dropboxId ? document.getElementById(request.dropboxId) : null; const wrapperEl = document.getElementById(fallbackId);` (guard `typeof document === "undefined"` → treat both as `null`). If `pageEl && wrapperEl && wrapperEl !== pageEl && wrapperEl.contains(pageEl)` → `return resolveDropboxEl(_KDB, request.dropboxId);`
  3. Otherwise: `console.warn("[widgetBase.placeWidgetOnCanvas] page not mounted in tab; placing in tab container", { widgetId: request.widgetId, tabId: fallbackId, pageId: request.dropboxId });` → `return resolveDropboxEl(_KDB, fallbackId);`
  4. `catch (err)`: `console.error("[widgetBase.placeWidgetOnCanvas] page guard failed", { widgetId: request.widgetId, tabId: fallbackId, pageId: request.dropboxId }, err); return resolveDropboxEl(_KDB, fallbackId);` — PO-approved D2 conversion (no hard fail), an explicit exception to the `error-handling.mdc` rethrow default; do not rethrow, do not stop to ask.
- `resolveDropboxEl` itself unchanged. Ids compared with raw `===`.
- Line target ≤135 (hard 150; if over 135, stay ≤150 and report).

**Rules to apply:** `amd.mdc`, `naming.mdc`, `error-handling.mdc`, `dom.mdc`, `feature-structure.mdc`, `module-public-api.mdc`.

## Section J. Acceptance (self-verification)

1. Two files changed per allowlist; nothing else.
2. Action file: no DOM access, no new import (7), `resolveTakeDropboxId` byte-identical, fallback helper per Section C.
3. View: callers without `fallbackDropboxId` behave exactly as before (show the unchanged path); guard order 1–4 exact; warn text exact; no new import (2).
4. Walk-through (reading, file:line): (a) restore step 24 — page mounted inside wrapper → page; (b) tab mutation shift onto a slot whose page is not in the DOM → wrapper + warn, no `WIDGET_BASE_DROP_FAILED`; (c) `payload.dropboxId` given (canvas-drop redo) → `fallbackDropboxId: null`, view path unchanged; (d) no distinct page (D2) → `dropboxId === tabId` → `fallbackDropboxId: null`, unchanged; (e) rule-2 passthrough (`payload.tabId` already a page id) → `fallbackDropboxId: null`, unchanged; (f) user drop (`handleDropCreate.js:40`, no field) unchanged.
5. `node --check` on both files.
6. Report: Section A echoes, line + import counts, diff summary, deviations, Section J pass/fail.

## Section K. Live acceptance (PO)

1. Restore `oude parameterset.txt` as before: restored shells on tabs 2..n sit in that tab's page (`…_00000004`-style), positions as on tab 1 (unchanged from WP-P K.1-K.3).
2. Tab duplicate and tab move with widgets (incl. onto tabs never opened before): no `WIDGET_BASE_DROP_FAILED`, no rollback; widgets on the right tab. A `page not mounted in tab` warning is acceptable for never-opened slots; report how often it shows.
3. Delete + restoreDeleted, undo/redo of move and of a launchpad transfer: widgets land on the right tab.
4. Together with WP-Q: no hanging "Registerkarte wird geladen".

## Section L. Forbidden

Editing any other file; DOM access in the action file; changing `resolveDropboxEl`; hard-failing on a missing page; writing `pageId` into widget state; new imports; commit/push; improvising (stop and report).

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-10-06 | — → `Draft` | — | Written from delta §4A (A1 + D-P1 view guard). |
| 2026-10-06 | `Draft` → `Ready for execution` (pending go) | coordinator | Grok 4.6 spec review PASS; NITs (J wording, rule-2 walk-through, line budget note) patched. |
| 2026-10-06 | `Ready for execution` → `Executed` (live pending) | PO go; W2 grok 4.6 | 2 files (89/7, 132/2), `node --check` ok, J a–f pass. Independent review PASS. Coordinator read both diffs. Committed by PO in `049d740`. |
