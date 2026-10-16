# Contract Delta: `footer` Datenaktualisierung from `update_date`

> Delta on top of `contracts/footer.md` (CP-1 chrome `status` only).
> Wires the footer line `Datenaktualisierung: <date>` from tableData, replacing the CP-1 chrome stub.
> **PO approved 2026-09-02.** Implementation follows `footer-update-date-execution-spec.md`. No JS in this document.

---

**Status:** `Approved-for-implementation`
**Parent contract:** `contracts/footer.md`
**Also amends:** `contracts/footer.md` §2.1 / §5 (state shape + `footer/applyUpdateDate`); `KDB3/js/core/config/tables.js` `update_date` `shape`/`pick` (config, not a new subtree). **Does not** amend `eventSubscribe.md` — footer is not a `tableData:loadFinished` subscriber.
**Type:** `feature module contract delta`
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-02
**Reviewed by:** PO (vastenburg) 2026-09-02 — §12.1 `n.v.`; §12.2 S1 field names; §12.3 T1+F1 stamp

---

## 0. Diagnosis (contract vs code)

| Layer | What it says / does |
|---|---|
| `footer.md` §2.1 | State is **only** `{ status }`. Datenaktualisierung is **not mentioned**. Out of scope of CP-1. |
| `tables.js` | Config key `update_date`, Cognos vis-title `name: "aktualisierungsDatum"`, `role: "update_date"`, **`load: true`** (eager boot). Comment `//footer`. No `shape` / `pick`. |
| `tableDataService.md` | Owns `_KDB.state.tableData.<tableName>`. Consumers use named methods; **no foreign `_KDB.state.tableData` reads**. Live lookup is **config-key** (`year` / `newestStichtag` pattern); Q3 “vis-title” is stale. |
| Footer code | `syncFooterFromState.js` `readDataAktDate`: `_KDB.properties.footerDataAktualisierungDate` → `_KDB.config.dashboard.dataAktualisierungDate` → **hardcoded `"26.4.2026"`**. Neither properties nor config key is populated. Footer never calls `_KDB.services.tableData`. |
| Triage | `TRIAGE_RESTPUNTEN_2026-08-25.md` F4 / `CLUSTER_F_RAPPORT_2026-08-24.md`: hardcode is a **stub for later wiring**, not an F4 bug. This delta is that later wiring. |
| Legacy KDB2 | `dashboardFooterHelpers.js`: **today’s date**, comment `example placeholder`. Never read the table. |
| Legacy `_______KDB3` / REDESIGN2 | Hidden canvas List vis-title `aktualisierungsDatum`. Raw = `columns.aktualisierungsDatum[0].u` via `_KDB.data.tables.byHandle.update_date` (KDB3; `byName` fallback likely dead) or `byName.aktualisierungsDatum` (REDESIGN2). Format **`D.M.YYYY`** in KDB3 (REDESIGN2 kept `DD.MM.YYYY`). Store `aktualisierungsDatumRaw` / `Formatted` on footer state. Empty formatted → blank `#KDB_footer_dataAkt` (no prefix). **Race:** sync cache read on render; no `tables:loaded` subscriber — footer on before load → empty line. |

**Type 3** (contract-vs-code review): contract silent; code invented a dead properties/config fallback that always lands on `"26.4.2026"`; intended source is the table. Not Type 1 (no stated date rule to violate). Not Type 2 (the incomplete date logic is code-only). `architecture/structure-audit.md` already flags the hardcode. No other KDB3API consumer of `update_date`.

---

## 1. Purpose

When footer chrome is **`active`**, the left column shows **`Datenaktualisierung: <formatted>`** from the eager leftover List **`aktualisierungsDatum`**, loaded by `tableDataService` under config key **`update_date`**.

Remove:

- hardcoded `"26.4.2026"`;
- unused `_KDB.properties.footerDataAktualisierungDate`;
- unused `_KDB.config.dashboard.dataAktualisierungDate`.

---

## 2. Ownership (Option D then C)

The “update date” is two values:

| Value | Owner | Storage |
|---|---|---|
| Source rows | `tableDataService` | `_KDB.state.tableData.update_date` (already) |
| Chrome display | `footer` | `_KDB.state.footer.aktualisierungsDatumRaw`, `aktualisierungsDatumFormatted` |

Footer **reads** via `_KDB.services.tableData` only (`waitForRows`, `readRows`). Footer **never** reads or writes `_KDB.state.tableData.*`. tableData **never** writes `_KDB.state.footer`.

**Why state (S1), not paint-only (S2) or runtime (S3):** `__orchestratorFooterEffects` **tears down footer DOM whenever `status !== "active"`**, then always calls `syncFooterFromState`. A live-node-only paint is lost on toolbox hide, header-guard hide, and history replay. S2 either dual-paints against that pipeline or puts `readRows` in the view (`dom.mdc` mutator). S3 puts a serialisable chrome string in `_KDB.runtime` (wrong store + ad-hoc bucket). Storage review: **no blocking MUST violation** for S1. PO lock stands.

Session-derived, not user chrome:

- **not** in history (`readFooterHistorySnapshot` stays `footer.status` only);
- **not** in writeback `foot` (`collectHeaderFooter` stays `{ on }`);
- **not** mapped by `footer/parameterSetRestoreRequested` (dates left in place).

---

## 3. State shape (extends `footer.md` §2.1)

```txt
_KDB.state.footer = {
  status: "idle" | "active" | "removed",
  aktualisierungsDatumRaw: string | null,
  aktualisierungsDatumFormatted: string | null
};
```

Initial: both date fields `null`. View coalesces `null`/`""` → `"n.v."` so an `active` footer never paints a blank line or `"26.4.2026"`.

**Hard:** `createFooterReducer` `copy()` must copy **both** date fields. Today `copy` is `{ status }` only — forgetting the dates makes every `toggle`/`show`/`hide` drop the cache and flash `n.v.` (worst S1 bug). Chrome actions **preserve** dates; only `footer/applyUpdateDate` changes them.

Grandfather: German **state keys** only (`naming.mdc` vs PO lock; approved delta outranks `.mdc` for this folder). Header comment on `initialState.js`. New files stay English. No parallel English aliases.

On implement, extend `contracts/footer.md` §2.1 to this shape. Optional one-liner in `architecture/stateOwnership.md`: footer subtree may hold this session-derived chrome cache; **no** new top-level subtree.

**Restore:** `footer/parameterSetRestoreRequested` still maps only `foot.on` → `status`. Date fields are **not** in v3 `foot`. Leave them across restore (table-derived). `newDashboard` also leaves them (boot wait/apply already filled or will fill); do **not** invent a v3 date field.

---

## 4. tableData lookup

| Field | Value |
|---|---|
| Config key / caller `tableName` | `update_date` |
| Cognos vis-title (`tables.js` `name`) | `aktualisierungsDatum` |
| `role` | `update_date` |
| `load` | `true` (unchanged; date is not filter-dependent) |
| `shape` | `"row"` (add on config entry) |
| `pick` | `["display", "use"]` (default; `use` prefers cell `u`) |

**API (mandatory):** because `load: true` and the leftover does **not** change with Jahr/filters, footer must **not** `reloadTable`. Caller `tableName` is the **config key** `update_date`. Do **not** pass `tableName: "aktualisierungsDatum"` (that string is only `tables.js` `name` / vis-title for widget discovery). Production tableData methods take an **array**, not a string (`tableDataService.md` §4c; `state.mdc` string signature is stale).

```js
var input = [{ tableName: "update_date", shape: "row", isCoreTable: true }];
await _KDB.services.tableData.waitForRows(input);
var rows = _KDB.services.tableData.readRows(input);
```

- `isCoreTable: true` — `waitForRows` first awaits `loadRegistryReady`, then joins `pendingLoads.update_date`. Boot `registerConfiguredLoads` is **fire-and-forget**: `loadRegistryReady` means keys are **registered / loads started**, not that rows are ready.
- `waitForRows` — join in-flight boot load; if already `ready`, resolves from cache. **Required** so we do not copy the legacy race (sync `_KDB.data.tables` read with no wait).
- `readRows` — cache only; `undefined` until `lifecycle === "ready"`. Alone it would repeat that race.
- Forbidden: `_KDB.state.tableData.*`, `_KDB.cognosAPI.*`, `__getDashboardAPI()`, `_KDB.data.tables`.

**Shaped row** (default pick `display`/`use`):

```js
[{ aktualisierungsDatum: { display: "…", use: "…" } }]
```

Historical `.u` → pick **`use`**. **Row parse:** `rows[0].aktualisierungsDatum` if present, else first column of row 0. Raw = cell `use` then `u` then `display` then `d` (skip empty). Invalid/missing/failed wait → `raw: null`, `formatted: "n.v."` (literal sentinel, **not** `labels.de` — footer has no labels module; chrome copy is already view literals).

**Format** (_______KDB3 `formatAktualisierungsDatum`, matches current stub style): trim; `D.M.YYYY` / `DD.MM.YYYY` or ISO `YYYY-MM-DD` → **`D.M.YYYY`** (strip leading zeros). Other shapes → `null`. Not REDESIGN2 zero-padded `DD.MM.YYYY`.

---

## 5. Public API / dispatch

Dispatch-style surface **unchanged** (`mount`, `destroy`, `dispatch`, `getState`). No new public method.

New action:

| `type` | Purpose |
|---|---|
| `footer/applyUpdateDate` | Owner write of `aktualisierungsDatumRaw` / `aktualisierungsDatumFormatted` from a parsed table result. |

```js
_KDB.api.footer.dispatch({
  type: "footer/applyUpdateDate",
  payload: {
    source: "bootstrap",
    raw: string | null,
    formatted: string
  }
});
```

`SourceEnum` stays `"kdbControl" | "api" | "bootstrap"`. Table-driven apply uses **`"bootstrap"`** through `dispatch()` so `pushFooterHistoryStep` skips (`payload.source === "bootstrap"`). Do **not** send `writebackSet` here (`validSource` would reject). Extra `skipHistory` is optional, not required. `readFooterHistorySnapshot` remains `footer.status` only — date apply cannot push a step even with a wrong source if status is unchanged.

Do **not** add `"writebackSet"` or `"tableData"` to `SourceEnum`.

Reducer: replace the two date fields; no-op if both equal current. Does not change `status`. Effects after commit: `syncFooterFromState` only (no remount).

Internal load/parse lives in `footer/effects/` as a **named factory-scope async helper** (no IIFE). `AbortController` under `_KDB.runtime.footer.abortControllers.updateDate`. `waitForRows` has **no** AbortSignal; aborted Cognos work **resolves `null`** (does not reject). After every `await`: `if (disposed || signal.aborted) return` — treat `null` rows as abort, **not** as missing date (`n.v.`). Do **not** call `abortTable("update_date")` (that kills the shared boot load). Footer destroy aborts only its own apply controller; `KDB.js` destroys features first, then `tableData.destroy` → `abortAllLoads`.

`createFooterController.js` is already over the 60-line controller-function limit (grandfathered) and at **9 AMD imports** (10 is the wall). Do **not** add a 10th import. Start/abort from existing `_footerEffects`: `__mountSync` starts the wait; destroy calls `_footerEffects(..., { type: "__unmount" })` to abort. Wait/format stay out of the controller.

---

## 6. When to load / refresh

**Locked design: T1 + F1** (timing army 2026-09-02). Primary is `waitForRows` on `footer.mount`, even while `idle`/`removed`. Boot already started the eager load (`setupCoreFactories` → tableData **before** footer register/mount). Mount-time wait **joins** `pendingLoads` or cache. First toolbox/restore `active` is later; DOM is torn down while idle, but **state** is filled so first show paints without a guaranteed `n.v.` flash.

`waitForRows` already returns shaped rows. Extra `readRows` after success matches metricsTree (optional belt). `tables.js` `update_date` has **no** `isCoreTable` flag today — **pass it on the caller input**.

| Trigger | Behaviour |
|---|---|
| `footer.mount` / `__mountSync` | Start F1 wait + `footer/applyUpdateDate` (idle is fine). |
| `footer.status` → `active` | **Backup only:** if both date fields still `null` (mount wait aborted), start the same wait. Not the primary path — a pure active-only wait always flashes `n.v.` for at least one microtask because `syncFooterFromState` runs sync in the same `show` commit. |
| `tableData:loadFinished` / `loadFailed` | **Do not subscribe.** Bus does not replay; boot often already `ready` before footer mount; `waitForRows` on `ready` is cache and does not re-emit. `waitForRows` rejects on fail → apply `"n.v."`. |
| `footer.destroy` / `__unmount` | Abort `_KDB.runtime.footer.abortControllers.updateDate` only. No tableData unsubscribe. |

Forbidden fetches: `reloadTable` (newestStichtag pattern — Jahr-dependent leftover, not this), `ensureFreshRows` (aborts in-flight boot load), `readRows` alone (legacy race).

---

## 7. View

`syncFooterFromState` reads **only** `_KDB.state.footer.aktualisierungsDatumFormatted` and header title via published **`readHeaderTitleText`** from `header/state/selectors.js` (re-export from `footer/state/selectors.js`). Same-pass: drop the foreign `_KDB.state.header` read in `syncFooterFromState.js`.

**Missing / invalid date (PO 2026-09-02):** paint `Datenaktualisierung: n.v.` Prefix is a **view literal** (same as today). View: `String(formatted || "n.v.")` — covers initial `null` before wait. After apply, stored formatted is either a `D.M.YYYY` or `"n.v."`. Never `"26.4.2026"`. Never a blank `#KDB_footer_dataAkt` while chrome is `active`.

View does not call tableData. Renderer does not write state.

Same-pass: drop the foreign `_KDB.state.header` read; use `readHeaderTitleText`.

---

## 8. Cognos / rings

Footer has **no** Cognos touchpoint. Boot load stays `tableDataService.registerConfiguredLoads`. No new cognosHost facet. No `runtime.footer.*Facet`.

---

## 9. Folder layout (delta only)

Existing `footer/` folders. New files only if a 150-line split is required:

```txt
footer/
  effects/loadFooterUpdateDate.js          // async wait/read/parse → dispatch applyUpdateDate
  effects/formatUpdateDate.js              // pure D.M.YYYY (English file; not formatAktualisierungsDatum.js)
  effects/readUpdateDateFromRows.js        // first-row column → raw
```

Do not add `adapters/`. Do not rename grandfathered paths in this delta.

---

## 10. Out of scope

- Center column (`formatDMY(new Date()) + " (unbekannt)"`) — that is **Erstellt** (today + user), not Datenaktualisierung.
- Hardcoded Cognos URL and page indicator `"1"` in `buildFooterChrome.js`.
- Header `titleText` foreign read — **in scope as same-pass** in `syncFooterFromState.js` (`readHeaderTitleText`).
- PDF Anhang `Datenaktualität` (`properties.pdfAttachmentPageObj.dataFreshness`, often `"-"`). That is steward metadata, **not** this leftover List. Do not read footer state or `update_date` from PDF.
- `labels.de` for `"n.v."` or the prefix.
- Writeback / history / parameter-set restore of the date.
- Changing `update_date` `load: true` (F4 verdict 2026-08-25: leave eager).
- `tableData:loadFinished` / `loadFailed` footer subscriber (`eventSubscribe.md` stays as-is for this leftover).
- `abortTable("update_date")` from footer.

---

## 11. Relevant MUST rules

`state.mdc` (canonical writer; no foreign tableData writes; grey ownership resolved as §2), `runtime.mdc` (abort own apply controller only), `module-public-api.mdc` (no extra public methods; dispatch-only), `events.mdc` (no request-event; **no** fact subscribe for this leftover), `feature-structure.mdc` (contract before code; effects not orchestrator), `naming.mdc` (English ids/files; German state keys grandfathered), `error-handling.mdc` (try/catch; abort/`null` vs missing date), `amd.mdc` (factory-scope async helper), `dom.mdc` (view reads state), `cognos-adapter.mdc` (no SDK from footer), `kdb-object.mdc` (no `_KDB.data`).

---

## 12. PO questions

1. **Missing date UX:** **LOCKED 2026-09-02** — `Datenaktualisierung: n.v.`
2. **Where the formatted date lives:** **LOCKED 2026-09-02** — S1 state fields. Storage army: no blocking MUST break; S2/S3 rejected (§2).
3. **Apply timing:** **LOCKED 2026-09-02 PO** — T1 + F1. `waitForRows` on `footer.mount` while idle; `{ tableName: "update_date", shape: "row", isCoreTable: true }`. Backup wait if still `null` on first `active`. No `loadFinished` subscribe.

---

## 13. Approval log

| Date | Actor | Note |
|------|-------|------|
| 2026-09-02 | coordinator | Draft from contract-vs-code + legacy `resolveAktualisierungsDatum`. Awaiting PO on §12. |
| 2026-09-02 | coordinator | Legacy hunt: KDB2 = today-placeholder; KDB3/REDESIGN2 = List `.u`; shaped row `{ aktualisierungsDatum: { use } }`; waitForRows required vs old sync race. |
| 2026-09-02 | coordinator | Contract-vs-code: Type 3 confirmed; `loadRegistryReady` ≠ rows ready → `isCoreTable: true`; same-pass `readHeaderTitleText`; do not grow `createFooterController`; PO Q2 now includes no-extra-state option C. |
| 2026-09-02 | PO | §12.1 `n.v.`; §12.2 legacy field names. §12.3 + storage/timing army before implement. |
| 2026-09-02 | coordinator | n.v. review: literal sentinel; view coalesces null; bootstrap skips history; no 10th controller import (effects `__mountSync`/`__unmount`); English new files; PDF Datenaktualität ≠ footer date. |
| 2026-09-02 | coordinator | Storage army: S1 confirmed. DOM teardown is the cache reason. Reducer `copy()` must keep dates. Restore leaves dates. |
| 2026-09-02 | coordinator | Timing army: T1+F1. Drop loadFinished subscribe (bus does not replay). Never `abortTable`. §12.3 recommended, awaiting PO. |
| 2026-09-02 | PO | Stamp §12.3 T1+F1. Delta **Approved-for-implementation**. Spec: `footer-update-date-execution-spec.md`. Captain handoff: `futureTodo/footer-update-date-captain-handoff-2026-09-02.md`. |
