# Contract Delta: writeback T2 item 3 — close (no restore WP)

> Closes T2 pick-list item 3 (special/multi-filters outside `sels` and
> `pcfs`) as **product classification**, not as schema+restore.
> Parent `writeback.md` stays authoritative after the §4.6 / §4.6.1 / §6.3
> patches in this delta.

---

**Status:** `Approved` (PO vastenburg, 2026-08-16)
**Parent:** `contracts/writeback.md` §4.3, §4.6, §4.6.1, §6.3, §7
**Depends on:** `nativeMultiSelect.md` (`filt.pcfs`),
`specialSingleSelect-filterInstanceIdentity-contractdelta.md` (policy vs
`sels` values), `writeback-v2Map-contractdelta.md` §5 row 5,
`writeback-t2-item2-contractdelta.md` (close pattern)
**Type:** `shared-service contract delta`
**Authoring AI:** planner (Grok 4.6), 2026-08-16
**Related:** `contracts/futureTodo/t2-parameterSet-gaps-launch-prompt.md` item 3

---

## 1. Purpose

Do **not** add a fifth `filt.*` bucket, owner restore, or GET leftover-host
walk. Record PO product facts so T2 does not treat that leftover row as
missing NMS/SS glue.

No production JS in this WP. GET leftover-host diagnostics and parked-policy
persist stay out unless PO names them as a later WP.

---

## 2. PO decisions (2026-08-16)

| Slice | Decision |
|---|---|
| Kale / Jahr native multi-select | **Already `filt.pcfs`.** Not item 3. |
| Personengruppe / Dienststellenleitung **values** | **Already `filt.sels`.** `specialSingleSelect` is policy/visibility/parked; `selectionOwner` is `singleSelect`. SET already runs `specialSingleSelect/syncRequested` after sels resync (not a persist bucket). |
| Leftover host kinds (not sicht / dstl / sels / pcfs) | **Skip-by-design.** Live Personal_KDB dock keys all land in the four buckets. No owned multi-select outside kale. No `isMultiSelect`. |
| GET | **Silent omit** of leftovers (four collectors only). Accepted leftover, same class as item-2 GET silent-omit / `HOST_ITEM_UNKNOWN` silencing. Emitting `WRITEBACK_FILTER_KIND_UNSUPPORTED` or `WRITEBACK_SKIPPED_BY_DESIGN` on GET leftover hosts is **not** this WP. |
| MAP | Unchanged. Classify else-branch omit + `WRITEBACK_FILTER_KIND_UNSUPPORTED` (`writeback-v2Map-contractdelta.md` §5 row 5). |
| SET | Unchanged. No generic other-owner clear/restore (§6.3). Unknown `filt.*` key remains `WRITEBACK_INVALID_V3_PAYLOAD`. |
| Parked special policy | **Session-only.** Re-derive from rights + Sicht after SET. Do not persist `parkedSelectionsByInstanceId`. |

Does not close T2 items 4–6, `sichtChange`, or parent §11 decisions 3–5 / 7.

---

## 3. Names that must not merge

| Token | Meaning | v3 |
|---|---|---|
| kale / Jahr (`isNative`) | unowned native multi `{ d, u }` | `filt.pcfs` — required when present |
| special **values** | Personengruppe / Dienststellenleitung d/u | `filt.sels` — required SS parity |
| special **policy** | rights, visibility, parked, SET sync | not a `filt` key |
| leftover host kind | not claimed by sicht / dstl / SS / NMS | not in v3; skip |
| `WRITEBACK_FILTER_KIND_UNSUPPORTED` (MAP row 5) | unclassifiable v2 filter | map-only diagnostic |
| same code, other sites | dstl-without-sicht; SS bad `scopeType`; empty sels/pcfs omit; SS restore key collision | **do not retarget** this WP |
| `SINGLE_SELECT_HOST_ITEM_UNKNOWN` | SS inventory leftover (T2 item 6) | not writeback GET; do not merge |

Do not invent `filt.spc` / `filt.mult` / `isMultiSelect`.

---

## 4. Schema / GET / MAP / SET (normative after parent patch)

### 4.1 Four `filt` buckets stay the product set

`sicht`, `dstl`, `sels`, `pcfs` only. No new key. `specialSingleSelect` does
not collect or restore a snapshot.

### 4.2 Leftover host kinds

GET does not walk host items outside the four collectors. Classification:
**skipped by design**. Silent omit is accepted leftover. Tests must not
require GET to emit `WRITEBACK_FILTER_KIND_UNSUPPORTED` for those leftovers.

v2 map: classify else → omit + `WRITEBACK_FILTER_KIND_UNSUPPORTED` (already
live). Empty `name` before classify stays silent skip.

SET: no fifth owner. §6.3 clear/restore table unchanged. A future claimed
multi-select that is not kale needs a **new owner delta**, not this close.

### 4.3 specialSingleSelect

No schema change. Values stay in `sels`. Policy sync after restore stays
`specialSingleSelect/syncRequested` (`required: false`, `degradedAllowed:
true`). No GET. No `parameterSetClearRequested` / `parameterSetRestoreRequested`
on that owner. No history WP.

---

## 5. Parent patches (this WP)

Apply to `writeback.md` when this delta is **Approved**. Wording must **not**
require GET to emit a leftover-kind diagnostic (that would be production JS;
forbidden here).

- §4.3: **no wording change.** Four buckets already (`sicht` / `dstl` /
  `sels` / `pcfs`). Do not add a leftover-host walk or a fifth key.
- §4.6: leftover “multi-select/special filters outside `filt.sels` and
  `filt.pcfs`” → **skipped by design** (GET silent-omit; no restore; no fifth
  bucket; v2 map omit + `WRITEBACK_FILTER_KIND_UNSUPPORTED` row 5, unchanged).
  Kale stays the `pcfs` required-when-present row. Special **values** stay in
  the `sels` required row. Do not keep “unsupported tranche 1 / emit
  diagnostic” for this leftover.
- §4.6.1: **remove** “unsupported multi/special filters” from
  “diagnostic-required unsupported” (`get/map emits`). Put leftover host kinds
  in skipped-by-design with an explicit **GET silent-omit carve-out**. MAP
  unclassifiable v2 filters stay **map-only** `WRITEBACK_FILTER_KIND_UNSUPPORTED`
  (row 5). Do **not** copy the `"tbl"`/`"topn"` SET-tolerant `KIND_UNSUPPORTED`
  clause onto `filt` (unknown `filt.*` stays `WRITEBACK_INVALID_V3_PAYLOAD`).
  Do not move dstl-without-sicht / empty pcfs / SS `scopeType` into this
  carve-out.
- Required diagnostics bullet `WRITEBACK_FILTER_KIND_UNSUPPORTED`: v2 map for
  unclassifiable filter kinds; GET leftover-host silent-omit is accepted.
  Do **not** rewrite this as “GET never emits `KIND_UNSUPPORTED`” — GET still
  emits dstl-without-sicht and SS bad `scopeType`; those stay as-built.
- §6.3 last paragraph: keep “no generic other-owner clear” for the named
  table owners. **Replace** (do not keep) the sentence “Multi-select, special
  filters or future filter owners remain out of scope…”. Replacement: kale is
  already `pcfs`; special **values** are already `sels` (policy stays
  `syncRequested`, not a fifth owner); leftover host kinds are skip-by-design
  (this delta); only a **new claimed** owner needs a new delta.
- §7: keep “legacy other global/page filters → `filt.sels`”. **Add**
  unclassifiable v2 global/page filters → omit +
  `WRITEBACK_FILTER_KIND_UNSUPPORTED`. Do not rewrite “other → sels” into
  skip-all. Do not retarget map row 5.
- `writeback-v2Map-contractdelta.md` §8: T2 item 3 is this close, not a
  future restore WP. Map §5 row 5 unchanged.
- `t2-parameterSet-gaps-launch-prompt.md` item 3: closed 2026-08-16,
  pointer to this delta (after Approved).
- `post-nms-slim-futuretodo-launch-prompt.md`: one-line as-built after
  Approved (“T2 item 3 closed YYYY-MM-DD, skip-by-design”).

Do not add `_KDB.*`. Do not edit `.mdc`. Do not add owner restore deltas.
Do not edit `classifyFilterInstance.js` or filterDock classify (item 6 /
stale table — out).

---

## 6. Out of scope

- Production JS (GET leftover walk, map retarget, validate, SET phases)
- New `filt.*` key; persist parked/policy; special history
- GET emit of `WRITEBACK_SKIPPED_BY_DESIGN` / `KIND_UNSUPPORTED` on leftovers
- `HOST_ITEM_UNKNOWN` silencing (T2 item 6)
- T2 items 4–5 (`head.icon`, writeback barriers / `sichtChange`)
- T0/T1, T3 folder regroup, WP5, canvas-discovery
- Host-item create; flattening NMS dest-skip
- Stale `filterDock.md` classify table (contract sync only, not this persist close)

---

## 7. Acceptance

1. No new `filt.*` key in GET or SET v3.
2. `set(get())` sicht / dstl / sels (incl. special values) / pcfs unchanged.
3. v2 map else-branch still omit + `WRITEBACK_FILTER_KIND_UNSUPPORTED`.
4. Parent §4.6 no longer requires GET emit for leftover special/multi.
5. Cognos not required for this WP (no host behaviour change).

---

## 8. As-built leftover (honest, not this WP)

GET skip of leftover host kinds is **silent**. Parent §4.6.1 records that
as an accepted leftover. Aligning GET emit, or persisting special parked
state, is a later optional WP — not item-3 restore.
