# Launch prompt — wave-2 dialog shell (WP6 + WP7 together)

> **Superseded** for implementation: `toast-message-port-wp6-wp7-implement-handoff-2026-09-08.md` + `contracts/home-dialog-wp6-wp7-execution-spec.md`.

PO vastenburg **KEEP WP6** 2026-09-08. Filename OK: `contracts/cubes-unavailable-home-dialog-contractdelta.md`.

You are still **planner**. Subagents: Grok 4.6 (`cursor-grok-4.6-xhigh`). Talk **Dutch**. Artifacts **English**; UI German under `labels.de.*`.

**Scope in this chat now:**

- **WP6** owns detector, `choose` chrome, nav mapping, `core/homeDialog/`, cognosHost dataSources facet + dashboard nav ops, one-line `KDB.js` await at `renderKDB` 327→328.
- **WP7** is a **second caller**. You may lock WP7’s hook/file-split/copy in `contracts/loadingService-watchdog-dialog-contractdelta.md`. You must **not** invent a second Type2/`choose` shell. PDF `watchdogMs` 1800000 stays.

**Do not take WP2, SSS, or wave-1 numbers.**

---

## Start here

1. PROGRAM standing orders + rows **6 and 7** only.
2. Naslag **§6 and §7** only.
3. `contracts/cubes-unavailable-home-dialog-contractdelta.md` (KEEP package).
4. `contracts/loadingService-watchdog-dialog-contractdelta.md` (WP7 series HOLD; Q2 currently `showAlert`).
5. `cognos-adapter.mdc` + `cognosHostService.md` §0 (consume, do not invent).

No JS until PO **Approved** on the locked WP6 package **and** WP7 chrome A vs B.

---

## Product

**WP6:** boot, Cognos DataSources any `getState()==="error"` → cubes copy + two Startseite actions (close / minimize). Fail-closed if feature missing.

**WP7:** 300s boot overlay watchdog → still `finishLoading`, then incomplete-load copy. Timing stays.

**PO still open:** WP7 chrome A = second caller of WP6 `presentHomeChoice` (two Startseite, naslag) vs B = `showAlert` one OK (WP7 draft rec: this sentence does not ask the user to leave).

---

## Adapter (do not confuse)

| Layer | Folder | WP6/7 may |
|---|---|---|
| Inner ring | `core/cognosAPI/` | only from cognosHost. `dataSources.getDataSourceList` already exists. |
| Ring 1 **adapter** | `core/services/cognosHost/` | new `dataSources.hasErrorDataSource`; dashboard `openAppView` + `replaceWithBiHomePerspective`. Flatten, Outcome, no SDK leak, no user messaging. |
| Chrome folder | `core/cognosHost/` | selectors only — **not** this work. |
| `core/homeDialog/` | not a service | `choose` + id map. Stamp facets on owner runtime. |

`runtime.<owner>.adapters` is **not** the Cognos path.

---

## Do not

Fake a detector. Poll. Glass footer two-button hack. New `messageService` method. `_KDB.services.homeDialog`. Tick PROGRAM 6 or 7 before Cognos green. Dump `KDB.js`.
