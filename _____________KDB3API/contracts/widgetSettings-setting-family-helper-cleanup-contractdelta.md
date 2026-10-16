# Contract Delta: setting-family helper cleanup (third A is live)

> Spends Family §5 *may* now that `iterator` / `zoom` exist. Not a new control. Not `_KDB.services.settingFamily`.
> PO vastenburg 2026-09-13: GO on this theme after WP2 leftover cleanup.

---

**Status:** `Implemented`
**Owner module / service:** `widgetSettings` (gate text); no new owner
**Type:** `cleanup contract delta` (policy close)
**Authoring AI:** Cursor Grok 4.6 captain, 2026-09-13
**Reviewed by:** army map + proposal + re-stress REC-STANDS. PO GO 2026-09-13.
**Related rules:** `feature-structure.mdc`, `module-public-api.mdc`, `kdb-object.mdc`, `naming.mdc`, `amd.mdc`
**Family:** unchanged machines. KEEP-all-vis booleans vs grouping KEEP-specialize vs Family B stay split.

**Parents this delta amends** (one-liners **after** PO Approved — not JS)

| Parent | Slice |
|---|---|
| `contracts/widgetSettings-setting-family-contractdelta.md` §5 | Third A is live. Helper *may* is **spent**. Rec: **no helper**. Leftover four-site copies stay envelopes. `assignOptionalFlag01` stays GET-only. |
| `contracts/widgetSettings-wp2-leftover-cleanup-contractdelta.md` | Out #4 stays: do not merge the four-site boolean copies. |

---

## 1. Purpose

Family §5 allowed **one** helper after a third A control. That control is live. This WP decides whether to add it or close the *may*. It does **not** invent a registry, a third family, or a public service.

## 2. Diagnose (A vs B)

| Question | Verdict |
|---|---|
| Contract ≠ live (missing helper)? | **Not A.** §5 is *may*, not must. |
| Four `typeof === "boolean"` blocks = leftover mess? | **Not A.** WP2 leftover hunt: justified **envelopes** at two owners (snapshot vs widgetVis pipeline). Already renamed; not dead. |
| GET needs a family helper? | **Not A.** `assignOptionalFlag01` already emits `vals` / `iter` / `wzbar`. Dumb flag01, not a family file. |
| Inherit-delete needs extract? | **Not A.** One site in `commitWidgetSettingValue` (`isBooleanInheritAbsence`). Grouping delete is a different predicate. |
| `_KDB.services.settingFamily`? | **Forbidden** (Family §6). |

Silent contract↔code drift is not created by declining the *may*.

## 3. Live map (do not swallow)

KEEP-all-vis booleans: `showValues` / `iterator` / `zoom`. Grouping is A KEEP-specialize (token + CLEAR) — **not** in a boolean helper.

| Site | Job | Helper? |
|---|---|---|
| `appendExplicitVisOverrides` (snapshot) | widgetSettings snapshot fill | envelope |
| `copyOptionalVisOverrides` (readEffective) | widgetVis payload/API → settings | envelope |
| `handleApplyStartupSettings` resolveSettings | startup / historyReplay pipeline | envelope — leftover: **inline stay** |
| `parameterSetBindingHelpers` readCommitted | restore bind envelope | envelope — leftover: **inline stay** |
| `handleApplySetting` resolveSettings | Frozen **149** — **showValues only** | **must not** (KEEP for iterator/zoom is `getState()` overlay) |
| `assignOptionalFlag01` | GET `0\|1` | already extracted |
| `commitWidgetSettingValue` boolean inherit | delete-key | already local |
| `VIS_STARTUP_KINDS` | B + switcher only | **do not** add A keys |

A copier imported by both widgetSettings and widgetVis is either a `module-public-api` leak or a service. Walls are not forcing it (snapshot 142, context 71, startup 127 AMD 7).

## 4. Proposal series

### Q1 — What is the helper?

| Opt | Shape | Rec |
|---|---|---|
| **A** | **None.** Docs-close §5. | **REC** |
| B | Local AMD `copyOptionalBooleanOverrides` (3 booleans) under `widgetVis/effects/` only | Fallback if PO insists on JS |
| C | Extract `isBooleanInheritAbsence` (one call site) | Reject — theater |
| D | Call `assignOptionalFlag01` “the family helper” | Reject — wrong job; rewrites WP2 history |
| E | `_KDB.services.settingFamily` / registry / new `_KDB` key | **Forbidden** |

### Q2 — Scope if any JS?

`showValues` + `iterator` + `zoom` booleans **only**. Not grouping. Not Family B.

### Q3 — New `_KDB` namespace?

**No.**

## 5. Recommendation (captain)

**Option A — no JS.**

Third A is live; the *may* is spent by **choosing none**. Four-site copies are two-owner envelopes. GET and inherit-delete already have their one-site helpers. A new AMD file cannot legally serve all four sites without a service or an internals leak. Frozen showValues / `handleApplySetting` stay shut.

If PO picks **B**: widgetVis-local, three booleans, no grouping, no Family B, no Frozen files, snapshot stays inline. Political spend of §5, not a leftover FAIL. Needs a later execution spec; not this Draft’s default.

## 6. Product (if A Approved)

No canvas. No JS. Family machines unchanged.

§5 one-liner after Approved:

> Third A (`iterator` / `zoom`) is live. Cleanup WP **declined** a shared helper: four-site boolean copies stay owner envelopes; `assignOptionalFlag01` stays GET-only; inherit-delete stays in commit. No `_KDB.services.settingFamily`. A later **fourth** A still copies the §5 checklist (not a registry).

## 7. Anti-goals

- `_KDB.services.settingFamily` / `variesByVisType` / registry
- Fold grouping or Family B into a boolean copier
- Edit Frozen showValues apply / `handleApplySetting`
- Seed `VIS_STARTUP_KINDS` with A keys
- Reopen leftover cleanup #4 as a FAIL
- New `_KDB` top-level or `api` read* surface

## 8. Out

Grouping chrome/CLEAR, toast, D2 KEEP/`vals`, compact keys, bind kind-set, Prognose Zoomleiste chrome (evening: **on**).

---

## Approval log

| Date | Status | Notes |
|---|---|---|
| 2026-09-13 | `Draft` | Army rec Option A (no JS). PO pick A or B. |
| 2026-09-13 | `Approved` → `Implemented` | PO: if rec stands, GO. Army re-stress REC-STANDS. Parent §5 one-liner applied. No JS. No canvas. |
