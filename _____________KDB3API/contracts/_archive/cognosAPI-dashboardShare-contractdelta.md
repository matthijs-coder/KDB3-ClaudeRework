# Contract Delta: `cognosAPI.dashboard` for dashboard share URL

> Inner-ring wrappers so share URL reconstruction never calls `__getDashboardAPI` from feature code.
> Facet publication: `contracts/cognosHost-dashboardShare-contractdelta.md`.
> No production code until **Approved**.

---

**Status:** `Approved`
**Parent:** `_KDB.cognosAPI.dashboard` in `KDB3/js/core/cognosAPI/dashboard.js`; `contracts/cognosAPI-dashboardPdf-contractdelta.md` (same theme, different methods)
**Type:** `thin host wrapper` (inner ring)
**Authoring AI:** Cursor Grok 4.6, 2026-08-28

---

## 1. Added thin methods

Remain on the existing `_KDB.cognosAPI.dashboard` theme. No new `_KDB.*` namespace. Called only from ring 1 (`cognosHost` dashboard facet).

### `getBoardId()` → `string | null`

- Calls `__getDashboardAPI().getDashboardInfo()` **inside this wrapper only**. There is **no** public `_KDB.cognosAPI.dashboard.getDashboardInfo` (that host SDK method is not wrapped in KDB3 today; do not add an object-returning wrapper).
- The call is **synchronous**. Do **not** await. Do **not** apply `readDashboardHostValue`’s “any `typeof === object` is live → `DASHBOARD_READ_FAILED`” test to the info value — that would make every share click miss `boardId`. Flatten **inside** this wrapper:
  1. If `getDashboardInfo()` returns `null` or `undefined`, return `null` (same class as missing `boardId`; do not field-read a null and throw).
  2. If it returns a thenable (object with a `then` function), do not await it; return `null`.
  3. Otherwise read the `boardId` field off that value (including when the value is a host info **object**).
  4. If `boardId` is a string or number scalar with non-empty `String(boardId)`, return that string.
  5. Otherwise return `null`.
- **Must not** return the info object itself (only the flattened string or `null` may cross `readDashboardHostValue`).
- Host **throws** (missing `getDashboardInfo`, `__getDashboardAPI` failure) **must not** be caught-and-nulled here. Let them propagate so the facet maps them to `DASHBOARD_READ_FAILED`, same as live `getFileName`. A local try/catch that **logs and rethrows** is allowed (`error-handling.mdc`); converting the throw to `null` is not. Only thenable / null info / missing-or-non-scalar `boardId` is inner `null`.

### `getDashboardBiBaseUrl()` → `string | null`

- Derives the Cognos BI base with trailing slash from `document.location.href` / `document.location.origin` (same document as `getEnvironmentSource`; not `window.location` and not `window.top.location`).
- Formula: `document.location.href.match(/^(.*?\/cognos\/bi\/)/i)` else `document.location.origin + "/cognos/bi/"`, then **ensure** a single trailing `/` (do not blindly append if one is already present).
- Returns `null` only if `document.location` is unavailable (inner `null` → facet `ok` + `data: null`; not a new error code).
- Must **not** change `getEnvironmentSource()` (PDF `environmentRegex` still needs the full href).

---

## 2. Constraints

- No `window` / `__getDashboardAPI` in `shareControls` or writeback feature effects.
- No `getDashboardInfo` published on `_KDB.cognosAPI.dashboard` as a public object-returning method.
- No parameter-set ids or `"leeres Dashboard"` in this ring.
- Keep both wrappers in `dashboard.js` under the hard 150-line cap. Split to `dashboard/getBoardId.js` + `dashboard/getDashboardBiBaseUrl.js` **only if** an implementation would exceed 150 lines (factory-scope helpers and thenable/`boardId` guards may push past 150; that split is the right job split). Do not split merely because the 80–120 target is exceeded (`getEnvironmentSource` / `getDashboardVersion` stayed inline on the same precedent).

---

## 3. Out of scope

- Hash keys `perspective` / `action` / `mode` / `id` / `objRef` assembly — `shareControls` config (KDB-owned concatenation of facet primitives + writeback id/label).
- URL restore parse — writeback `readUrlParameterId`.

---

## Approval log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| `2026-08-28` | `Draft` | Cursor Grok 4.6 | Minimal primitives for share URL reconstruct. |
| `2026-08-29` | `Draft` (MUST patch) | Captain after [Cognos deltas review](321261f1-75a0-4d8f-9b29-6c11f0485883) | `getBoardId` flatten: extract `boardId` from the info object; do not treat that object as live/`null`. Thenable → `null` (no await). Host throws propagate. `document.location.href`/`origin` named. Softened 150-line split rule. |
| `2026-08-29` | `Draft` (SHOULD nits) | Captain after [Cognos second pass](9073f3ec-8de6-47df-a5bb-a349d15dd799) | Drop fail/null wording; null info → inner `null`; ensure trailing slash; log-and-rethrow allowed. |
| `2026-08-29` | `Approved` | PO-by-proxy (captain; handoff: fresh army green = PO ok) | [Cognos second pass](9073f3ec-8de6-47df-a5bb-a349d15dd799) merge-ready. |
