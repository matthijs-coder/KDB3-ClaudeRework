# Contract Delta: writeback SET `pkg` mismatch

> Closes the unimplemented parent shall: direct v3 restore must fail when
> `v3.pkg` does not match the runtime package key. **Deletes** the
> “unless an explicit map/migration path is invoked” escape hatch.
> `writebackSet` still **must not** import or call `writebackMap`.

---

**Status:** `Implemented — awaiting PO Cognos` 2026-09-03 (SET `validateRestorePayload` + kidIndex; factory untouched)
**Parent:** `contracts/writeback.md` §2.2, §4.6, §5 (lines ~907–910), §8
**Depends on:** `writeback-v2Map-contractdelta.md` (v2 Map restamps `pkg` to runtime — v2 SET must **not** hit this fail)
**Type:** `shared-service contract delta`
**Authoring AI:** planner 2026-09-03
**Related:** `mapping-config-ssot-contractdelta.md` (kidIndex SSOT); `writeback-dienststelle-restore-ux-contractdelta.md` (orthogonal)

---

## 1. Purpose

Live SET never reads `v3.pkg`. `WRITEBACK_MAPPING_PACKAGE_MISMATCH` exists
only on `errorCodes.js` + parent text. Direct v3 from another
`datasource_name_KID` is restored **as-is**. A later GET restamps `pkg` to
the current map and **launders** the foreign identity.

`writebackMap.toV3` on already-v3 is normalize + validate only. It does
**not** remap kale `u` / SS MUNs. Calling Map from SET would be false
security and violates D3/D4.

This delta: SET fails closed on string mismatch. No v3 KID migrator in this
WP (or the next).

---

## 2. PO decisions (2026-09-03)

| # | Choice | Decision |
|---|---|---|
| 1 | Warn vs fail | **Fail.** `RestoreResult { ok: false, outcome: "failed" }` + diagnostic. Not `console.warn` / degraded-continue. Warn is Cognos-invisible (`notifyRestoreFailure` only on failed/abortedByOwner). |
| 2 | JS throw to Cognos | **No.** Same pattern as invalid v3: `run.addDiagnostic` + `ABORT` inside SET. Bridge SET already does not throw Map errors as host exceptions for this code. |
| 3 | Who compares | **`writebackSet`** in `validateRestorePayload` (restore step 8), via `kidIndex.resolveRuntimePackageKey`. Allowed: SET may import `kidIndex.js`. **Forbidden:** SET import/call `writebackMap`. |
| 4 | Bridge | Must **not** grow restore policy. v2 after Map already has matching `pkg`; a bridge-only check never fires on legacy import. |
| 5 | Map as migrator | **Deleted.** Parent §5 escape hatch gone. `toV3(v3)` stays defensive normalize only. |
| 6 | Known overblock | A foreign-`pkg` v3 that contains **only** portable Sicht + MAG `dstl` + `wgts.code` (empty `pcfs`/`sels`) would restore today. This WP **still fails** that SET. Fail-closed. Do not add “skip if no MUNs” heuristics. |
| 7 | Weak identity | Same `datasource_name_KID` string after a cube/MUN change is **out of scope**. Neither warn nor fail catches it. Binding uses **runtime** `parameterMap.js`. |
| 8 | `alternativeDatasource_name_KID` | GET stamps `pkg` from `datasource_name_KID` only. Do not compare alt cube name to `pkg`. |

---

## 3. Required behavior

After `normalizeV3` / `validateV3` succeed on a restore payload:

1. `runtimePkg = kidIndex.resolveRuntimePackageKey(_KDB)` (implementation
   ignores `_KDB`; key is `parameterMap.datasource_name_KID`, live
   `"Personal_KDB"`).
2. If `runtimePkg` is missing/empty → existing config fail
   (`WRITEBACK_MAPPING_CONFIG_MISSING` or current validate equivalent) —
   do not invent a second code.
3. If `String(v3.pkg) !== String(runtimePkg)`:
   - `run.addDiagnostic({ code: "WRITEBACK_MAPPING_PACKAGE_MISMATCH", phase: "validate", … })`
   - abort the run (`ok: false`, `outcome: "failed"`)
   - **before widgetReset** if validate stays step 8 (preferred: fail in
     `validateRestorePayload` **before** `runNormalRestore` parks widgets).
     Live today parks at restore step 9; moving the check to validate
     **avoids** park residue on this fail. Required.
4. Matching `pkg` → continue as today.

v2 path: Map `mapV2ToV3` already sets `pkg` to runtime. This fail must not
fire on a successful v2 map.

Empty/whitespace `pkg` already fails `validateV3` (non-empty string). This
delta is **unequal non-empty** strings.

---

## 4. Parent sentences this delta replaces

`writeback.md` §5 (implement GO patches parent, not a silent parent-only
edit):

- Keep: SET must verify runtime package/index; `pkg` must match for
  **direct** restore; `WRITEBACK_MAPPING_PACKAGE_MISMATCH` is a **required**
  diagnostic (not §4.6 diagnostic-tolerant).
- **Delete:** “unless an explicit map/migration path is invoked”.
- **Add:** comparison is SET + `kidIndex`, never SET→Map. Outcome is
  `failed`, not `degraded`.

§2.2: `outcome: "degraded"` remains only for §4.6-tolerant fields. Package
mismatch is **not** one of them.

---

## 5. Files (implement GO)

| File | Change |
|---|---|
| `writeback/set/state/validateRestorePayload.js` | kidIndex compare (5th AMD); positional `addDiagnostic` + `throw ABORT` |
| `writeback/set/createWritebackSetService.js` / orchestrator | **no** kidIndex AMD (factory already 10); **not** Map |
| `mapping-config-ssot-contractdelta.md` call-site table | one sentence: SET reads `resolveRuntimePackageKey` |

Do not add methods on `_KDB.services.writebackSet`. Named-method surface
unchanged (`restore`, `destroy`, URL-share methods).

`runFilterRestore.js` is **out**. File-size: validate file must stay ≤150.

---

## 6. Out of scope

- v3 uniqueName remapper / source-map catalog per `pkg`
- A1 GFO subset gate (`writeback-v2Map-contractdelta.md` §11)
- Dienststelle toast / fallback grain
- Changing GET `pkg` stamp (still `datasource_name_KID`)

---

## 7. Acceptance

1. Same-dashboard `set(get())`: `pkg` matches; restore proceeds.
2. Hand-edited or foreign v3 with `pkg: "Other_KDB"` (or any string ≠
   runtime): SET `failed` + `WRITEBACK_MAPPING_PACKAGE_MISMATCH`; **no**
   widgetReset park; filters/widgets unchanged from pre-SET.
3. v2 cross-package after Map: `pkg` is runtime; this fail does not fire;
   kale `u` remap remains Map’s job.
4. SET AMD graph has `kidIndex`, not `writebackMap`.
5. No `toV3` call from `set/`.

---

## Approval Log

| Date | Status | Approver | Notes |
|---|---|---|---|
| 2026-09-03 | `Approved` (contract) | PO vastenburg | Fail-closed; no migrator; known MAG+code overblock accepted. |
