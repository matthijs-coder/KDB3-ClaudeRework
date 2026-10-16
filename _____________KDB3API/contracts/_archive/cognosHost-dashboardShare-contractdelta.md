# Contract Delta: `cognosHost.dashboard` for share URL primitives

> Publishes inner `getBoardId` / `getDashboardBiBaseUrl` on the existing dashboard facet.
> Inner wrappers: `contracts/cognosAPI-dashboardShare-contractdelta.md`.
> Consumer: `contracts/shareControls.md`.
> Parent `cognosHostService.md` is **not** edited until this delta is Approved; implementers patch the sections below.

---

**Status:** `Approved`
**Parent:** `contracts/cognosHostService.md` §4 dashboard surface, §7 injection, §8 touchpoints, approval log
**Type:** `shared-service contract delta` (existing facet extension, not a new facet)
**Authoring AI:** Cursor Grok 4.6, 2026-08-28

---

## 1. Purpose

ShareControls must reconstruct a Cognos viewer URL without `__getDashboardAPI` or `_KDB.cognosAPI`. The dashboard facet already flattens host metadata to primitives via `readDashboardHostValue`. `getDashboardInfo()` is a live object and **must not** be returned through that reader.

---

## 2. Parent patches (apply on approval)

### §4 dashboard surface — add

```js
getBoardId: getBoardId,                       // () -> Outcome<string|null>
getDashboardBiBaseUrl: getDashboardBiBaseUrl  // () -> Outcome<string|null>
```

Same Outcome classes as other dashboard reads. Empty/missing **boardId** and unavailable **bi-base** (`document.location` missing) are `ok` + `data: null` (not a new error code) — that is the intended result after a correct inner flatten (`string | null`).

`failed` / `DASHBOARD_READ_FAILED` is the **existing reader safety net** on `readDashboardHostValue` when a non-primitive still crosses the reader (inner wrapper bug) or the inner call **throws** (same as live `getFileName`). The same reader still yields `DASHBOARD_HOST_UNAVAILABLE`, `DASHBOARD_HOST_CAPABILITY_MISSING`, and disposed/`aborted` for the usual host-missing cases — do not invent a custom reader that collapses those to `DASHBOARD_READ_FAILED` only. After a correct inner flatten, thenable / null info / empty boardId / missing location are inner `null` → facet `ok` + `data: null`. A thenable `getDashboardInfo` is **not** awaited and is **not** supposed to reach the reader as a Promise.

Implementation: two extra binds on `createDashboardAdapter.js` through existing `readDashboardHostValue` (live form: `_readDashboardHostValue.bind(null, ctx, "getBoardId")` and the same for `"getDashboardBiBaseUrl"`). No new `read/*.js`. Compose AMD unchanged.

### §7 injection — add

- *shareControls* — `__orchestratorShareControls` stamps `_KDB.runtime.shareControls.dashboardFacet`. Effects read that stamp through `effects/readDashboardFacet.js`. ShareControls boots **after** `__orchestratorServices`; no `pendingDashboardFacetStamp`. `mount` / runtime normalize **must preserve** the stamp (same as `dashboardPdf` `normalizeRuntime`). Deep files do not look up `_KDB.services.cognosHost`.

**D4 (same slice):** do not bind `getBoardId` / `getDashboardBiBaseUrl` on `createDashboardAdapter.js` until `shareControls` is a live caller in the same implementation slice. Inner `cognosAPI.dashboard` wrappers may exist in `core/cognosAPI/` with zero callers; **facet publication may not**. Writeback is not a consumer of these two ops.

### §8 Cognos touchpoints — add

Ring 1 additionally calls `_KDB.cognosAPI.dashboard.getBoardId` and `.getDashboardBiBaseUrl`. The host `getDashboardInfo` object stays inside the inner wrapper.

### Approval log — add row on approval

| Date | Status change | Approver | Notes |
|---|---|---|---|
| `<approval date>` | `Implementing` (dashboard share primitives) | `<PO>` | `getBoardId` + `getDashboardBiBaseUrl` on dashboard facet; shareControls stamp. |

---

## 3. Anti-goals

- No `getDashboardInfo` on the facet.
- No share URL / `parameterId` / German labels in ring 1. Hash keys `perspective` / `action` / `mode` / `id` / `objRef` stay in `shareControls` config (viewer-URL protocol, not SDK isolation). Do not “fix” that by moving URL assembly into this facet.
- No new `shareService`.
- No compose or factory split for two binds.
- Do not reuse or redefine `getEnvironmentSource` for the `/cognos/bi/` prefix.

---

## Approval log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| `2026-08-28` | `Draft` | Cursor Grok 4.6 | Facet extension only; parent patched after PO approval. |
| `2026-08-29` | `Draft` (SHOULD patch) | Captain after [Cognos deltas review](321261f1-75a0-4d8f-9b29-6c11f0485883) | Outcome sentence: inner `null` is `ok`+`data:null`; `DASHBOARD_READ_FAILED` is reader safety net / throws only. Same empty class for bi-base. Bind form named. |
| `2026-08-29` | `Draft` (SHOULD nits) | Captain after [Cognos second pass](9073f3ec-8de6-47df-a5bb-a349d15dd799) | Reader codes named (`HOST_UNAVAILABLE` / `CAPABILITY_MISSING` / aborted). merge-ready; Approved held for package. |
| `2026-08-29` | `Approved` | PO-by-proxy (captain; handoff: fresh army green = PO ok) | [Cognos second pass](9073f3ec-8de6-47df-a5bb-a349d15dd799) merge-ready. Parent `cognosHostService.md` patches apply on implementation. |
