# Contract Delta: `footer` Erstellt user from Cognos `UserProfile`

> Delta on top of `contracts/footer.md` + [footer-update-date-contractdelta.md](./footer-update-date-contractdelta.md).
> Replaces the hardcoded center-column `(unbekannt)` with Cognos `UserProfile.getUserAccount().userName`, via the **existing** `cognosHost.dashboard` facet (D4 live caller: footer).
> **PO go 2026-09-02.** Host call confirmed: `__getDashboardAPI().getFeature("UserProfile").getUserAccount().userName` works. Must not be called from footer. Implementation follows `footer-created-user-execution-spec.md`. No JS in this document.

---

**Status:** `Approved-for-implementation`
**Parent contract:** `contracts/footer.md`
**Also amends:** `contracts/footer.md` §2.1 / §3 / §5; `contracts/cognosHostService.md` dashboard facet ops + §7 footer stamp. **Does not** amend `eventSubscribe.md`. **Does not** reopen `update_date` / T1 / F1 / S1 dates.
**Type:** `feature module contract delta` + D4 facet op on an **existing** facet
**Authoring AI:** Cursor Grok 4.6 captain, 2026-09-02
**Reviewed by:** PO (vastenburg) 2026-09-02 — host `userName` works; adapter rings; go to write this delta

---

## 0. Diagnosis (contract vs code)

| Layer | What it says / does |
|---|---|
| `footer.md` §2.1 | `{ status, aktualisierungsDatumRaw, aktualisierungsDatumFormatted }`. Center Erstellt user is **not mentioned**. |
| Update-date lock | Center `formatDMY(new Date()) + " (unbekannt)"` **out of scope**. Footer **no Cognos touchpoint** / no `runtime.footer.*Facet` **for that leftover**. This delta is the **new** approved exception for the user name only. |
| Live view | `syncFooterFromState.js` paints `formatDMY(new Date()) + " (unbekannt)"`. **Hardcoded.** Never calls UserProfile / `getUserInfo`. |
| Timing hypothesis | **Rejected** for live `(unbekannt)`: the user is never checked. Footer.mount is after `__orchestratorServices`; first paint is first `active`. `getUserAccount` is sync (PO). |
| Layer 1 | `cognosAPI.dashboard.getUserInfo` returns the **live** account object. **0 callers.** Dead-but-kept (`cognosHostService.md`). Must **not** be bound on the facet (ring 1 treats a live object as `failed`). |
| Dashboard facet | Has `getLanguage` (same UserProfile feature, primitive locale) and `getBoardId` (inner-ring flatten of a host object). **No** `getUserName`. |
| Header / properties | No user display name. |
| Legacy `_______KDB3` | `formatToday() + " (" + user + ")"`. User = `getUserInfo().userName`, else `"unbekannt"`. No `Erstellt:` prefix. KDB2 had `Erstellt:` + date + user; REDESIGN2 had user only. **Live ancestor = _______KDB3 shape.** |

**Type 3:** contract silent on the user; code invented a stub; intended source is Cognos UserProfile `userName`.

---

## 1. Purpose

When footer chrome is **`active`**, the center line shows **`<today D.M.YYYY> (<userName>)`**.

- Date remains **`new Date()` at paint** (session “today”), not stored.
- User is Cognos **`userName`**, cached on footer state so DOM teardown does not lose it.
- Missing / failed / empty → view **`(unbekannt)`** (literal, not `labels.de`).

Remove the hardcoded `" (unbekannt)"` as the only user source.

---

## 2. Ownership

| Value | Owner | Storage |
|---|---|---|
| Cognos account object | inner ring `cognosAPI.dashboard.getUserName` flatten | never leaves inner ring |
| Primitive `userName` | `cognosHost.dashboard.getUserName` | `Outcome<string\|null>` |
| Chrome cache | `footer` | `_KDB.state.footer.createdUserName` |

Footer reads the **stamped** `runtime.footer.dashboardFacet` only (`effects/readDashboardFacet.js`). Footer **never** calls `_KDB.cognosAPI`, `__getDashboardAPI()`, or looks up `_KDB.services.cognosHost` in deep files / view.

**Why state (same teardown reason as update-date S1):** `__orchestratorFooterEffects` tears down footer DOM when `status !== "active"`, then `syncFooterFromState`. A paint-only write is lost on hide. View must not call the facet (`dom.mdc`, `cognos-adapter.mdc`).

Session-derived, not user chrome:

- **not** in history (`readFooterHistorySnapshot` stays `footer.status` only);
- **not** in writeback `foot`;
- **not** in `footer/parameterSetRestoreRequested`.

---

## 3. State shape (extends `footer.md` §2.1)

```txt
_KDB.state.footer = {
  status: "idle" | "active" | "removed",
  aktualisierungsDatumRaw: string | null,
  aktualisierungsDatumFormatted: string | null,
  createdUserName: string | null
};
```

- **`createdUserName`:** English key (`naming.mdc`). Initial `null`. View coalesces `null`/`""` → `"unbekannt"`.
- **Hard:** `copy()` must copy **dates and** `createdUserName` (null-safe). Toggle/show/hide must not drop the cache.
- Only `footer/applyCreatedUser` writes `createdUserName`. `footer/applyUpdateDate` must not touch it.

---

## 4. D4 — existing `dashboard` facet op `getUserName`

**Not a new facet.** Live caller: footer (this delta).

Inner ring (copy `getBoardId.js`, not `getUserInfo`):

```txt
getUserName() → flatten getUserAccount().userName → string | null
```

- Host: `__getDashboardAPI().getFeature("UserProfile").getUserAccount()` **inside** the flatten file.
- Take **`userName` only** (legacy field). Trim. Empty / missing / non-string / thenable account → `null`.
- Live account object **does not** return to ring 1.
- Keep `getUserInfo` dead-but-kept (0 callers). Do **not** add `getUserInfo` to the facet.

Ring 1: bind on `createDashboardAdapter.js` like `getLanguage`:

```js
getUserName: _readDashboardHostValue.bind(null, ctx, "getUserName")  // () -> Outcome<string|null>
```

Reuse `readDashboardHostValue.js` (primitive → `ok`; `null` → `ok+null`; Promise/object → `failed`). No new outcome helpers. Compose / `createCognosHostService.js` unchanged.

Public catalogue (`cognosHostService.md`):

```js
getUserName: getUserName,  // () -> Outcome<string|null>
```

---

## 5. Footer stamp + read

Copy **shareControls**, not authoring:

- `__orchestratorFooter` stamps `_KDB.runtime.footer.dashboardFacet = (_KDB.services.cognosHost && _KDB.services.cognosHost.dashboard) || null`.
- Footer register is **after** `__orchestratorServices`. **No** `pendingDashboardFacetStamp`.
- Preserve the stamp if runtime is re-normalized (`||` seed must not wipe an existing `dashboardFacet`).
- `footer/effects/readDashboardFacet.js` reads `_KDB.runtime.footer.dashboardFacet` (not shareControls’ file).
- Deep files / view: stamp only.

This **supersedes** the update-date sentence “Footer has no Cognos touchpoint” **for `getUserName` only**. Still no `_KDB.cognosAPI` from footer. Still no PDF / URL / `setMode` from footer.

---

## 6. Dispatch

Surface unchanged: `{ mount, destroy, dispatch, getState }`. No new public method.

| `type` | Purpose |
|---|---|
| `footer/applyCreatedUser` | Owner write of `createdUserName`. |

```js
_KDB.api.footer.dispatch({
  type: "footer/applyCreatedUser",
  payload: { source: "bootstrap", userName: string | null }
});
```

`SourceEnum` unchanged (`kdbControl | api | bootstrap`). Table/user applies use **`"bootstrap"`** so history skip stays. Do not add `writebackSet`.

Reducer: `userName` `== null` or `""` → `null`, else `String`. No-op if equal current. Does not change `status` or date fields.

---

## 7. When to load

**Sync** `facet.getUserName()` (no `waitForRows`, no AbortSignal, no `abortTable`).

| Trigger | Behaviour |
|---|---|
| `footer.mount` / `__mountSync` | Load even while `idle`. |
| `footer.status` → `active` | **Backup** if `createdUserName == null` (miss / first paint before apply). |
| Destroy / `__unmount` | Nothing to abort for this leftover. |

If already a non-null `createdUserName`, skip (do not overwrite). Miss stays `null` so backup may retry (cheap sync). View still shows `(unbekannt)` until a name arrives.

Do not call the facet from `syncFooterFromState`.

---

## 8. View

`#KDB_footer_centerDateUser` when `active`:

```js
formatDMY(new Date()) + " (" + String((st && st.createdUserName) || "unbekannt") + ")"
```

Keep `formatDMY`. Never blank while active. Do not add `Erstellt:` (_______KDB3 shape). Do not touch Datenaktualisierung, title, Data Excellence Conform, URL, page `"1"`.

---

## 9. Folder layout (delta only)

```txt
core/cognosAPI/dashboard/getUserName.js          // inner flatten (new)
footer/effects/readDashboardFacet.js             // stamp reader (new)
footer/effects/loadFooterCreatedUser.js          // sync getUserName → dispatch (new)
```

Edits: `dashboard.js` (4th AMD import, still ≤ 6), `createDashboardAdapter.js` (one bind), `__orchestratorFooter.js` (stamp), `initialState.js`, `createFooterReducer.js` (`copy` + apply), `syncFooterFromState.js`, `__orchestratorFooterEffects.js` (5th AMD: load helper; `__mountSync` + backup). **No** 10th import on `createFooterController.js`. **No** change to `loadFooterUpdateDate.js`.

---

## 10. Out of scope

- `canvasExtensionBottom` / authoring class on `#main`.
- Hardcoded Cognos URL, page `"1"`, `Data Excellence Conform`.
- `getLanguage` callers, PDF `Datenaktualität`, `labels.de`.
- Binding `getUserInfo` on the facet.
- History / writeback of the user.
- Reopening update-date T1/F1/S1.

---

## 11. Relevant MUST rules

`cognos-adapter.mdc` (three rings; D4; stamp not `_KDB.cognosAPI`), `state.mdc`, `runtime.mdc`, `module-public-api.mdc`, `feature-structure.mdc`, `naming.mdc`, `error-handling.mdc`, `amd.mdc`, `dom.mdc`, `kdb-object.mdc`.

---

## 12. PO stamps (this WP)

1. **Host field:** **LOCKED** — `userName` (PO: the call works).
2. **Adapter:** **LOCKED** — existing dashboard facet + inner flatten; not footer → `__getDashboardAPI()`.
3. **Paint:** **LOCKED** — _______KDB3 `D.M.YYYY (user)`; miss `"unbekannt"`.
4. **Go:** **LOCKED 2026-09-02** — write this delta / spec; JS via army after spec.

---

## 13. Approval log

| Date | Actor | Note |
|------|-------|------|
| 2026-09-02 | captain | Timing rejected (hardcoded stub). D4 path: `getUserName` on dashboard facet; footer stamp like shareControls. |
| 2026-09-02 | PO | Host `userName` works; adapter layer; **go**. |
