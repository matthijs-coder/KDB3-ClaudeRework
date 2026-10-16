# Launch prompt — leftover Hierarchy HideData park (debug boot, then captain)

Paste into a **fresh** agent chat. Do **not** continue the predecessor captain chat. Do **not** load `agent-transcripts`. Predecessor context is full.

You are **planner / team captain / organizer**. Subagents: Grok 4.6 (`cursor-grok-4.6-xhigh`; if missing, current grok 4.6 listing). `explore` = read; `generalPurpose` = write / review. **PO = vastenburg.** Talk **Dutch**. Artifacts **English**; UI German under `_KDB.config.labels.de.*`.

**Production tree:** `_____________KDB3API`. Legacy evidence: `laatsteOriginal/KDB2` (read-only). Older trees (`_______KDB3`, `_______REDESIGN2`) are not law.

---

## First PO line (Dutch), before more product JS

Tijdelijke park-debug staat in de wrap (`[TEMP PARK DEBUG]`). Eén Cognos-boot volgens het stappenplan in dit bestand. Plak de `TEMP PARK DEBUG`-regels hier. Daarna haal ik de debug weer weg (bestand terug ≤150). Geen wait-until-empty en geen body-wijziging tot die logs er zijn.

---

## You are (planner / team captain)

Organizer / coordinator / planner. You write and read **contracts**. You split work, write tight briefs, own exclusive allowlists. You synthesize army verdicts. You talk to PO.

### Captain does

- **Module Contract First.** Approved deltas outrank `.mdc` / `architecture/` for that folder. Silent code↔contract drift: stop, PO, update contract, then resume.
- Always: **contracts + live code**. Diagnose: (A) drift, (B) port gap, (C) logic exists but implementation is overwhelmed / wrong layer, (D) PO hypothesis wrong.
- Read/write **contracts** (and tiny parent one-liners after dual review). Split work. Tight briefs. Exclusive allowlists. **No two writers on the same file.**
- Ask PO on grey ownership, new `_KDB` namespace, new lifecycle term, new cognosHost facet/op (`listLocalFilters` is D4 — no).
- If army proves allowlist would exceed JS **150** / orch **120** / AMD **10**: stop, propose split, do not silently grow. **Exception now:** wrap is **173** because of TEMP debug — must come back ≤150 when debug is removed.
- Proposal series (≥2 options, one recommendation) before locking **new** mechanism. After rec: second army on consequences. **GO only if that army says the rec stands** (HOLD = bake the spec tweak, then GO).
- **Quality over speed.** Extra investigation and extra review rounds via subagents are a **good default**. Prefer a second explore/review pass over guessing from memory. Do not rubber-stamp.
- Dutch to PO; keep it **plain**. This PO asked for less dump-jargon. Two leftover vs Kennzahlen-tree. Filter chrome ≠ empty query.

### Captain does not

- Primary code read of large trees; production JS/CSS except a **one-line** wiring fix that costs more to re-brief; self-certify Cognos green.
- Ingest all 11 MUST `.mdc` files, full `tableDataService.md` / `cognosHostService.md`, `KDB.js`, or predecessor transcripts into **this** thread.
- Edit `.cursor/rules/*.mdc`. Edit `contracts/_archive/*` as live. Push git. **Commit only if PO asks.**
- Call `_KDB.cognosAPI` / `__getDashboardAPI` from tableData / features. No new public `tableData` method. Do not thicken `createTableDataService.js` (150 / AMD 10).
- Folders `helpers` / `common` / `shared`. Nested functions in AMD **entry** bodies. ES modules in `KDB3/js/**`. `.catch(fn)` in the wrap entry.
- Re-open: Cognos 10k viz cap; unique-leaf JS org-tree filter (rec **F**, Cognos authoring only); duplicate-hide M-CSS-KDB; toast PROGRAM; NIT Alle CSS; DEZPV calculated-Sicht vs native cube.
- Re-open numeric HideData `from`/`to` or list `{ values: ["1"] }` as park body.
- Pass `getFilterList` **read** shape (`conditions` without `conditionsInfo`) to `addFilter` — that **wipes** the filter.
- Treat Kennzahlen tree ~114 rows as park failure. Cache **must** stay full. Only leftover Cognos widgets should empty.
- Wait-until-empty in wrap `finally` without a new GO after logs (holds Kennzahlen on leftover query).
- `whenRenderComplete` on leftovers. `clearAllLocalFilters`. `writeFilter` / page-context for park.
- Poll Task with AwaitShell. End the turn or do other captain work. If the user backgrounds writers, **verify live files** before assuming they finished.

### Army (Grok 4.6) does

- Primary **code read**, **code write**, **initial + dual review**.
- **Contract ↔ codebase compare before coding and after.**
- Extra investigation and extra review rounds are a **good default. Quality over speed.**
- Exclusive allowlists. If blocked: stop and report; do not invent architecture.
- Mechanical: AMD `define`, `_` prefix on boundary inputs, try/catch, ≤150 / orch ≤120 / ≤10 AMD (except documented TEMP), no foreign state writes, factory-scope helpers only.
- Semantic: leftover park vs Kennzahlen cache; chrome vs peek; HideData vs Kurztext vs `HideData_none`.

Subagent model: `cursor-grok-4.6-xhigh`. Keep review briefs **short**: listed paths + FAIL/NIT checklist. Pasting full `.mdc` + many files has caused `resource_exhausted`.

**Captain context is 256k. Delegation is mandatory.** Point subagents at **file paths**. Do not paste whole contracts or JS into the captain thread. Synthesize army verdicts; army holds file bodies.

---

## Start here (this order)

1. This file (standing orders + transfer + PO Cognos steps).
2. `_____________KDB3API/contracts/tableData-hierarchy-park-filter-contractdelta.md` + `tableData-hierarchy-park-filter-execution-spec.md`.
3. Live wrap: `KDB3/js/core/services/tableData/effects/readParkedTableQueryResult.js` — look for `TEMP PARK DEBUG`.
4. `KDB3/js/core/config/tables.js` `parkFilter` on `personal_kdb`, `dienststelle_bw_hierarchy`, `dienststelle_dezpv_hierarchy` only.
5. After PO pastes logs: army interpret → then either remove debug only, or GO a wrap change (wait-for-empty vs add-only repark). Dual review before keeping JS.

Do **not** start Sicht NIT, toast PROGRAM, or unique-leaf F.

---

## Transfer — leftover HideData park (do not re-discover)

### Product

Three leftover Cognos widgets (`visType` `"Hierarchy"`), identified by `tables.js` `parkFilter`, not every Hierarchy vis:

| config key | visTitle | load | first Cognos read |
|---|---|---|---|
| `personal_kdb` | `Personal_KDB` | true (boot `loadTable`) | before metricsTree `waitForRows` (cache after) |
| `dienststelle_bw_hierarchy` | `Dienststelle_BWHierarchy` | false | Sicht warmup `waitForRows` |
| `dienststelle_dezpv_hierarchy` | `Dienststelle_DEZPVHierarchy` | false | same, active Sicht only |

Widget-**local** filters via `cognosHost.visualization` (`addOrReplaceLocalFilter` / `removeLocalFilter`). Not page-context `writeFilter`. Facet has **no** `listLocalFilters` (D4). Leftovers are `visibility: hidden` unless `#main.KDB_developerMode` (`leftoverWidgets.css`).

**Kennzahlen / metricsTree must stay full** (~114). That is `waitForRows` cache of the **unparked** read. Park is only the leftover widget going empty after wrap `finally`.

Personal_KDB also has an authored **Kurztext** exclude-null filter. Do **not** remove it. It does not park.

### Write vs read (live-proven)

**Write** (console `addFilter` **without** prior remove; leftovers emptied one-by-one and **stayed** empty):

```js
{
  exclude: false,
  values: [],
  type: "display",
  conditionsInfo: {
    excludedValues: [],
    conditions: {
      operator: "containsignorecase",
      itemId: "HideData",
      ignoreCase: true,
      values: ["b"],
      valueType: "display"
    }
  },
  action: "keepexclude"
}
```

`tables.js` `parkFilter.body` is this object (three keys). `itemId: "HideData"`.

**Read** (`getFilterList`): `conditions.operator: "containsignorecase"`, `values: ["b"]`, top-level `operator: "in"`, often `type: null` or `"display"`. **Do not** send that read object to `addFilter`. Predecessor did: `addOrReplace` **wiped** HideData; leftover filled.

Numeric `from`/`to` `{u:1,d:1}` parked when applied; PO rejected slider UX. List `{ values: ["1"] }` is not this park. `contains "b"` does **not** match live HideData values (UI + both API writes emptied when waited).

Host matches **filter instance id**, not `columnId`. UI-authored id can be `HideData_none`. Unpark tries `HideData`, `HideData_none`, `HideData_1` (fail-open). Repark `addOrReplace` removes `HideData` + `_1` then `addFilter({ itemId: "HideData" })`. Does **not** remove `_none` on repark.

### Wrap protocol (shipped)

`runLoadTableWork` → `readParkedTableQueryResult` (AMD 3). `createTableDataService.js` **untouched**.

Unpark: remove three ids → `renderWidget` **with** load signal → poll `readTableQueryResult` until `rowCount > 0` or 60s (`TABLE_DATA_PARK_EMPTY` → toast `Tabellendaten konnten nicht geladen werden: …`). First ready-empty after render is **not** fail. `inspectQueryResult` still treats `itemCount > 0` + `rowCount === 0` as ready (do not change it).

`finally`: if `shouldRestorePark` (`abortControllers[tableKey].signal === signal`, missing controller → true): `addOrReplaceLocalFilter` **without** load signal, then **re-check** `shouldRestorePark`, then unsignaled `renderWidget`. Swallow render/add fail; do not convert a successful read into `markTableFailed`. Skip **add and** render if first check false (successor owns widget).

`renderWidget` is **not** a query barrier. Unpark waits for full rows. **Repark does not wait for empty.** That is the leading theory for “filter chip on, leftover still looks full.”

### Probe 2026-09-10 Personal_KDB (do not redo unless logs contradict)

Baseline: peek **114**, **no HideData** (only Kurztext).  
`addOrReplace` + render + `waitForQueryResult` 15s → peek **0**, HideData listed.  
Unpark → 114.  
`addFilter`-only → peek **0**.

**Both writes empty Personal_KDB if you wait.** “Remove-then-add cannot park” is **killed** for this keepexclude body. Baseline 114 without HideData = leftover was not parked in that session (old wipe-body, skipped `finally`, or look-too-early / Kurztext-only).

### Theories if leftover looks full with a filter (ranked)

T1 Chrome vs stale query (chip updates now; current query still last full result) — **highest**.  
T3 Filter listed, leftover query never re-ran (`render` ≠ new empty query).  
T2 Looking at Kennzahlen tree (must stay ~114) not leftover.  
T4 Developer-mode leftover pixels / hidden leftover / wrong widget.  
T10 “A filter is set” is **Kurztext**, not HideData.  
T8 Wrap skipped repark (`shouldRestorePark` false) or restore swallowed (`repark failed` already `console.error`).  
T7/T9 Old read-shape body wipe; KDB JS not reloaded.  
T5 contains `b` matches values — **killed** for these three leftovers when query actually applied.  
T6 `HideData` vs `HideData_none` — unpark miss of `_none` would keep leftover **empty**, not full.

### TEMP debug (predecessor GO 2026-09-10 — already in wrap)

File: `KDB3/js/core/services/tableData/effects/readParkedTableQueryResult.js` (~173 lines, **over 150 until debug removed**).

Prefix: `[TEMP PARK DEBUG]`. Factory-scope helpers `parkDebug` / `parkDebugPeek` / `parkDebugPeekLater` / `parkDebugPeekLaterFire` (no nested function in the entry; delayed peek via `setTimeout` + `.bind`, does **not** block `finally`). Peek uses stamped `runtime.tableData.dataQueryFacet.peekQueryRows` (not `_KDB.cognosAPI`).

Steps: `unpark-start` (peek), `after-remove` (peek), `after-unpark-read` (status + rowCount), `finally-shouldRestore` (bool), `repark-add` (ok/reason), `repark-render` (ok), `after-repark-render` (peek now), `peek+3s` (peek).

**Next captain must:** collect one boot of these lines → army interpret → **remove all TEMP helpers and calls** (wrap ≤150, AMD 3) → then only if logs demand it, GO a real fix (poll until empty after repark, **not** naive `waitForQueryResult` which accepts stale full `itemCount > 0`; or skip extra render; or add-only repark — last needs facet change, currently forbidden allowlist).

Allowlist for debug removal / wrap fix: **only** `readParkedTableQueryResult.js` unless PO GO a facet change. Do not edit `addOrReplaceLocalFilter.js`, `createTableDataService.js`, metricsTree, dienststelle, `tables.js` body without a new live proof.

Writer MUST echo Section A of the execution spec (11 MUST + `cognos-adapter`) before wrap JS. Dual grok 4.6 review after JS.

---

## PO Cognos steps (give these in Dutch; do not skip)

Predecessor does not run the next boot. You do.

1. Cognos dashboard with KDB (reload so TEMP wrap is loaded).
2. Browser **developer console** open (F12 → Console). Filter optional: `TEMP PARK DEBUG`.
3. Entwicklermodus **aan** if PO wants to *see* leftovers (`#main.KDB_developerMode`). Without it leftovers are `visibility: hidden` — that is by design.
4. Wait until **Kennzahlen boom is full**. That is expected.
5. Copy all `[TEMP PARK DEBUG]` lines (and any `repark failed` / `repark render failed`) into chat.
6. Then run the snippet below **once** (leftover peek + filter names, now and +5s). Paste that result too.

```js
(async function parkDebugAfterBoot() {
  var TITLES = ["Personal_KDB", "Dienststelle_BWHierarchy", "Dienststelle_DEZPVHierarchy"];
  function peek(id) {
    var p = getKDB().services.cognosHost.dataQuery.peekQueryRows(id);
    return p && p.data ? p.data.rowCount : null;
  }
  function names(list) {
    return (list || []).map(function (f) {
      return (f && (f.id || f.columnId)) + " / " + (f && f.conditions && f.conditions.operator);
    });
  }
  var listed = await Promise.resolve(
    getKDB().services.cognosHost.canvas.listCanvasWidgets({ waitUntilReady: true })
  );
  var widgets = (listed && listed.data) || listed || [];
  if (widgets && !Array.isArray(widgets) && Array.isArray(widgets.widgets)) widgets = widgets.widgets;
  function snapshot() {
    return widgets.filter(function (w) {
      return TITLES.indexOf(w.visTitle) !== -1;
    }).map(function (w) {
      var list = getKDB().cognosAPI.visualization.getLocalFiltersList(w.widgetId);
      return { titel: w.visTitle, rijenNu: peek(w.widgetId), filters: names(list) };
    });
  }
  var now = snapshot();
  console.info("[park-debug] nu", now);
  await new Promise(function (r) { setTimeout(r, 5000); });
  var later = snapshot();
  console.info("[park-debug] +5s", later);
  return { now: now, later: later, parkFilter: getKDB().config.tables.personal_kdb.parkFilter };
})();
```

How to read `later`:

- HideData + `rijenNu: 0` → park **worked**; leftover picture was stale (T1/T4).
- HideData + `rijenNu` still ~114 after 5s → query did not follow (T3).
- no HideData + 114 → repark did not stick (T8/T7/T9). Confirm `parkFilter.body.action === "keepexclude"`.
- Tree full + leftover 0 → **intended**.

`readTableState([{ tableName: "personal_kdb" }])` returns **one object**, not `id[0]`.

---

## Closed / do not reopen

- Unique-leaf JS filter (F). 10k viz cap. Duplicate-hide M-CSS-KDB. Toast PROGRAM. Alle CSS NIT. DEZPV calculated-Sicht vs cube.
- `waitForTableQueryResult.js` is **dead** (keep file, do not revive).
- `state.widgetId` null on error payload is dump artifact (`failurePayload` uses `input.widgetId`); not the empty-query cause.
- D4 `listLocalFilters`. `clearAllLocalFilters` for park.
- metricsTree/dienststelle second wrap.

---

## Contracts / parents (one-liners already patched)

- `contracts/tableData-hierarchy-park-filter-contractdelta.md`
- `contracts/tableData-hierarchy-park-filter-execution-spec.md` (smoke-fail wrap-only allowlist)
- `contracts/tableDataService.md` §7/§8 + approval log
- `contracts/cognosHostService.md` §7 HideData park bullet

If implementation diverges: stop, present, update contract, resume (`feature-structure.mdc` sync).

---

## After logs (your job)

1. Army interpret TEMP lines + snippet (quality over speed; second pass OK).
2. Remove TEMP debug (wrap ≤150). Dual review.
3. Only then propose a **real** wrap change if logs require it. Rec → consequences army → GO. No JS until GO.
4. Ask PO Cognos smoke: BW warmup no toast; leftover peek 0 after Kennzahlen; HideData containsignorecase b present; Kurztext remains on Personal_KDB.

Do not commit unless PO asks.
