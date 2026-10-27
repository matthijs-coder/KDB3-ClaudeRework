# Contract delta: `cognosHost.dashboard.getPathRef` (ring 1)

> Publishes the inner `getPathRef` ([`cognosAPI-dashboardPathRef-contractdelta.md`](cognosAPI-dashboardPathRef-contractdelta.md)) on the existing `dashboard` facet.
> Live caller (D4): `shareControls` click ([`shareControls-pathRef-link-contractdelta.md`](shareControls-pathRef-link-contractdelta.md)).

**Status:** `Approved`
**Owner:** ring 1 `_KDB.services.cognosHost.dashboard` (`KDB3/js/core/services/cognosHost/facets/dashboard/`)
**Authority:** PO handover 2026-10-27 §5.
**Related rules:** `cognos-adapter.mdc`, `error-handling.mdc`.

---

## 1. Surface

```js
_KDB.services.cognosHost.dashboard.getPathRef  // () -> Outcome<string|null>
```

- One more name in `VALUE_GETTER_NAMES` (`KDB3/js/core/services/cognosHost/facets/dashboard/read.js`): that list is the bind loop, so `getPathRef` becomes `readDashboardHostValue.bind(null, ctx, "getPathRef")` like `getBoardId`. `createDashboardAdapter` (`facets/dashboard/index.js`) does not change.
- Same Outcome classes as the other dashboard reads: a string path → `ok` + `data`; inner `null` (no path) → `ok` + `data: null` (**no new error code**); host missing → `DASHBOARD_HOST_UNAVAILABLE` / `DASHBOARD_HOST_CAPABILITY_MISSING`; inner throw → logged once by the reader, `failed` / `DASHBOARD_READ_FAILED`; disposed or stale → disposed Outcome.
- `getDashboardInfo()` and its live object never leave the inner ring. Ring 1 does not call `__getDashboardAPI`.

## 2. Anti-goals

- No URL assembly in the facet (assembly stays in `shareControls`; same anti-goal as [`_archive/cognosHost-dashboardShare-contractdelta.md`](_archive/cognosHost-dashboardShare-contractdelta.md)).
- No new facet, no `shareService`.
- The `getBoardId` getter stays published in this slice (no live caller after this slice; removing it is a separate cognos-workstream decision).

## 3. Parent patch

[`cognosHostService.md`](cognosHostService.md): `dashboard` facet surface block (§4) gains `getPathRef`; §8 touchpoint line names `getPathRef`; approval log row.

## Approval log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| `2026-10-27` | `Approved` | Coordinator per PO handover §5 | One name in `VALUE_GETTER_NAMES` (this copy's form of "one bind"). |
