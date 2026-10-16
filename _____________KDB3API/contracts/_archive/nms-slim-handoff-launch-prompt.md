# Launch prompt — slim nativeMultiSelect dest-write + remaining product handoff

**Status: DONE 2026-08-16.** WP-SLIM + widget layout keepers + PO Cognos green.
Next agent: `contracts/futureTodo/post-nms-slim-futuretodo-launch-prompt.md`.
Do **not** redo this slim.

Paste into a **fresh** agent chat. Planner + Composer 2.5 implement/review + Grok cross-review.
PO = vastenburg. Tests in Cognos. Module Contract First.

Do **not** continue the previous chat’s overdesign. Re-read live files.

---

COMPLEX TASK — KDB3: (A) slim the nativeMultiSelect tab-MOVE dest-write to the
same dest-by-name pattern already used by dienststelle / singleSelect / NMS SET;
(B) keep the small widget layout fixes; (C) then Cognos; (D) record what is
still open (history, parameterSet gaps, folder grouping). Behaviour-correct
for A/B only — not a product feature run.

Project root:
`c:\Users\vastenburg\OneDrive - XTENTION INFORMATIONSTECHNOLOGIE G.m.b.H\Desktop\KDB2\REDESIGN 2026.05`
Target: `_____________KDB3API/`
Branch: `tabs`. Do **not** push. Commit only if PO asks.

AUTHORITY (highest first):
- architecture/stateOwnership.md
- architecture/projectStructureRules.md
- _____________KDB3API/.cursor/rules/ (do not edit .mdc)
- contracts/writeback.md
- contracts/tabs-tabCrud-contractdelta.md
- contracts/nativeMultiSelect.md (live owner; `pageContextPlain` is gone)
- contracts/dienststelle-tabMutation-contractdelta.md (dest lookup pattern)
- contracts/singleSelect-tabMutation-contractdelta.md (dest match by semantic key on dest scope)
- contracts/futureTodo/parameterSet-tabMutation-consolidation-refactor-prompt.md
  (WP0–WP8 status — do not redo)

---

## 0. Working tree (read this first)

Uncommitted mix on `tabs` (do not treat as one commit):

- WP4–WP8 cleanup (content-create shared dispatcher, NMS `stripTabpanel` +
  `tabMutationRun` wrap, docs). Behaviour-neutral. Folders were **not** moved.
- A **bugfix attempt** for Cognos: tab-move page-kale empty; SET empty page kale;
  widget x,y on tab gamma. The NMS part of that attempt is **overdesigned**.
  Slim it before Cognos. Do not commit the overdesign.

Live owner is `dashboard/filters/nativeMultiSelect/`. v3 key stays `filt.pcfs`.

---

## 1. What was wrong vs what other filters already do

**Bug (real):** kale host `itemId`s are per-tab. Tab-MOVE cleared source by
itemId (correct), then wrote the snapshot onto the dest scope **still using the
source itemId**. Dest lookup missed → dest-skip + warn → page kale empty.
Global kale was never mutated (correct); Cognos still shows it on every tab.

**Solution that already existed** (do not invent a fourth matching engine):

| Owner | Dest write identity |
|---|---|
| dienststelle | `lookupScopeFilterApi(filterKey, destScopeId)` — **name/key + dest scope** |
| singleSelect | `matchTarget(instances, destScopeId, source)` — **semantic key on dest scope**, then write the **dest instance id** |
| nativeMultiSelect SET | `parameterSetHostApply.applyByName` → `lookupNativeMultiSelectApiByName(nm, destScope)` |

Tab-mutation NMS must do the same as SET dest write: **name + dest scope**,
then persist the dest host’s live `itemId` in `byScope` so resync works.
Source **clear** stays itemId + source scope.

Do **not** call `parameterSetHostApply` from tab-mutation (that emits SET
`SKIPPED` / `RESTORE_FAILED` codes). Use `lookupNativeMultiSelectApiByName` +
existing `replaceFilterContext` / `applyHostItem`. Dest-skip stays skip+warn,
`ok: true`, no host create, no `TABS_MUTATION_APPLY_FAILED` on missing dest.

**Scope handling that already existed** (do not duplicate):

- NMS `tabMutationSupport.resolveScopeIdForSlot` + `stripTabpanel` — skip
  `"global"` on tab-CRUD (same intent as DS/SS page-only permutation).
- Lookups already compared `stripTabpanel(getFilterScope) === stripTabpanel(scopeId)`.
- DS uses `normalizeScopeId` (`_tabpanel` strip). SS uses `normalizeCognosScopeId`
  and GET **rejects** alias-only evidence (`singleSelectCollectorScope.js`:
  `evidence !== "liveScope"` → skip). Do **not** add a NMS layout-alias matcher
  that SS explicitly forbids on GET.

**NMS dest-miss vs DS/SS:** NMS cannot create kale items → dest-skip.
DS/SS dest-miss is apply-fail. Do **not** flatten that.

---

## 2. Overdesign to revert (mandatory WP-SLIM)

Added in the previous chat and **not** uniform with SS/DS. Remove:

1. **Delete** `nativeMultiSelect/effects/filterScopeMatchesTarget.js`.
2. **Restore** exact `stripTabpanel` equality in:
   - `effects/lookupNativeMultiSelectApi.js`
   - `effects/lookupNativeMultiSelectApiByName.js`
   - `effects/listUnownedNativeMultiSelectItems.js`
   (no layout container/child alias engine).
3. **Restore** GET page collect in `actions/collectWritebackSnapshot.js` to
   `listUnowned(scopeId)` only. No `tabId`/`pageId` retry loop. Identities stay
   `"global|"+nm` vs `String(tab)+"|"+nm`. If GET page entries are still empty
   after dest-by-name MOVE works, diagnose against saved JSON — do not
   pre-emptively add alias fallbacks.
4. **Slim** `actions/applyTabMutationScopeOps.js` to the dest-by-name write +
   dest itemId in reducer + resync by dest id/name. No extra `resolveDestItem` /
   `applyFilterApi` ceremony unless it stays clearly smaller than the current
   file. Target: dest write is a small change to the previous ~73-line file,
   not a new matching subsystem.
5. **Rewrite** the 2026-08-16 dest/GET as-built notes in
   `contracts/nativeMultiSelect.md` (and the footnote on
   `pageContextPlain-tabMutation-contractdelta.md`) so they describe dest-by-name
   only — not `filterScopeMatchesTarget` / GET alias retry.

Keep lookups as **two files** (itemId vs name). Do not merge.

Line budget: JS ≤150, orchestrator ≤120, controller fn ≤60, ≤10 AMD imports.
No `helpers/` `common/` `misc/` `shared/` folders. No new `_KDB.*`.

---

## 3. Widget layout fixes — KEEP (separate bug, small)

Not NMS. Keep these if still present and still small:

- GET `collectWidgets.js`: `mergeDomLayoutIntoFrame` before `buildWidgetObject`
  (same helper `serializeWidgetFrame` already uses).
- SET/duplicate `placeSerializedWidgetEntry.js`: re-apply `{x,y,width,height}`
  **after** `contentCreate`, before `placeControls`. Layout-apply failure =
  degraded diagnostic, not structural abort. Units stay px.
- Drop `handleDropCreate.js`: `PLACE_ON_CANVAS_SUCCEEDED` may include `tabId`
  from the route (reducer already accepts it). Do not add AMD imports
  (`handleDropCreate` is already over the 10-import cap — pre-existing).

Do **not** touch canvas-discovery
(`readCanvasDiscoverySources` / `discoverCanvasWidgets` / `waitForScopedShells`).

---

## 4. Cognos (PO) — after WP-SLIM, before any cleanup/product

Dashboard with 3 tabs: page kale option1 / option2, **global** kale option3.

- Tab **move**: page selections follow content; global stays option3 on every tab;
  page kale not empty.
- Tab delete / duplicate: page kale follows content when dest host exists.
- `set(get())`: `filt.pcfs` has page entries (`tab: 0/1`) **and** global (no `tab`);
  vis/txt on gamma at saved x,y; sicht, dstl, sels also round-trip.
- History undo/redo only for owners that already participate (see §6). Kale
  values have **no** history module — do not expect undo of pcfs.

---

## 5. GET/SET pipeline status (update of earlier PO table)

| Onderdeel | GET/SET |
|---|---|
| Canvas, settings | live |
| Header / footer (zonder icoon) | live |
| Tabs (namen, zichtbaarheid, hidden tabs) | live |
| Widgets `"vis"` en `"txt"` | live; **x,y after SET** just patched — Cognos open |
| `filt.sicht` | live |
| `filt.dstl` Dienststelle | live |
| `filt.sels` single-select (globaal + page-context) | live |
| `filt.pcfs` kale page-context **and global** | code in (P2 global GET/SET 2026-08-15); **Cognos smoketest still open**; tab-MOVE dest-write must be slimmed first |

Global kale **without tab** is **in** `filt.pcfs` (P2). Tab-CRUD still does **not**
permute global. The older “global kale later” note is stale for GET/SET; it
remains true for tab-CRUD.

### Expres níet in de huidige pipeline (product, not missing glue)

- v2-import: `writebackMap` skeleton; v2 → `WRITEBACK_UNSUPPORTED_LEGACY_FORMAT`
- `tbl` / `topn` widgets, `widget-localFilters`, launchpad-only widgets
- Special/multi-filters outside `sels` and `pcfs`
- status `"sichtChange"` (rejected)
- Header-icoon (`head.icon`)
- `classifyFilterInstance` `HOST_ITEM_UNKNOWN` silencing (accepted leftover)

---

## 6. History undo — where it exists vs missing

History commits belong in owner `history/` (already the pattern) or
`effects/commit*History.js`. **Do not** invent `history/` inside an owner that
has no history files. historyService never writes owner state.

| Owner | Undo/redo today |
|---|---|
| `historyControls` + `historyService` | chrome + stack |
| `singleSelect` | yes (`filters/singleSelect/history/`) |
| `dienststelle` | yes (`filters/dienststelle/history/`) |
| `sicht` | yes (`filters/sicht/history/`) |
| `header` / `footer` | yes (no icon) |
| `kdbControl` | yes |
| `widgetBase` | yes (drop / layout / launchpad transfer) |
| `widgetSettings` | yes |
| `widgetText` | yes |
| `widgetVis` | **no** `widgetVis/history/` — vis identity/binding is restored via settings/vis apply paths; check live if user vis-option undo is settings-owned |
| `tabs` | **no history frames** (D-CRUD-2; `tabs-tabCrud-contractdelta.md` §16). Delete/move/duplicate are not undoable. Later `tabs-history-contractdelta.md` (move first) is futureTodo |
| `nativeMultiSelect` | **no history**. P0 contract: no history/events. Kale value undo is product work, not a missing file in the current module |
| `specialSingleSelect` | SET sync only; no GET; no generic popup/history |

Parameter restore / tab-mutation already use `skipHistory: true`. Do not add
kale or tab-CRUD history in this run.

---

## 7. Folder grouping (`actions/parameterSet/`, `actions/tabMutation/`, `history/`)

Preferred layout remains `config/ state/ view/ effects/ adapters/ events/`.
Extra folders only with real content, named by responsibility — never
`helpers/` `common/` `misc/` `shared/`.

**Approved to propose, PO gate before moving:**

- `actions/parameterSet/`
- `actions/tabMutation/`
- `effects/parameterSet/` only if effects are parameterSet-specific

**Do not** create `history/` inside a filter owner unless that owner already
owns history files (SS/DS/sicht already have `history/`; NMS does not).

WP6 **explicitly did not move** NMS `actions/` (still flat). SS/DS `actions/`
are also still flat (parameterSet* and *TabMutation* mixed in one folder).
That regroup is leftover cleanup, **not** required for the dest-write bug.

Shared tabMutation kernel already lives at
`KDB3/js/core/utils/filters/tabMutationRun/` (stateless AMD, **not** on
`_KDB.utils` / api / services). Do not add a second kernel or a
`_KDB.services.tabMutation`.

Do **not** start folder moves until: WP-SLIM + Cognos green, working tree
clean on those paths, **explicit PO GO**.

Cleanup WP0–WP8 status: see
`contracts/futureTodo/parameterSet-tabMutation-consolidation-refactor-prompt.md`.
WP5 was **not** merged (restore-batch ≠ seed). Do not reopen WP5.

---

## 8. Process

1. Composer 2.5: WP-SLIM (revert overdesign, keep dest-by-name + widget layout).
2. Composer initial review + Grok cross-review + planner final.
3. STOP for PO Cognos (§4).
4. Only after green Cognos and PO GO: optional folder regroup (separate WP).
5. Product leftovers (§5) stay futureTodo — do not start in this chat.

FORBIDDEN without PO: new `_KDB.*`, writebackMap, tbl/topn, sichtChange,
header icon, kale history, tab-CRUD history, canvas-discovery edits, `.mdc`
edits, mixing SET diagnostic codes into tab-mutation.

SUCCESS for this chat: dest write is a small name+scope change uniform with
DS/SS/NMS-SET; extra matching files gone; widget layout keepers still small;
PO can smoketest MOVE + set(get) without a new abstraction layer.
