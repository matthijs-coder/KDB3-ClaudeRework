# Contract Delta: writeback T2 item 4 — `head.icon`

> Promotes header logo persist/restore. Header GET/SET for `on` / `title` /
> `sub` / `subOn` stays as-is. This WP adds owner `iconKey` + v3 `head.icon`.
> Parents stay authoritative after the patches in §5.

---

**Status:** `Implemented` (awaiting PO Cognos, 2026-08-16)
**Parent:** `contracts/writeback.md` §4.2, §4.6, §4.7, §8, §12.13;
`contracts/header.md`; `contracts/header-parameterSetRestore-contractdelta.md`
**Depends on:** `header.md` CP-1, `header-parameterSetRestore-contractdelta.md`,
`writeback-v2Map-contractdelta.md` §6 (map copies icon **after** owner accepts)
**Type:** `feature module + shared-service contract delta`
**Authoring AI:** planner (Grok 4.6), 2026-08-16
**Related:** `contracts/futureTodo/t2-parameterSet-gaps-launch-prompt.md` item 4

---

## 1. Purpose

Kopfzeile-on always shows a logo `<img class="headerIcon">`. That image was
hardcoded `Stadt-wien.png` and was not in `_KDB.state.header`. v3 reserved
`head.icon` but treated presence as unsupported (owner `ok: false` aborted
SET). This WP makes the logo owner state and round-trips it.

Live Cognos `headerWidgetPropId.icons` is only `Default` / `Stadt-Wien` (same
PNG). No toolbox picker and no history in this WP.

**PO 2026-08-18:** one icon **forever**. Picker and icon-history are **never**
(not deferred). `iconKey` / `header/setIcon` / GET omit stay for the default
logo + unknown-stem degraded.

---

## 2. PO decisions (2026-08-16)

| # | Choice | Decision |
|---|---|---|
| 1 | Toolbox “Kopfzeilenicon ändern” | **Out.** KDB2 picker was hidden/broken; catalog is one PNG. **Forever (PO 2026-08-18).** |
| 2 | v3 `head.icon` | **String stem** without `.png` (KDB2 GET). Default aliases omitted. |
| 3 | Unknown stem | **Do not abort SET.** Fallback default + `WRITEBACK_HEADER_FIELD_UNSUPPORTED` + `outcome: "degraded"`. Wrong type → `WRITEBACK_INVALID_V3_PAYLOAD`. |
| 4 | Undo | **Out.** No user action without a picker. Restore stays `skipHistory`. **Forever (PO 2026-08-18).** |
| 5 | `header:confirmedChanged` | **Unchanged** (no `iconKey` on the fact). Selector for reads. |
| 6 | v2 map | **This WP, last.** Copy `topHeader.icon` → `head.icon` only after owner+GET+SET accept. |
| 7 | `header/dom/` → `view/` | **Out.** No folder regroup. |

---

## 3. Owner (`header`)

### 3.1 State

Add serialisable `_KDB.state.header.iconKey` (string). Default `"Stadt-wien"`
(PNG basename that the live chrome already loads).

`iconKey` is the file stem used in `img.src` and `data-icon-key`. It is **not**
an on/off flag. Header hidden (`removed`) keeps `iconKey` (same as `titleText`).
`newDashboard` / omitted `head` / `head.on: 0` restore reset it to default
(absolute restore).

### 3.2 Action

```js
_KDB.api.header.dispatch({
  type: "header/setIcon",
  payload: { source, iconKey }
});
```

Restore nested apply may pass `source: "writebackSet"` (existing restore
bypass of CP-1 `SourceEnum`). No kdbControl dispatch in this WP.

Reducer stores the resolved stem. Effects sync `.headerIcon` `src` /
`data-icon-key` from state. `domRefs.iconEl` is allowed. Handbook and Dataspot
imgs stay hardcoded (not `head.icon`).

### 3.3 Selector

`readHeaderIconKey(_KDB)` → string stem. Publish from `header/state/selectors.js`.

### 3.4 Resolve / aliases

Normalize: trim, strip trailing `.png` (case-insensitive), then:

| Input (case-insensitive) | Resolved `iconKey` | Known? |
|---|---|---|
| `""` / omit / `"none"` / `"Default"` / `"Stadt-Wien"` / `"Stadt-wien"` | `"Stadt-wien"` | yes |
| key or filename stem present in `_KDB.properties.headerWidgetPropObj.icons` | catalog filename stem | yes |
| any other non-empty string | `"Stadt-wien"` | **no** |

Missing properties object → default-only allowlist. `src` =
`resolveKdb3ExtImagesBase(_KDB) + iconKey + ".png"`.

### 3.5 History / events

No new history target or step key. `header:confirmedChanged` payload stays
CP-1 (status, subtitle, texts, source). Icon-only commits do not need to emit
the fact.

---

## 4. v3 / GET / SET / map

### 4.1 Encoding (`writeback.md` §4.7)

| Field | Type | Source | Omit | Sentinel |
|---|---|---|---|---|
| `head.icon` | string (PNG stem, no path, no `.png`) | `header.iconKey` | omit when default alias or when `head.on !== 1` | `null` / `""` / `"none"` drop in normalize; `.png` strip at owner / GET / v2 map; `"Default"` / `"Stadt-Wien"` / `"Stadt-wien"` = default aliases (not omission sentinels) |

`head.icon` without `head.on` stays invalid (same as title/sub).

### 4.2 Validate

- Present `head.icon` must be a string → else `WRITEBACK_INVALID_V3_PAYLOAD`.
- Presence of a string is **no longer** `WRITEBACK_HEADER_FIELD_UNSUPPORTED`.
- Unknown stem is **not** a validate failure (owner allowlist). Keep
  `WRITEBACK_HEADER_FIELD_UNSUPPORTED` in the SET-validate tolerant list for
  owner-emitted leftovers.

### 4.3 GET

`collectHeaderFooter`: when `on === 1` and `iconKey` is not a default alias,
emit `head.icon` as the stem. Idle omit whole `head`. `on: 0` omits `icon`.

### 4.4 SET restore

`header/parameterSetRestoreRequested` still maps on/title/sub/subOn.

| `head.icon` | Owner |
|---|---|
| omitted on `on: 1` | default `"Stadt-wien"` (absolute) |
| default alias | default, `{ ok: true }`, no diagnostic |
| known non-default | apply stem via `header/setIcon`, `{ ok: true }` |
| unknown string | fallback default, diagnostic `WRITEBACK_HEADER_FIELD_UNSUPPORTED`, `{ ok: true, degraded: true }` |
| apply/DOM throw | `{ ok: false }` + `WRITEBACK_HEADER_RESTORE_FAILED` |

`ok` is **not** `diagnostics.length === 0`. Unsupported icon must not fail
the required `headerRestore` phase. `writebackSet` copies owner `diagnostics`
on `ok: true` and honours `result.degraded` (phase degraded → RestoreResult
`outcome: "degraded"`).

Add `WRITEBACK_HEADER_RESTORE_FAILED` to `schema/errorCodes.js` and parent §8
(already used by the owner). Header restore phase uses that `failureCode`.

### 4.5 v2 map

`mapV2HeaderFooter`: if `topHeader.icon` is a non-empty string, copy the stem
(strip `.png` if present) onto `head.icon`. Do **not** omit it and do **not**
emit `WRITEBACK_HEADER_FIELD_UNSUPPORTED` for presence. Empty/null stays
silent omit. Unknown stems are classified at SET (owner), not at map.

---

## 5. Parent patches (this WP)

- `header.md` §2.1: add `iconKey`. §3 `domRefs`: logo img. §5: `header/setIcon`.
  §6: `readHeaderIconKey`. §7.1: payload **unchanged**. §10: picker, history,
  handbook/dataspot, `dom/` rename out of scope.
- `header-parameterSetRestore-contractdelta.md`: map `head.icon`; remove
  “invalid in tranche 1”; failure table = unknown → degraded, not SET abort.
- `writeback.md` §4.2: drop “unsupported because CP-1 has no icon field”;
  add stem/omit rules. §4.6 `head` row: icon required when non-default.
  §4.7: `head.icon` row. §8: `WRITEBACK_HEADER_RESTORE_FAILED`. §12.13: icon
  restored through owner.
- `writeback-v2Map-contractdelta.md` §6: copy icon, not omit. §8: remove
  `head.icon` persist from out-of-scope.

Do not add `_KDB.*`. Do not edit `.mdc`. Do not start T3 folder regroup.

---

## 6. Out of scope

- Toolbox icon dropdown; header icon history/undo
  (**never**, PO 2026-08-18 — one icon)
- Renaming `header/dom/` to `view/`
- Benutzerhandbuch / Dataspot imgs
- Text-widget `KDB_headerWidget` / `selectedOptions.icons` (not `head.icon`)
- T2 items 3 and 5; T0/T1; WP5; canvas-discovery; host-item create
- Flattening NMS dest-skip; `sichtChange`

---

## 7. Acceptance (Cognos after implement)

1. `set(get())` with default logo: no `head.icon` on GET; chrome still shows
   Stadt-Wien.
2. v3 `{ head: { on: 1, icon: "Stadt-wien" } }` restores without
   `WRITEBACK_HEADER_FIELD_UNSUPPORTED` and without SET abort.
3. v3 `{ head: { on: 1, icon: "no-such-icon" } }`: SET `ok: true`,
   `outcome: "degraded"`, diagnostic `WRITEBACK_HEADER_FIELD_UNSUPPORTED`,
   logo falls back to Stadt-Wien; title/sub still restore.
4. v2 `topHeader.icon` maps onto `head.icon` (no map-phase unsupported for
   presence); default stem omits on the following GET.
5. `head.icon: 1` (non-string) fails validate (`WRITEBACK_INVALID_V3_PAYLOAD`).
6. No toolbox row, no new history step, no `header:confirmedChanged` shape
   change.

Line budget: JS ≤150, new files verb+noun, no `handle*` / `*Support` /
`helpers|shared|common`. Split `createHeaderReducer.js` rather than exceed 150.
