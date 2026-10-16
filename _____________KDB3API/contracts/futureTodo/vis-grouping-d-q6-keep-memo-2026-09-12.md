# KEEP memo — grouping writeback Q6 (`grp`)

**Status:** **Q6-A locked** PO vastenburg 2026-09-12. D text: grouping-delta §13 `Draft`. Not Approved. Not JS.
**Date:** 2026-09-12
**Author:** Cursor Grok 4.6 captain
**PO:** vastenburg

Restore pass 3 may still refine the D *implementation* table. It does not decide Q6.

---

## Diagnose

| Question | Verdict |
|---|---|
| Contract ≠ live tokens / chrome / KEEP? | **No (not A).** Live = F §12.1–§12.3. |
| Logic exists but writeback missing? | **Yes (B)** for GET/SET `grp`. |
| Q6 itself? | **Open product fork.** Not A, not B. No `grp` in live writeback. |

Live machine (already Implemented): explicit `settings.grouping` = one of five grain tokens; inherit = **absent**. Chrome `inherit` (Diagrammstandard) is never stored. `groupingMeta` deletes with the grouping key.

**Live tokens (do not invent `jahrMonat`):** `stichtag` · `jahr` · `jahrStichtag` · `stichtagProJahrH` · `stichtagProJahrV`.

**Do not pick `grp` member values here.** That is the D product table after Q6 lock.

---

## What Q6 is

GET omit rule for a future vis field `grp` (≤5, not `dim`). `SCHEMA_VERSION` stays 3.

`writeback.md` §4.5.1 “omit when the owner default applies” is **Family B / `dim`/`topn`**. `vals` is the Family A inherit exception. That sentence **does not** decide Q6.

Family A SET stays `hasOwnProperty` / missing → leave absent. **Hybrid dropped:** GET omit-equals-`defaultGrain` + SET reconstruct token = Family B `commitRequiredSetting`. Forbidden for grouping.

---

## Option Q6-A — omit when inherit only (same as `vals`)

GET omits `grp` only when grouping is absent. Persist the explicit token even when it equals that vis `defaultGrain`.

SET missing → leave absent (inherit). Present legal token → commit explicit.

**Keeps** Family A 3-state, B/F “click writes the token”, F KEEP-specialize after GET→SET.

**Costs** a slightly larger payload when the user clicked the catalog default grain.

---

## Option Q6-B — omit when inherit **or** token equals that vis `defaultGrain`

GET omits if absent **or** stored token === current vis `defaultGrain`.

SET still Family A (missing → leave absent). So omit-on-GET **becomes inherit-on-SET**.

**Only coherent if PO explicitly wants: “clicking the catalog default grain = inherit.”** That **contradicts** locked B/F (click writes explicit; inherit is only Diagrammstandard / delete-key).

---

## Three KEEP cases (not Line `stichtag` → pie)

Do **not** sell Line `stichtag` → pie. Stored `stichtag` is Line-only; pie CLEARs it either way.

Allowlists (§12.2): Line = all five; pie/Stacked = five minus `stichtag`; List = `jahr` \| `jahrStichtag`; Prognose empty. `defaultGrain`: Line `stichtag` · pie/Stacked `jahr` · List `jahrStichtag`. Cases 1–3 only need `stichtag` / `jahr` / `jahrStichtag`. H/V are legal on Line/pie/Stacked; they are not Q6 deciders.

### 1. Same-vis chrome collapse

Line user clicks **Stichtag** (explicit = Line `defaultGrain`).

| | After GET→SET | Chrome |
|---|---|---|
| **Q6-A** | still explicit `stichtag` | **Stichtag** |
| **Q6-B** | inherit | **Diagrammstandard**, not Stichtag |

### 2. Pie/Stacked → Line

User clicks **Jahr** (explicit = source `defaultGrain` `jahr`). Token is legal on Line.

| | After GET→SET, then switch Line | Effective on Line |
|---|---|---|
| **Q6-A** | KEEP `jahr` | **Jahr** |
| **Q6-B** | inherit | Line **Stichtag** |

### 3. List → XOR (strongest List edge)

User clicks **Jahr \| Stichtag** (explicit = List `defaultGrain` `jahrStichtag`). Token is legal on Line/pie/Stacked.

| | After GET→SET, then switch Line/pie/Stacked | Effective on XOR |
|---|---|---|
| **Q6-A** | KEEP `jahrStichtag` | **Jahr \| Stichtag** |
| **Q6-B** | inherit | Line `stichtag` / pie·Stacked `jahr` |

---

## Prognose / illegal token (D table, not Q6)

Prognose: no chrome; F CLEAR on enter → inherit. GET omit. SET missing → leave absent. SET present `grp` on Prognose (empty allowlist), or illegal token on that vis (e.g. `stichtag` on List) → CLEAR / leave inherit, not KEEP.

Same under A or B.

---

## Recommendation (not Approved)

**Recommend Q6-A.** It is the only option that keeps the 3-state, B/F chrome, and F KEEP after GET→SET. Q6-B is a product change that collapses explicit-equals-`defaultGrain` into inherit.

**PO locks Q6.** E later: compare `grp` to `vals`; do not redesign `vals`.

Army sources: collect `46e2bada`; schema `a2662153`; tokens `c5bfcd45`; Q6 draft `61809873`.

---

## Stress-test 2026-09-12 (consequences / hazards / overdesign / repetition)

**Verdict: GO on Q6-A.** No FAIL that picks Q6-B. Extra rules below are **D product-table**, not a third Q6 option.

| Pass | Result |
|---|---|
| Consequences | A closes today’s writeback hole B. B would fail locked B/F. |
| Hazards | No FAIL. Stamp CLEAR is panel-gated — do not “rely on stamp”. |
| Overdesign | A is lighter GET than B. No Family A helper / new service. |
| Repetition | Copy `vals` locally (~1–5 lines × 6 sites). No wall. Do not extract. |

**D table must list (after Q6 lock):**

1. GET omit inherit-only (Q6-A). Also **omit / do not emit** a token the **current** `type` would F-CLEAR (illegal on that vis). That is F CLEAR, **not** Q6-B (Prognose `stichtag` equals `defaultGrain` but allowlist is empty → omit-illegal).
2. SET: `hasOwnProperty` + `commitDirect` grain; missing → leave absent. **CLEAR illegal-for-`type` on the record** (Prognose any token; `stichtag` on List). Do not wait for `stampPanelVisType` (returns if no panel — share / read-only / `hidWs`).
3. Validate: closed five-token special-case (like `vals` 0\|1). `"inherit"` is not a normalize sentinel. Per-vis allowlist in **schema** = overdesign / do not `WRITEBACK_INVALID` the whole payload.
4. Restore order: `grp` after `type`, before stamp. Do not touch `showValues`.
5. Do **not** copy `assignOptionalString` or `commitRequiredSetting` (that is Q6-B / Family B).
6. No `groupingMeta` v3 field. No snapshot / chrome / overlay / `KDB.js` / `bindWidgetSettingsPanel.js` / stamp F edit. `SCHEMA_VERSION` stays 3. v2 omit `grp`. `newDashboard` inherit.
7. E later: `vals` KEEP-all-vis vs `grp` KEEP-specialize — document, do not unify.
