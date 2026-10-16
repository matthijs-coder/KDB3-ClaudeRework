# Execution Spec: DEZPV top `|ALLE` marker

**Status:** `Reviewed`
**Contract:** `contracts/drillthrough-dezpv-top-alle-marker-contractdelta.md`
**Phase:** implementation
**Authoring AI:** Cursor Grok 4.7 (coordinator), 2026-10-14
**PO go:** 2026-10-14 chat ("go")

---

## Section A. Pre-flight

Echo one sentence each in the report, then edit in the same turn.

1. `amd.mdc` — one `define`, helpers at factory scope, no nested functions.
2. `naming.mdc` — English names; underscore only on boundary inputs.
3. `error-handling.mdc` — the new helper is a pure string test, no try/catch. The existing `__controller` catch stays.
4. `feature-structure.mdc` — one existing file, under 150 lines, no new file.
5. The delta — an `|ALLE` root keeps `p_gruppe` as the normalized id and sets `p_dezpv` to the literal `#ALLE_GG#`.

## Section B. Allowlist

Edit only:

`_____________KDB3API/KDB3/js/core/services/drillthrough/org/mapDezpvOrgPrompts.js`

Do not edit the encoder, the tree builders, BW files, or `sanitizeHashValue.js`.

## Section C. Change

- **Rules to apply:** `amd.mdc`, `naming.mdc`, `error-handling.mdc`, `feature-structure.mdc`.
- Add a factory-scope helper `rawEndsWithAlle(_raw)`. Trim. If the string starts with `DS_`, drop those three characters. Return true only when the result ends with `|ALLE`.
- In the root loop, read the member id once via `memberIdFromNode`. Keep `p_gruppe` as `normalizeDezpvValue(that id, 0)`.
- When the root is marker-eligible, push `#ALLE_GG#` if `rawEndsWithAlle` is true. Otherwise push `normalized + "|||#ALLE_GG#"` as today.
- Do not pass either marker through `sanitizeOrdinary`. A bare `#ALLE_GG#` must not become `---`.
- Leave the descendant loop and the unresolved loop unchanged.

## Section D. Forbidden

No other files. No commits. No rename of the public return keys.

## Section E. Check

`node --check` the file from `_____________KDB3API`.

Report line count and the two marker strings: `DS_M06|ALLE` → `#ALLE_GG#` with gruppe `M06`; `DS_M06|BEENDET` → `M06|BEENDET|||#ALLE_GG#`.
