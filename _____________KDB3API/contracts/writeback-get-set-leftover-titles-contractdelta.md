# Contract Delta: leftover titles `WritebackTabel_Get` / `WritebackTabel_Set`

> PO vastenburg 2026-09-11: external writeback extension now CRUDs two leftovers (`WritebackTabel_Get`, `WritebackTabel_Set`) on page 0. Old `WritebackTabel` is gone. KDB must skip launchpad routing and keep leftover-CSS visibility identical to the old writeback table. No CRUD, no persist/bridge edits.

---

**Status:** `Implemented` — 2026-09-11
**Type:** `shared service contract delta` (widgetBase + leftover CSS)
**Authoring AI:** Cursor Grok 4.6 (captain), 2026-09-11
**Reviewed by:** army dual explore (minimal allowlist) + PO lock

**Parents this delta amends**

| Parent | Slice |
|---|---|
| `contracts/widgetBase.md` | §7 `WRITE_BACK_TITLES` / `WRITEBACK_TABLE` skip |
| `contracts/leftover-widgets-developer-hide-contractdelta.md` | §3 writeback `aria-label` excludes |

---

## 1. Purpose

After Cognos rename, exact-title skip and leftover-hide excludes still listed only `WritebackTabel` / `WritebackTable`. New titles would be routed to `dataTables` and hidden. This WP adds the two new normalized titles / aria-labels. Persist-landing stays page-based.

---

## 2. Product lock

| # | Lock |
|---|---|
| 1 | Titles exact: `WritebackTabel_Get`, `WritebackTabel_Set`. Both page 0, visible like old writeback. |
| 2 | Skip is `WRITE_BACK_TITLES` exact normalize (trim, lower, strip spaces). No prefix rule. |
| 3 | Keep legacy `writebacktable` / `writebacktabel` and old CSS `:not()` — hygiene later, not this WP. |
| 4 | No `tables.js` rename, no `launchpad: false` on writeback row, no `load: true`, no HideData JS, no v2 map edit. |
| 5 | Do not touch persist-landing, bridge, collect, HideSpot, hide-rule structure, hint CSS. |

---

## 3. Files (exclusive)

**Edit**

- `KDB3/js/dashboard/widgets/widgetBase/config/launchpadChannels.js` — append `"writebacktabel_get"`, `"writebacktabel_set"` to `WRITE_BACK_TITLES`.
- `KDB3/css/widgets/leftoverWidgets.css` — append `:not([aria-label="WritebackTabel_Get"]):not([aria-label="WritebackTabel_Set"])` on the hide subject only.

**Do not touch:** `resolveLaunchpadRoute.js`; `tables.js`; `mapV2WidgetEntry.js`; writeback GET/SET/bridge; leftover hint block; `KDB.js`; `.mdc`; git.

---

## 4. Acceptance

1. Boot: both leftovers stay on canvas page 0 (not launchpad / HideSpot).
2. Entwicklermodus off: both visible.
3. Save from tab 2+: persist-landing unchanged (page 0).
