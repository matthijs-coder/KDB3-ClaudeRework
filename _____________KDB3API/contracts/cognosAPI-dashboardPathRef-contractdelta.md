# Contract delta: `cognosAPI.dashboard.getPathRef` (inner ring)

> Inner-ring read of the live Cognos content path of the open dashboard, flattened to the unencoded `pathRef` string.
> Facet bind: [`cognosHost-dashboardPathRef-contractdelta.md`](cognosHost-dashboardPathRef-contractdelta.md). Outbound use: [`shareControls-pathRef-link-contractdelta.md`](shareControls-pathRef-link-contractdelta.md).
> Supersedes nothing: `getBoardId` stays as it is ([`_archive/cognosAPI-dashboardShare-contractdelta.md`](_archive/cognosAPI-dashboardShare-contractdelta.md) remains the history of that wrapper).

**Status:** `Approved`
**Owner:** inner ring `_KDB.cognosAPI.dashboard` (`KDB3/js/core/cognosAPI/dashboard.js`)
**Authority:** PO handover 2026-10-27 (product lock §2, probe §3, conversion §4 are binding; source copy green in Cognos incognito 2026-10-27).
**Related rules:** `cognos-adapter.mdc`, `error-handling.mdc`, `amd.mdc`.

---

## 1. Surface

```js
_KDB.cognosAPI.dashboard.getPathRef  // () -> string | null   (unencoded, e.g. ".public_folders/Spielwiese/…")
```

- Lives in `KDB3/js/core/cognosAPI/dashboard.js` next to `getBoardId` (this copy keeps the dashboard theme in one file; the source copy had a separate `getPathRef.js`). Published as the property `getPathRef` on the object returned by `createDashboardApi`.
- Synchronous. Never returns the host info object, a Promise or a live object.
- No KDB logic: no feature flow, no URL building, no `encodeURIComponent`, no German labels, no state. `getDashboardInfo` is **not** published as its own wrapper.

## 1.1 Host probe (what Cognos returns)

`__getDashboardAPI().getDashboardInfo()` on an open dashboard (also after an ID-open whose location has no `pathRef`):

```js
{
  isDirty: true,
  boardId: "i95024D86BB244733BEA04BB5AE72658C",
  searchPath: "/content/folder[@name='Spielwiese']/folder[@name='Personal']/folder[@name='Konfigurierbares Dashboard']/folder[@name='00_Sprint_33.1']/folder[@name='KDB3']/exploration[@name='PER130 konfigurierbares Personaldashboard (KDB3 v33.1.004)']",
  type: "exploration"
}
```

There is no `pathRef` field. `type` is `"exploration"`: do **not** filter on `type === "dashboard"`. `searchPath` is the primary source. If the probe in this copy's Cognos shows other keys, implementation stops and the PO re-locks this section.

## 1.2 Conversion `searchPath` → unencoded `pathRef` (locked, copy exactly)

1. Read only `info.searchPath` (a string, or a number turned into `String`). Do not read `boardId`, `type` or `isDirty`; no `Object.keys`.
2. Trim. Empty → `null`.
3. Starts with `.` (already `.public_folders/…`, `.team_folders/…`, `.my_folders/…`) → return it unchanged (trimmed).
4. Extract the names with `/\[@name='((?:\\'|[^'])*)'\]/g`; in each name replace `\'` with `'`.
5. Root map on the **first** name (that first name is then **skipped**): `Public Folders` / `Öffentliche Ordner` → `.public_folders`; `Team Folders` / `Teamordner` → `.team_folders`; `My Folders` / `Meine Ordner` → `.my_folders`. Look the name up as an own key only (`Object.prototype.hasOwnProperty`), so `constructor` or `toString` is not a root.
6. Else, if the trimmed path starts with `/content` → root `.public_folders` and keep **all** names.
7. Else → `null`. An empty remaining name list → `null`.
8. Return `root + "/" + rest.join("/")`. **No** `encodeURIComponent` here; the share builder encodes once with `URLSearchParams`.
9. `info` null/undefined → `null`. `info` thenable → `null` (not awaited). A host throw from `__getDashboardAPI()` or `getDashboardInfo()` is **not** converted to `null`.

Worked example (input = §1.1 `searchPath`): names `Spielwiese` / `Personal` / `Konfigurierbares Dashboard` / `00_Sprint_33.1` / `KDB3` / `PER130 konfigurierbares Personaldashboard (KDB3 v33.1.004)`; the first name is not in the root map and the path starts with `/content`, so the result is

```text
.public_folders/Spielwiese/Personal/Konfigurierbares Dashboard/00_Sprint_33.1/KDB3/PER130 konfigurierbares Personaldashboard (KDB3 v33.1.004)
```

That is the native Cognos share path. Native Cognos encodes parentheses twice (`%2528`); one `URLSearchParams` encode (`%28`) is PO-green in incognito.

No hardcoded folder or dashboard names (`Spielwiese`, titles, DEV/TEST/PROD strings). No Content Manager REST call.

## 2. Errors (this copy's rules)

`error-handling.mdc` forbids log-and-rethrow, and the inner ring is not a boundary. `getPathRef` therefore has **no try/catch**: a host throw propagates unchanged to ring 1, whose reader (`readDashboardHostValue`) logs once and returns `failed` / `DASHBOARD_READ_FAILED`. The handover's "log-and-rethrow" (source-copy rules) becomes "propagate, ring 1 logs once"; the rule that matters (a throw is never turned into `null`) is unchanged.

## 3. Out of scope

`getBoardId`, `getDashboardBiBaseUrl` (unchanged), location parsing (feature side, [`shareControls-pathRef-link-contractdelta.md`](shareControls-pathRef-link-contractdelta.md) §3), drill-through `pathRef` links in `KDB3/js/core/config/dashboardSettings.js` (different product).

## Approval log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| `2026-10-27` | `Approved` | Coordinator per PO handover (product lock §2/§4, source copy Cognos-green) | Mapped to this copy: function in `dashboard.js`, no log-and-rethrow (§2). Merge gated on the PO probe in this copy's Cognos (§1.1). |
