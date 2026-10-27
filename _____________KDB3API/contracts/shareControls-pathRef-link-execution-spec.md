# Execution spec: share link with live `pathRef` (native query)

**Contracts (authority, in order):** [`cognosAPI-dashboardPathRef-contractdelta.md`](cognosAPI-dashboardPathRef-contractdelta.md), [`cognosHost-dashboardPathRef-contractdelta.md`](cognosHost-dashboardPathRef-contractdelta.md), [`shareControls-pathRef-link-contractdelta.md`](shareControls-pathRef-link-contractdelta.md). All `Approved` 2026-10-27.
**Branch:** `cursor/share-pathref-link-fe89` (base `main`). **Paths** relative to `_____________KDB3API/`; `tools/` is the repository root folder.
**Rules (this copy):** `.cursor/rules/core.mdc`, `cognos-adapter.mdc`, `error-handling.mdc` (no log-and-rethrow), `amd.mdc`, `naming.mdc`, `feature-structure.mdc` (cohesion, about 300 to 400 code lines; no import cap).

---

## Section A: echo (what this copy forces; no silent deviation)

| # | Handover says | This copy does | Why |
|---|---|---|---|
| A1 | New `getPathRef.js` in a `cognosAPI/dashboard/` folder | `getPathRef` (and its conversion helpers) inside `KDB3/js/core/cognosAPI/dashboard.js`, next to `getBoardId` | This copy merged the dashboard theme into one file (170 lines; `getBoardId` lives there and calls `getDashboardInfo` too). Reuses the file's `isThenable`. |
| A2 | Inner wrapper: host throw = log-and-rethrow | No try/catch in the inner ring; the throw propagates unchanged; ring 1 `readDashboardHostValue` logs once and returns `failed` / `DASHBOARD_READ_FAILED` | `error-handling.mdc` forbids log-and-rethrow. Same Outcome, one log line instead of two; a throw is still never turned into `null`. |
| A3 | Facet: one extra `readDashboardHostValue.bind(null, ctx, "getPathRef")` in `createDashboardAdapter.js` | `"getPathRef"` added to `VALUE_GETTER_NAMES` in `KDB3/js/core/services/cognosHost/facets/dashboard/read.js` | That list is the bind loop in this copy; identical result. |
| A4 | `shareControls/effects/*`, `config/shareLinkHashKeys.js`, `config/shareLabels.js`, `createShareControlsController.js` | `toolbarControls/shareButton.js` (click + mount check), `shareLink.js` (builder + dialog), `config.js` (`SHARE_LINK.hashKeys`, `LABELS.share`), new `toolbarControls/readUrlPathRef.js` | Share lives inside the flat `toolbarControls/` folder here. Mapping only. |
| A5 | "Do not change `KDB.js`" | Coordinator bumps the `this.version` line only | Planner order (project version-stamp convention). Not done by the implementer. |
| A6 | Contract-per-change | New deltas + this spec in `contracts/` and the deltas list in `contracts/README.md` | This copy's README says the per-change workflow is retired; the handover and the planner require it for this slice. |

Budgets measured on `main` `108aa73`: `shareButton.js` 122 lines / 5 imports (6 after), `shareLink.js` 118, `config.js` 110, `core/cognosAPI/dashboard.js` 170 (about 215 after), `read.js` 103. All far below 300 code lines.

---

## Section B: exclusive allowlist

The implementer edits **only** these files. Anything else is a stop-and-report.

| File | Change |
|---|---|
| `KDB3/js/core/cognosAPI/dashboard.js` | Add `getPathRef` (B1) |
| `KDB3/js/core/services/cognosHost/facets/dashboard/read.js` | `VALUE_GETTER_NAMES` += `"getPathRef"` right after `"getBoardId"` (B2) |
| `KDB3/js/dashboard/controls/toolbarControls/readUrlPathRef.js` | **New** (B3) |
| `KDB3/js/dashboard/controls/toolbarControls/shareLink.js` | Builder and dialog input (B4) |
| `KDB3/js/dashboard/controls/toolbarControls/shareButton.js` | Mount check and click order (B5) |
| `KDB3/js/dashboard/controls/toolbarControls/config.js` | `navFilter` and two labels (B6) |
| `tools/tests/share-pathref.test.mjs` | **New** (C1) |
| `tools/tests/ws-a-cognosapi.test.mjs` | Add `getPathRef` to `EXPECTED.dashboard` (sorted) and to the dynamic-name list |
| `tools/tests/ws-a-surface.test.mjs` | Add `getPathRef` to `FACET_KEYS.dashboard` |
| `tools/tests/ws-a2-edge-facets.test.mjs` | Add `getPathRef` to the dynamic getter names |
| `tools/tests/toolbarControls.test.mjs` | Facet stub `getPathRef` instead of `getBoardId`; share-click regex expects `https://bi.test/?perspective=dashboard&pathRef=…` and no `#`, `id=`, `objRef=` |
| `tools/smoke-checklist.md` | New block (C3); WS-A line "Share link (board id, BI base URL)" → "Share link (pathRef, BI base URL)" |

**Do not touch:** `KDB.js`; `workflows/**` (including `urlShare/readUrlParameterId.js`); `readShareReadOnlyTokenPresent` / `applyShareReadOnlyChrome` / `hasReadOnlyToken` / `readHashTokenValue` in `shareLink.js`; `getBoardId` and `getDashboardBiBaseUrl` bodies; the `getBoardId` facet getter; `boardIdMissing*` labels; `core/config/dashboardSettings.js`; footer; `.cursor/rules/**`; contracts and architecture docs (coordinator-owned); `tools/lib/**`; any golden JSON.

---

## Section B: per-file steps

### B1 `core/cognosAPI/dashboard.js`

- Factory-scope constant `PATH_REF_ROOT_BY_FIRST_NAME = { "Public Folders": ".public_folders", "Öffentliche Ordner": ".public_folders", "Team Folders": ".team_folders", "Teamordner": ".team_folders", "My Folders": ".my_folders", "Meine Ordner": ".my_folders" }` and the regex source `/\[@name='((?:\\'|[^'])*)'\]/g` (create a fresh `RegExp` per call or reset `lastIndex`; no shared global state across calls).
- Named factory-scope helpers, for example `readSearchPathNames(text)` (returns the names with `\'` → `'`) and `convertSearchPathToPathRef(searchPath)` (cognosAPI delta §1.2 steps 1 to 8, exactly; own-key lookup in the root map).
- `function getPathRef()`: `var info = __getDashboardAPI().getDashboardInfo();` → `info == null || isThenable(info)` → `null`; else `return convertSearchPathToPathRef(info.searchPath);`. No try/catch (A2). No `encodeURIComponent`.
- Publish `getPathRef: getPathRef` in `createDashboardApi`, right after `getBoardId`.
- Do not publish `getDashboardInfo` or the conversion helper.

### B2 `facets/dashboard/read.js`

Add `"getPathRef"` after `"getBoardId"` in `VALUE_GETTER_NAMES`. Nothing else (the frozen-name comment above the list already covers it).

### B3 `toolbarControls/readUrlPathRef.js` (new)

`define([], function () { "use strict"; ... return { readUrlPathRef: readUrlPathRef, readUrlSubView: readUrlSubView }; });`

- Own `readNavigationName()` (`performance.getEntriesByType("navigation")[0].name` or `null`; guard `typeof performance === "undefined"` and a missing `getEntriesByType`) and own document-location read (`typeof document !== "undefined" && document.location`). Forked on purpose; do not import from `shareLink.js` or `workflows/`.
- `readHashValue(hash, key)`: strip leading `#`; empty → `null`; the part after the first `?` if any, else the whole; `new URLSearchParams(part).get(key)`.
- `readCandidateValue(href, origin, key)`: `try { url = new URL(href, origin); } catch (_error) { return null; }` (value conversion, no log); query value `url.searchParams.get(key)` if non-empty string, else hash value if non-empty string, else `null`.
- `readUrlValue(key)`: candidates `[navigationName, location && location.href]` filtered to truthy, in that order; first non-empty string wins; else `null`. Origin = `location && location.origin || undefined`.
- `readUrlPathRef()` = `readUrlValue("pathRef")`; `readUrlSubView()` = `readUrlValue("subView")`.
- No console output. No `_KDB`.

### B4 `toolbarControls/shareLink.js`

- `buildShareDashboardLink(input)` with input `{ biBase, pathRef, subView, id, label, emptyParameterLabel, isKdbReadOnly }`: `URLSearchParams` set order exactly as contract §5 (perspective, pathRef, action, mode, subView only if non-empty string, nav_filter from `LINK.hashKeys.navFilter`, parameterId only if `id != null`, parameterLabel, readOnly). Return `String(input.biBase || "") + "?" + params.toString()`. Remove `id`, `objRef`, `#`.
- `openShareCopyDialog(_KDB, input)`: `linkInput` carries `biBase`, `pathRef`, `subView`, `id`, `label`, `emptyParameterLabel` (no `boardId`). Dialog call unchanged.
- Read-only functions below unchanged.

### B5 `toolbarControls/shareButton.js`

- Import `./readUrlPathRef.js` (append to the AMD list, binding `_readUrlPathRef`).
- `hasFacetMethods`: `getPathRef` and `getDashboardBiBaseUrl` (no `getBoardId`).
- `onShareClick` order per contract §4: read set → facet check (warn-once as today) → labels → `pathOutcome = facet.getPathRef()`; `pathRef = isOutcomePresent(pathOutcome) ? pathOutcome.data : _readUrlPathRef.readUrlPathRef()`; if `pathRef` is not a non-empty string → `showShareUnavailable(_KDB, labels.pathRefMissingTitle, labels.pathRefMissingMessage)` and return → bi-base predicate and alert as today → `subView = _readUrlPathRef.readUrlSubView()` passed only when a non-empty string → `openShareCopyDialog` with `pathRef` and `subView` instead of `boardId`.
- Keep the warn texts; the "stamped dashboardFacet methods are missing" messages stay as they are.
- Keep functions short (split a small `resolvePathRef(facet)` helper at factory scope if `onShareClick` grows past about 40 lines).

### B6 `toolbarControls/config.js`

- `SHARE_LINK.hashKeys`: add `navFilter: "true"`.
- `LABELS.share`: add `pathRefMissingTitle: "Teilen nicht möglich"` and `pathRefMissingMessage: "Der Dashboard-Pfad konnte nicht ermittelt werden. Bitte das Dashboard über das Cognos-Menü öffnen und erneut teilen."` (exact, with `ö`), after `boardIdMissingMessage`. Keep `boardIdMissing*`.

---

## Section C: tests, smoke, checks

### C1 `tools/tests/share-pathref.test.mjs` (new; `loadAmd`, stubs as in `ws-a-cognosapi.test.mjs` / `toolbarControls.test.mjs`)

Conversion (through `_KDB.cognosAPI.dashboard.getPathRef` with a stubbed `__getDashboardAPI`):
- The §1.1 `searchPath` → exactly the §1.2 output string.
- Root map, each of the six names: `/content/folder[@name='<root>']/folder[@name='A']/exploration[@name='B']` → `<mapped>/A/B` (first name skipped).
- `/content` without a root name keeps all names; a non-`/content` path without a root name → `null`; a root name with no further names → `null`; `/content` with no names → `null`.
- Escaped quote `[@name='O\'Brien']` → `O'Brien`.
- Already-converted `.public_folders/X/Y` (with surrounding spaces) → trimmed, unchanged; `.team_folders/…` unchanged.
- `searchPath` empty / whitespace / missing / object → `null`; number → `String`-based conversion (`null` for a bare number, since it does not start with `/content` or `.`).
- First name `constructor` or `toString` is not a root (→ `/content` rule).
- Info `null`, `undefined`, thenable → `null`; no `boardId` fallback (info with only `boardId` → `null`).
- Host throw (`getDashboardInfo` throws) → `getPathRef()` throws the same error (not `null`); through the facet: `failed` / `DASHBOARD_READ_FAILED` with the message.
- Facet: `ok` + string; inner `null` → `ok` + `data: null`.

Builder (`shareLink.js` `buildShareDashboardLink`):
- Exact string for a full input (with `subView`, `parameterId`, label with spaces, read-only): starts with `https://bi.test/?`, key order `perspective, pathRef, action, mode, subView, nav_filter, parameterId, parameterLabel, readOnly`; parameter order checked via `[...new URL(url).searchParams.keys()]`.
- No `#`; no `id` or `objRef` key; `nav_filter=true` always; `subView` absent when `undefined`, `null` or `""`; `parameterId` absent when `id == null`, present for `0`; `parameterLabel=leeres+Dashboard` when the label is empty or missing; `readOnly=1` only when read-only and after `parameterLabel`.
- Single encode: the §1.2 path gives `pathRef=.public_folders%2FSpielwiese%2F…%28KDB3+v33.1.004%29` (one `%2F`, `%28`, `+`; no `%252F`, no `%2528`) and `new URL(url).searchParams.get("pathRef")` equals the unencoded path.

Location parse (`readUrlPathRef.js`, stubs `performance`, `document`):
- Navigation name wins over `location.href`; query wins over hash within a candidate; hash with `?` and without; invalid navigation name falls through to href; nothing found → `null`; `subView` likewise; encoded `%2528` round-trips.

Click order (`toolbarControls/index.js` harness like `toolbarControls.test.mjs`, or a minimal `_KDB`):
- Facet path present → URLs use it; `readUrlPathRef` not consulted (location also holds a different `pathRef`; the facet's wins).
- Facet `ok` + `null` → location `pathRef` used. Facet `failed` → location used.
- Facet and location empty → exactly one `showAlert` with `{ title: "Teilen nicht möglich", message: <pathRefMissingMessage>, severity: "error" }`, no `showCopyable`, and the facet's `getBoardId` is never called (spy).
- Path present but bi-base missing → bi-base alert, no dialog.
- `subView` from the location appears in both URLs; absent otherwise.
- Bridge `{ id: null }` → no `parameterId`, title `dialogTitleWithoutSet`; Nur Lesen URL = `copyText` and `copyTextChecked`, edit URL = `copyTextUnchecked` without `readOnly`.
- Facet without `getPathRef` → button unavailable at mount, warn once, click no-op.
- No `location` / `history` mutation (stub `document.location` and check it is unchanged).

### C2 Static checks (must pass)

`node tools/check-all.mjs` green (syntax, imports and layering, doc paths, all tests). `node tools/line-report.mjs --module dashboard/controls/toolbarControls` and `--module core/cognosAPI`: no file over 400 code lines, no line over 180 characters. `node tools/german-identifiers.mjs` stays at zero.

### C3 Smoke block (`tools/smoke-checklist.md`)

Append `## 9) Share link with pathRef (2026-10)` with one block `### P3-SHARE-PATHREF` (English, like the rest of the checklist): probe snippet (cognosAPI delta §1.1 console function), Teilen click with and without a set, URL shape (`?perspective=dashboard&pathRef=` …, no `id=`/`objRef=`, no `#`, `nav_filter=true`), incognito cold-open without menu warm-up (no `getAccountInfo`), Nur Lesen chrome, parameter set restore from the query, missing-path alert (force: `getKDB().runtime.toolbarControls.dashboardFacet = Object.assign({}, getKDB().services.cognosHost.dashboard, { getPathRef: () => ({ ok: true, outcome: "ok", data: null }) })` on a location without `pathRef`), console clean.

### Stop conditions

Any file outside Section B; a needed change to `readUrlParameterId.js` or the read-only parser; a rule conflict not listed in Section A; `check-all` red for a reason outside this slice. Report instead of improvising.
