# Contract Delta: writeback GET visible-dashboard collect

> GET no longer clicks or persists **content** from hidden dashboard slots.
> `tabs[]` still emits the hidden tail as `{ name, hide: 1 }` (PO choice B).
> Amends `writeback.md` §2.1 / §4.4 / §6.4 / §9 and `tabs-writeback-readiness-contractdelta.md` §11.

---

**Status:** `Implementing` — review REDs closed 2026-08-30; GO from coordinator after army green+fixes
**Parent:** `contracts/writeback.md` §2.1, §4.4, §4.6, §6.4, §9;
`contracts/tabs-writeback-readiness-contractdelta.md` §11
**Type:** `core service contract delta`
**Authoring AI:** Cursor Grok 4.6 (captain), 2026-08-30
**Reviewed by:** PO vastenburg — product answers 2026-08-30: visible = `tab.visible === true`; hidden content not collected; `tabs[]` keeps `hide: 1` shells; contract first
**Related:** F6 SET post-restore (`visibleDashboard` only); `tabs-tabCrud-contractdelta.md` §2.2 / §3.1 (contiguous prefix; delete = park + clear, not hide-keep)

---

## 1. Purpose

`WBParameterGetFunction` / `writebackGet.collect()` currently walks every
dashboard-role slot (`allDashboard` + `includeHiddenDashboardTabs: true`).
That matches the old GET contract and causes a Cognos click-through of unused
hidden tail slots.

Product: hidden slots are the unused prefix-tail, not extra workspaces.
Delete already parks widgets and clears that tab’s filters. GET must not
treat hidden slots as content-relevant.

This delta splits three layers that the June 2026 sentence “hidden tabs are
writeback-relevant” had collapsed (shells + content + click). KDB2 GET already
emitted every physical slot plus a `visible` flag and **never** clicked hidden
tabs (`wbParameterGetTabsHelpers.js`; `moveToFirstTabAndBack` was a Save-button
hack, not collect). F6 “harmless all-slots click” was SET step-28 drift, not
the GET origin. Only shells remain justified (positional `tabIdx`, five fixed
slots). Content and hidden clicks are not.

---

## 2. PO decisions (2026-08-30)

| # | Choice | Decision |
|---|---|---|
| 1 | “Active tabs” | **`tab.visible === true`**. Not `activeIndex`. Contiguous visible prefix; hidden at the tail (`tabs-tabCrud` §2.2). |
| 2 | Hidden-tab widgets / page-filters | **Do not collect.** Skip-by-design, not a diagnostic requirement. |
| 3 | `tabs[]` shells | **B.** Still emit every dashboard-role slot. Hidden → `{ name, hide: 1 }`. Read from tabs state. **No click.** |
| 4 | GET traverse | **`scope: "visibleDashboard"`**, `includeHiddenDashboardTabs: false`, `restoreActiveTab: true`. Helper still excluded. |
| 5 | `wgts.tab` / `filt.*.tab` | Still the index into full `tabs[]` (dashboard-role order). Visible-only collect does **not** renumber. Hidden indexes simply have no content rows. |
| 6 | SET omission (filters) | Hidden page-`filt` absent from a **new** GET payload is **skip-by-design**, not restore-by-omission. Do not clear hidden kale / sels / dstl just because GET omitted those rows (decision 8). |
| 6b | SET omission (widgets) | Live SET **step 9 still parks every owned on-canvas widget**, including on hidden tabs. That is existing reset, not a GET-omit side effect. A new GET payload that lists no hidden `wgts` simply does not put those widgets back — they stay launchpad stock. Do **not** change step 9 in this WP. Unrouted Cognos leftover shells on never-activated hidden pages stay there (GET no longer clicks them); leftover-hide CSS already covers that. |
| 7 | Old payloads | Unchanged photo-per-position (`tabs-tabCrud` D-CRUD-3). If a saved set still has hidden-tab `wgts` / page-`filt`, SET steps 18/23 still activate those tabs. |
| 8 | Filter clear pairing | Clear **global + visible page scopes + any hidden `tabIdx` this payload actually names** in page-`sels` / `pcfs` / `dstl.byTab`. Hidden scopes not named stay untouched. A `tabIdxToScopeId` shrink at the SET call site is **not enough**: live dienststelle and singleSelect clears ignore that map. Those owners must honor the same allow-list from the payload. |
| 9 | PDF / tab mutation / SET step 28 | Unchanged. |
| 10 | Contract first | This file + parent sentence patches land before JS. |

---

## 3. GET layers

| Layer | Today | After this delta |
|---|---|---|
| Click (`collectWidgets` traverse) | `allDashboard` + hidden | `visibleDashboard` only |
| Content (`wgts`, page `sels` / `pcfs` / `dstl.byTab`) | every dashboard slot | `visible === true` only |
| Shells (`tabs[]`) | all dashboard slots | **unchanged** — all dashboard slots, hidden as `hide: 1` |

`collectTabs` stays an in-memory walk of `listDashboardSlots` / `readOrderedDashboardTabs`. It does not dispatch `tabs/traverse`.

Filter GET stays in-memory / host-enumerate. It does not gain a click loop. It **drops** hidden `tabIdx` when materialising page entries.

---

## 4. Required GET traverse payload

Replaces `tabs-writeback-readiness-contractdelta.md` §11 P0 example:

```js
await _KDB.api.tabs.dispatch({
  type: "tabs/traverse",
  payload: {
    source: "writebackGet",
    scope: "visibleDashboard",
    includeHiddenDashboardTabs: false,
    restoreActiveTab: true,
    waitFor: "canvas",
    timeoutMs: 30000
  }
});
```

`needsTraversal` may skip the click when every **visible** dashboard index is
already in `traversal.traversedIndexes`. A missing **hidden** index must not
force a traverse.

---

## 5. SET pairing (required, same WP)

New GET payloads look like: `tabs[]` length 5 with trailing `hide: 1`, and
no `wgts` / page-`filt` rows for those hidden indexes.

- Tabs restore still applies names + `hide` for the full `tabs[]` (B).
- Surplus-beyond-`tabs[]` stays `WRITEBACK_TABS_SURPLUS_UNTOUCHED`.
- Steps 18/23 activate a hidden tab **only** when the payload actually
  names that `tabIdx` in `wgts` or page-`filt`.
- Filter clear allow-list (decision 8): `global` + `tab.visible === true` +
  hidden `tabIdx`s named in this payload’s page-`filt`. Pass it as
  `allowedClearTabIdxs: number[]` on the existing owner-clear payloads
  (plus full `tabIdxToScopeId` for identity). Do not invent a new tabs API.
  `tabs/resolveFilterScopeTargets` stays the full identity map.
- Live clear sites (all must honor that allow-list):
  - NMS `dashboard/filters/nativeMultiSelect/restore.js` (`parameterSetClear`) `collectScopeIds` — today every
    `tabIdxToScopeId` key. May filter keys at SET dispatch **or** in this file.
  - Dienststelle `dashboard/filters/dienststelle/effects/hostScope/clear.js` (`clearHostFilter`) — today `global` + every
    `listPageContextScopes` id; **`tabIdxToScopeId` unused**. Must skip host
    scopes that map to a hidden unnamed `tabIdx`.
  - SingleSelect `dashboard/filters/singleSelect/restore/clear.js` (`clearInstances`) — today every active
    instance whenever `filt` is present; **`tabIdxToScopeId` unused**. Must
    skip page instances on hidden unnamed tabs.
- Step 9 widget reset stays “all owned on-canvas” (decision 6b). Step 23
  still activates only `tabIdx`s that appear in `wgts`.

---

## 6. Files

**Contract (this WP)**

- `contracts/writeback-get-visibleDashboard-contractdelta.md` (this file)
- `contracts/writeback.md` — §2.1, §4.4, §6.4, §9, §12 item 9
- `contracts/tabs-writeback-readiness-contractdelta.md` §1, §1.1, §5–§7 examples, §11

**GET JS (after PO ack)**

- `KDB3/js/workflows/parameterSet/get/collectors/collectWidgets.js` — traverse payload + visible-only widget emit; `needsTraversal` visible-only
- `KDB3/js/workflows/parameterSet/get/collectors/collectTabs.js` — comment only (still all shells)
- `KDB3/js/workflows/parameterSet/get/collectors/collectDienststelleFilter.js` — `byTab` only visible `tabIdx`
- `KDB3/js/workflows/parameterSet/get/collectors/collectSingleSelectInstances.js` (scope helpers in `collectorSupport.js`) — skip hidden page instances silently (not `SCOPE_TARGET_MISSING`)
- `dashboard/filters/nativeMultiSelect/restore.js` (`collectWritebackSnapshot`) — `collectPageEntries` skip hidden targets

**SET JS — change (decision 8 allow-list)**

- `workflows/parameterSet/set/effects/filters/buildAllowedClearTabIdxs.js` — visible + payload-named `tabIdx`s
- `workflows/parameterSet/set/effects/filters/dispatchFilterClearPhases.js` — pass allow-list into owner clears (do not shrink `tabs/resolveFilterScopeTargets`)
- `workflows/parameterSet/set/effects/filters/runFilterRestore.js` — same allow-list; step 18 still activates payload-named hidden `tabIdx`s
- `dashboard/filters/nativeMultiSelect/restore.js` (`parameterSetClear`) — `collectScopeIds` honor allow-list
- `dashboard/filters/nativeMultiSelect/restore.js` (`parameterSetClear`)
- `KDB3/js/dashboard/filters/dienststelle/effects/hostScope/clear.js` (`clearHostFilter`) — do not clear unlisted hidden host scopes
- `dashboard/filters/singleSelect/restore/clear.js` (`handleParameterSetClear`)
- `KDB3/js/dashboard/filters/singleSelect/restore/clear.js` (`clearInstances`) — skip page instances on hidden unnamed tabs

**SET JS — keep (do not edit in this WP)**

- `KDB3/js/workflows/parameterSet/set/effects/runNormalRestore.js` — step 9 park-all; step 28 `visibleDashboard`
- `KDB3/js/dashboard/widgets/widgetBase/restore.js` (`handleParameterSetReset`) — park all `onCanvas`
- `KDB3/js/workflows/parameterSet/set/effects/runWidgetRestore.js` — step 23 still `includeHidden` for named `wgts.tab`
- `workflows/parameterSet/set/effects/filters/filterRestoreTargets.js` — stay full identity map
- `dashboard/tabs/selectors.js` (`buildTabTargets`) — stay full (every dashboard slot + `visible`)
- `collectFilters.js` / `workflows/parameterSet/get/collectors/collectFilters.js` (filter target resolution) — orchestrator only; no shrink

Do not change PDF traverse, tab-mutation traverse, or `runNewDashboardReset.js` (full-reset branch).

---

## 7. Acceptance

1. `WBParameterGetFunction` does not chrome-click a dashboard tab with `visible !== true`.
2. `v3.tabs` still lists every dashboard-role slot; hidden entries have `hide: 1`.
3. `v3.wgts` / page `filt` rows only reference `tab` indexes whose `tabs[tab]` has no `hide: 1`.
4. `wgts.tab` / `filt.*.tab` still index into the full `tabs[]`, not a compressed visible list.
5. Helper tab still absent from `tabs[]` / content.
6. `set(get())` on a dashboard with 1 visible + 4 hidden empty tails: one visible tab restored, four `hide: 1` shells applied, no hidden click during GET, no hidden-scope kale clear.
7. An old payload that still has hidden-tab widgets still restores via steps 18/23.
8. AMD / 150-line / no new selectors / no `_KDB.cognosAPI` from writeback collectors.

---

## 8. Out of scope

- Changing CRUD hide/delete semantics
- Leftover-widget CSS
- PDF tab walk
- Dropping `hide: 1` from `tabs[]` (rejected; that was A)
- Collecting only `activeIndex`
- `runNewDashboardReset.js` full-reset clears
