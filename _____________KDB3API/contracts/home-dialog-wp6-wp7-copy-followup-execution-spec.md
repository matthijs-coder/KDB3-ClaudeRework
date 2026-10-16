# Execution Spec: WP6/WP7 Cognos-test copy follow-up

> Tiny delta on shipped JS. Architecture stays. Do not reopen detector, poll, minimize-C, or messageService.

**Status:** `Superseded` — copy/layout: `home-dialog-wp6-wp7-copy-layout-followup-execution-spec.md`. Do not execute this file.  
**Law:** `contracts/cubes-unavailable-home-dialog-contractdelta.md` locks 3, 14–16 (win leftover Type2 button prose)  
**Sibling:** `contracts/loadingService-watchdog-dialog-contractdelta.md` lock 5  
**Phase:** copy/layout/timing follow-up  
**Authoring AI:** WP6 captain, 2026-09-08  
**Executing AI:** Grok 4.6 army (`cursor-grok-4.6-xhigh`)

---

## Section A. Pre-flight (echo one sentence each, then write same turn)

1. `feature-structure.mdc` — workflow / size / no silent contract drift  
2. `naming.mdc` — English identifiers; DE only in `labels.de.*`  
3. `error-handling.mdc` — try/catch already on `__controller`; do not wrap one-liners  
4. `amd.mdc` — keep `define([])`; factory-scope helpers; no nested functions in `__controller`  
5. WP6 delta locks **3, 14, 15, 16**  
6. This spec

Also echo: keep **two** choices; no `showAlert`; no CSS; no `KDB.js`; no PROGRAM tick.

---

## Section B. Exclusive allowlist

**MAY edit only:**

| Path | Job | Lines / AMD |
|---|---|---|
| `KDB3/js/core/homeDialog/config/homeDialogLabels.js` | Short buttons + `navInstruction`. Keep cubes title/body exact. | 10 → ~12 / 0 |
| `KDB3/js/core/homeDialog/presentHomeChoice.js` | Concat nonempty `navInstruction` onto `message` with `"\n\n"`. Do **not** add it to the close/minimize empty-label gate. Keep two `choices`, `showCancel: false`, id map. | 96 → ≤120 / 0 |

**MUST NOT touch:** `createMessageService.js`, `buildMessageDialog.js`, `messageService.css`, `messageLabels.js`, `confirmAndDispatchTabMove.js`, `loadingLabels.js`, `showLoadingWatchdogDialog.js`, `presentCubesUnavailable.js`, `KDB.js`, `scheduleLoadingWatchdog.js`, cognosHost facets, `.cursor/rules/*.mdc`, WP2/SSS.

---

## Section C. Exact DE (ship these strings)

In `homeDialogLabels.js` only:

- `cubesUnavailableTitle` — unchanged  
- `cubesUnavailableBody` — unchanged  
- `closeLabel`: `Dashboard schließen`  
- `minimizeLabel`: `Dashboard minimalisieren`  
- `navInstruction`: `Sie können zur Startseite wechseln.`

Concat (factory-scope named helper or inline in `__controller` after the existing label reads): if `navInstruction` is nonempty, `message = (options.message ? options.message + "\n\n" : "") + instruction`. If empty, pass `options.message` unchanged (warn-and-omit, **not** fail-closed).

---

## Section D. Forbidden

Close-only WP6. Boolean `includeMinimize`. Caller `choices` override. Bare `Schließen` as `closeLabel`. `Sie wechseln zur Startseite.` Poll. Snapshot move. New messageService method. CSS. Tick PROGRAM 6/7. Git commit. Dump `KDB.js`.

---

## Section E. After files

Grok dual-review: allowlist paths + FAIL/NIT. Confirm tab-move still Nein. Confirm `loadingLabels.js` untouched. Do not self-certify Cognos green.
