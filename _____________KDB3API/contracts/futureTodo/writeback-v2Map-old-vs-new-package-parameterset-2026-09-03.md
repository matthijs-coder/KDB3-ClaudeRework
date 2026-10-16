# Future todo — v2Map old vs new package parameter-set (Cognos)

**Status:** `Open` 2026-09-03 (PO vastenburg). No fixture on hand. Do **not** block same-package mapping green.

**Parents:** `contracts/_archive/writeback-v2Map-contractdelta.md` A1 / A3; host checklist items 2–3 in `contracts/_archive/writeback-mapping-restore-ux-implement-captain-handoff-2026-09-03.md`.

## Closed 2026-09-03 (this chat)

- Same-package `set(get())` baseline: Dienststelle false C4 toast **gone** after leaf-id restore lookup (`dienststelle-parameterSetRestore-contractdelta.md` §4.2).
- Mapping treated **green under reservation** until the checks below run.

## Still required when an old parameter-set exists

1. v2 **same-package** two-table GFO, either key order: skip remap; Sicht + kale + dstl + vis OK.
2. v2 **alt-first cross-package** (if fixture exists): no GFO collapse; kale members stick (remapped `u`); vis binds.

Do not reopen A1 name-match product. Do not mark v2Map `Approved — Cognos green` until a dated PO pass of these items (A3) plus remaining SET UX host items 4–7 when those fixtures exist.

## Out of this todo

GET leaf→MUN persist; C4/C5 recast; hardcoded MUN in `bwOldToNewMap`.
