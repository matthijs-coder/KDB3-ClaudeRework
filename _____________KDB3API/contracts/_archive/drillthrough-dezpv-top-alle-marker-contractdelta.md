# Contract Delta: DEZPV top `|ALLE` root uses bare `#ALLE_GG#`

> When the selected parentless root is an `|ALLE` member, `p_gruppe` stays the code before `|ALLE`. `p_dezpv` is the literal `#ALLE_GG#`, not `{code}|||#ALLE_GG#`.

---

**Status:** `Approved`
**Parent contract:** `contracts/drillthrough.md` §7.3 marker sentence
**Supersedes:** the `p_dezpv` cell in `contracts/drillthrough-dezpv-column-order-contractdelta.md` §4 and acceptance item 2. Column order and `p_gruppe = M06` stay.
**Type:** `shared service contract delta`
**Authoring AI:** Cursor Grok 4.7 (coordinator), 2026-10-14
**Reviewed by:** PO vastenburg, 2026-10-14 chat. Asked what `p_dezpv` must be for top node `DS_M06|ALLE`. Answer: `#ALLE_GG#`.
**Related rules:** `amd.mdc`, `naming.mdc`, `error-handling.mdc`, `feature-structure.mdc`

**Implementation:** code reviewed 2026-10-14. Spec: `contracts/drillthrough-dezpv-top-alle-marker-execution-spec.md`. Live drill not yet rechecked.

This is a new product rule. Legacy and the previous §7.3 sentence both emitted `{normalizedRoot}|||#ALLE_GG#` (`M06|||#ALLE_GG#` for this node). They do not mention a `Dienststelle_DEZPV` level token.

---

## 1. Rule

`p_gruppe` is unchanged: normalized root id (trim, keep `---`, strip leading `DS_`, and at level 0 strip a trailing `|ALLE`).

When that root is marker-eligible (root selected, or all direct children selected):

| Root member id after a leading `DS_` strip | `p_dezpv` |
|---|---|
| ends with `\|ALLE` | the literal `#ALLE_GG#` |
| otherwise | `{normalizedRoot}\|\|\|#ALLE_GG#` (previous rule) |

Do not prefix `#ALLE_GG#` with `M06`, `|||`, or the column name `Dienststelle_DEZPV`.

Descendants of that root are still not added to `p_dezpv`. Several roots still join with `;`.

## 2. Worked example

Selected parentless root `DS_M06|ALLE` (column `Dienststelle_DEZPV`, caption `M06|ALLE#MA 06 - Rechnungs- und Abgabenwesen Gesamt`):

| Prompt | Value |
|---|---|
| `p_gruppe_drillFromGDB` | `M06` |
| `p_dezpv_drillFromGDB` | `#ALLE_GG#` |
| `p_dienststelle_drillFromGDB` | empty |

A marker-eligible root whose id does not end with `|ALLE` (for example `DS_M06|BEENDET`) still emits `M06|BEENDET|||#ALLE_GG#`.

## 3. Sanitize

Push `#ALLE_GG#` as a literal. Do not pass it through `sanitizeOrdinary` or `sanitizeHashValue`. An exact `#ALLE_GG#` would survive `sanitizeHashValue`, but any other string that only ends with `#` becomes `---`. The direct push stays off that branch.

## 4. Files (when a later spec implements this)

- `KDB3/js/core/services/drillthrough/org/mapDezpvOrgPrompts.js`

No tree-walk change. No BW change. No new `_KDB` namespace, event, or public method.

## 5. Acceptance

1. Top node `DS_M06|ALLE` selected, Sicht DEZPV: `p_gruppe_drillFromGDB = M06` and `p_dezpv_drillFromGDB = #ALLE_GG#`.
2. A marker-eligible root that does not end with `|ALLE` still uses `{normalized}|||#ALLE_GG#`.
3. The URL encoder still keeps the `#` of `#ALLE_GG#` (percent-encoded), same as the old marker's hash.

## 6. Approval log

| Date | Status | Approver | Notes |
|---|---|---|---|
| 2026-10-14 | `Approved` | PO vastenburg | Chat answer `#ALLE_GG#` for the top node. Code not started. |
| 2026-10-14 | `Approved` (go) | PO vastenburg | Chat: "go". Spec `drillthrough-dezpv-top-alle-marker-execution-spec.md`. |
| 2026-10-14 | Code reviewed | coordinator | `mapDezpvOrgPrompts.js`: `|ALLE` root pushes literal `#ALLE_GG#`. Review pass. Live drill not yet rechecked. |
