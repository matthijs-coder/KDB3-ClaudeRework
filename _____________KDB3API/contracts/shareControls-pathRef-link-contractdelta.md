# Contract delta: `shareControls` outbound link = native query with live `pathRef`

> Changes the **open family** of the Teilen link from the hash form (`biBase#…&id=<boardId>&objRef=<boardId>…`) to the native Cognos query form with the live content path (`biBase?perspective=dashboard&pathRef=…`).
> Inner read: [`cognosAPI-dashboardPathRef-contractdelta.md`](cognosAPI-dashboardPathRef-contractdelta.md). Facet: [`cognosHost-dashboardPathRef-contractdelta.md`](cognosHost-dashboardPathRef-contractdelta.md). Mechanical allowlist: [`shareControls-pathRef-link-execution-spec.md`](shareControls-pathRef-link-execution-spec.md).
> Parent: [`shareControls.md`](shareControls.md) (§0, §5, §8, §9, §10.2, §10.3 are patched to this law). The hash/`id`/`objRef` text in `_archive/shareControls-read-only-link-contractdelta.md`, `_archive/cognosAPI-dashboardShare-contractdelta.md` and `_archive/cognosHost-dashboardShare-contractdelta.md` is history.

**Status:** `Approved`
**Owner module:** `shareControls` (`KDB3/js/dashboard/controls/toolbarControls/`: `shareButton.js`, `shareLink.js`, `config.js`, new `readUrlPathRef.js`)
**Authority:** PO handover 2026-10-27 (§2 product lock and §4 conversion are binding and not renegotiated; source copy green in Cognos incognito cold-open 2026-10-27).
**Related rules:** `cognos-adapter.mdc`, `feature-structure.mdc`, `error-handling.mdc`, `naming.mdc`, `amd.mdc`.

---

## 1. Why

A hash link with the dashboard `id` fails on a cold open (incognito, dashboard not opened through the Cognos menu that day): Glass login throws `TypeError: r.getAccountInfo is not a function` in `_processSuccessfulLogin`. That is Cognos Glass, not KDB restore; KDB does not patch `bundle.js`. The native Cognos share (query + `pathRef`) cold-opens, also with the KDB tokens appended (PO proof). The old builder matched its contract; the contracted open family was the wrong one. The fix is the protocol.

## 2. Product lock (do not renegotiate)

| Topic | Decision |
|---|---|
| Open family | Native query (`?`), not hash (`#`) |
| Identity | Live `pathRef`. **No** `id` / `objRef` on the new URL |
| Hardcoded path | Forbidden: no drill-through `baseLinks`/`dashboardSettings` links, no DEV/TEST/PROD folder string |
| `pathRef` source | Facet `getPathRef` first; then location parse. First non-empty string wins |
| Missing path | German alert, **no** dialog, **no** old ID URL |
| `nav_filter` | Always `true` |
| `subView` | Only when the location parse finds a non-empty value; otherwise omitted |
| KDB tokens | `parameterId` (only with a chosen set), `parameterLabel` always, `readOnly=1` for Nur Lesen |
| Click | No `location` / `history` mutation. Two strings (edit + Nur Lesen) |

Target form:

```text
<biBase>?perspective=dashboard&pathRef=<live>&action=view&mode=dashboard
  [&subView=<tab>]&nav_filter=true
  [&parameterId=<id>]&parameterLabel=<label|leeres+Dashboard>[&readOnly=1]
```

`biBase` = `…/cognos/bi/` with one trailing `/` (existing `getDashboardBiBaseUrl`, unchanged). `URLSearchParams` encodes once; the inner ring and the location parse return the path **unencoded**.

## 3. Location parse (`readUrlPathRef.js`)

New file `KDB3/js/dashboard/controls/toolbarControls/readUrlPathRef.js`, one AMD module, no imports, returning `{ readUrlPathRef, readUrlSubView }` (both `() -> string | null`).

- A/B ladder, **forked** (not imported, not shared): candidate A = `performance.getEntriesByType("navigation")[0].name`, candidate B = `document.location.href`; for each candidate in that order: query (`new URL(candidate, location.origin).searchParams.get(key)`), then hash (strip `#`; if the hash holds `?`, the part after it; `URLSearchParams(...).get(key)`). The first non-empty string wins; otherwise `null`.
- A candidate that is not a parseable URL is skipped (the local `try/catch` around `new URL` converts the throw into "skip"; no log per candidate; one `console.warn("[shareControls.readUrlPathRef] invalid URL candidates", { count })` when every candidate was unparseable). Missing `performance` / `document` → that candidate is absent.
- `URLSearchParams.get` decodes once, so the value is unencoded and the builder's single encode round-trips it (a native `%2528` stays `%2528`).
- Keys: `pathRef`, `subView`. Do **not** import `readUrlParameterId.js` or the read-only token reader; do **not** create a `helpers/`, `common/` or `shared/` parser. The three A/B parsers (writeback `parameterId`, share `readOnly`, share `pathRef`/`subView`) stay separate.
- After an ID-open the location is query-only (`?id=&objRef=&boardId=`) without `pathRef`: the parse alone cannot serve Teilen there, which is why the facet comes first.

## 4. Click order (Teilen, `shareButton.js` `onShareClick`)

1. `_KDB.services.writebackBridge.readSelectedParameterSet()` → `{ id, label }` as-is. `id == null` → no `parameterId` (not an error).
2. The stamped facet must have `getPathRef` and `getDashboardBiBaseUrl` (this mount/click check replaces `getBoardId`). Missing → existing warn-once, no dialog.
3. `pathOutcome = facet.getPathRef()`. Present = `ok === true` and non-empty string `data`.
4. Not present → `readUrlPathRef()`. A non-empty string wins.
5. Still empty → `message.showAlert({ title: pathRefMissingTitle, message: pathRefMissingMessage, severity: "error" })` and return. No dialog, no `getBoardId`, no `id` / `objRef`.
6. `getDashboardBiBaseUrl()` with the same present predicate. Fail → existing `biBaseMissingTitle` / `biBaseMissingMessage` alert, no dialog.
7. `readUrlSubView()`; pass it on only when it is a non-empty string.
8. `openShareCopyDialog` with `pathRef` and optional `subView` (instead of `boardId`): two URLs, Nur Lesen default ON (unchanged dialog shape).

The click never calls `_KDB.cognosAPI`, `__getDashboardAPI`, `getBoardId`, `_KDB.utils.readCurrentTab` or a tabs facet.

## 5. Builder (`shareLink.js` `buildShareDashboardLink`)

`biBase + "?" + params.toString()` with `params = new URLSearchParams()` set in this order:

1. `perspective` = `dashboard`
2. `pathRef` = the live path (validated by the caller)
3. `action` = `view`
4. `mode` = `dashboard`
5. `subView` only when it is a non-empty string
6. `nav_filter` = `true`
7. `parameterId` only when the bridge `id != null` (`String(id)`)
8. `parameterLabel` always: the bridge label when non-empty, else `emptyParameterLabel` (`leeres Dashboard`; spaces become `+`)
9. `readOnly=1` after `parameterLabel` when Nur Lesen

**Never** `id` or `objRef`. **No** `#`. One encode (no `encodeURIComponent` before `URLSearchParams`). Constant values come from `config.js` `SHARE_LINK.hashKeys` (`perspective`, `action`, `mode`, new `navFilter: "true"`; the key name `hashKeys` is kept).

## 6. Labels (German, exact)

Added to `LABELS.share` (`toolbarControls/config.js`, merged with `_KDB.config.labels.de.shareControls`):

| Key | German |
|---|---|
| `pathRefMissingTitle` | `Teilen nicht möglich` |
| `pathRefMissingMessage` | `Der Dashboard-Pfad konnte nicht ermittelt werden. Bitte das Dashboard über das Cognos-Menü öffnen und erneut teilen.` |

`boardIdMissingTitle` / `boardIdMissingMessage` stay in the labels (unused by this click). The facet keeps its `getBoardId` getter in this slice.

## 7. Inbound compatibility (no change)

- `parameterId` may now arrive in the query: `KDB3/js/workflows/parameterSet/urlShare/readUrlParameterId.js` is already navigation-then-href and query-then-hash (writeback `parameterId` delta §3, archived). Not changed.
- `readOnly=1`: `shareLink.js` `readShareReadOnlyTokenPresent` / `applyShareReadOnlyChrome` already check the query before the hash. Not changed.
- `parameterLabel` is never consumed inbound.
- `pathRef`, `subView`, `nav_filter` are consumed by Cognos only.

## 8. Deliberately not

Patch Glass/`bundle.js`; Content Manager REST when `searchPath` exists; scrape the native share button; merge the `searchPath` conversion with the location parse in one ring; merge the three A/B parsers; reuse drill-through `pathRef` links (different product); confuse the footer URL (`https://<host>/cognos`, no `/bi/`) with the share `biBase`; take `subView` from `readCurrentTab` or a tabs facet; ID URL as fallback; a `shareService`.

## 9. Acceptance (PO, Cognos)

Incognito cold-open of the `pathRef` link built by Teilen, without opening the dashboard through the Cognos menu that day: the dashboard loads, no Glass `getAccountInfo` error; Nur Lesen and a chosen parameter set still apply; without a resolvable path the German alert shows and no ID link is offered. Steps: `tools/smoke-checklist.md` block `P3-SHARE-PATHREF`. **Merge gate:** the PO probe (cognosAPI delta §1.1) in this copy's Cognos shows a `searchPath` key of the same shape.

## Approval log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| `2026-10-27` | `Approved` | Coordinator per PO handover (§2 lock) | Paths mapped to the refactored `toolbarControls/` tree; behaviour as in the source copy. |
