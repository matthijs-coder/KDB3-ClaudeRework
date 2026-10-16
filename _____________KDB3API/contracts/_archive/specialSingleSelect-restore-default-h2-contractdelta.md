# Contract Delta: SSS restore auto-default toast + H2 Leitung

> Second product point on the P1 stride: when restore **applyDefault** actually
> sets the first option (Alle/empty → Standardauswahl; filter **shown**), show
> an info toast. Same for Dienststellenleitung after H2. Two filters → two
> `notify`s. Not a new service. P1 hide+clear stays.

---

**Status:** `Implemented` — JS 2026-09-09; dual review PASS. **Cognos:** green 2026-09-09  
**Type:** `feature + shared-service contract delta`  
**Program:** `contracts/futureTodo/toast-message-port-PROGRAM-2026-09-07.md` (**SSS** — still tick only after Cognos green)  
**Parent slice:** `contracts/specialSingleSelect-parameterSetRestore-rights-notify-contractdelta.md` (P1 Implemented)  
**Spec:** `contracts/specialSingleSelect-restore-default-h2-execution-spec.md`  
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-09  
**Parents:** `specialSingleSelect.md` §9; `writeback.md` §6.3; `writeback-urlParameterId-contractdelta.md` overlay present; `messageService.md` (`notify` overlap OK for globals)  
**OOS:** NMS `isUnownedNativeMultiSelectItem.js`; MAG `dienststelle/actions/parameterSet/**`; Alle-lock; Leitung widget-banner; new `messageService` method; `shared/` helper folder

---

## Diagnosis

P1 overlay ships. Auto-default (Alle denied, filter right allowed, empty instance → first option) is still **silent**. GET omits `useValue === ""`, so that mutation is the restore of “stored Alle / omitted sels”.

Leitung cannot share toasts: after `toLowerCase()`, `Dienststellenleitung`.indexOf(`dienststelle`)===0 skips classify/GET/SET. Overlay-only (drop Personengruppe hint gate) is a dead path. Incomplete H2 (classify without SET) **wipes** Leitung on SS clear.

---

## 1. Purpose

On SET restore (`reason: "parameterRestore"`), if SSS **applyDefault** actually mutated a special filter, notify at SET finish. Fire on **default-boot** (`statusKind === "default"`, extension-marked default set) **and** user/share/URL (`direct`). Empty start without a set never hits this path. Ordinary tableData/Sicht `scheduleSync` stays silent.

---

## TODO — Proposal series (**locked** 2026-09-09)

| # | Locked |
|---|---|
| 1 | New hint field `appliedDefaultLabels` (string[] of `filterLabel`, deduped). **Do not** reuse `clearedRestoredValues`. |
| 2 | Attach iff `parameterRestore` **and** successful visible result `patch.selectionSource === "specialDefault"` **and** `!errorCode`. Keep-selected / restoreParked / rightsUnknown / Sicht hide / failed apply: no hint. |
| 3 | P1 hint: same predicate as live, but `filterLabel` is Personengruppe **or** Dienststellenleitung (not Personengruppe-only). |
| 4 | Copy: no „Alle“, no Lehrlinge, no „gespeicherte“ on the **default** keys. P1 keys keep zurückgesetzt. |
| 5 | Two specials → **two sequential** `message.notify` (globals may overlap). No combined sentence. Overlay: same blob `pendingRestoreInfo.labelKeys[]` (`labelKey` 1-key fallback). **No** second pending field. Factory AMD 10 untouched. |
| 6 | Dstl C4 nonempty → **one** dstl toast, **zero** SSS. Abort `showAlert` never stacks with info. Mixed P1+default on **different** filters: two SSS toasts (no dstl). Same filter P1+default: exclusive in apply (unchanged). |
| 7 | No `statusKind === "direct"` suppress. Default-boot is **not** silent. `newDashboard` has no `runFilterRestore`. |
| 8 | H2 **in this WP:** exact MAG keys `dienststelle` \| `dienststelle_bw` \| `dienststelle_dezpv` at classify + GET skip + SET skip. Drop prefix OR in `classifyV2FilterItem.js`. Copy the three names **inline** (no `shared/`). NMS file **out**. Classify-without-SET **forbidden**. |
| 9 | `createWritebackSetService.js`: no new AMD; no growth except if overlay seed already has `pendingRestoreInfo`. |

---

## 2. Copy (SSOT)

`writebackLabels.js` (do **not** revert Dienststelle C4 twins):

```txt
specialSingleSelectRestoreDefaultPersonengruppeMessage:
"Eine Option für den Personengruppe-Filter steht nicht zur Verfügung. Möglicherweise verfügen Sie nicht über die erforderlichen Berechtigungen. Für den Filter wurde die Standardauswahl gesetzt."

specialSingleSelectRestoreDefaultDienststellenleitungMessage:
"Eine Option für den Dienststellenleitung-Filter steht nicht zur Verfügung. Möglicherweise verfügen Sie nicht über die erforderlichen Berechtigungen. Für den Filter wurde die Standardauswahl gesetzt."

specialSingleSelectRestoreClearedMessage: (unchanged Personengruppe P1)

specialSingleSelectRestoreClearedDienststellenleitungMessage:
"Eine oder mehrere gespeicherte Dienststellenleitung-Auswahlen sind nicht verfügbar. Möglicherweise verfügen Sie nicht über die erforderlichen Berechtigungen. Die Auswahl wurde zurückgesetzt."
```

Notify order when several SSS keys fire: Personengruppe then Dienststellenleitung (P1 or default per filter).

---

## 3. Acceptance

1. Alle-denied + empty/Alle restore + applyDefault ran → default toast for that filter; filter **shown**; first option set. Default-boot included.
2. Keep-selected already first option → no default toast.
3. P1 Personengruppe unchanged. P1 Leitung after H2: cleared key, filter hidden.
4. Both specials default → two toasts, two copy keys, no combined sentence.
5. Dstl C4 on same run → only dstl.
6. Overlay: pend `labelKeys`; present loops `notify`; ladder missing-id > abort > info.
7. Leitung GET/SET/inventory real; MAG `Dienststelle_BW` / `_DEZPV` still excluded; v2 Leitung no longer mapped into MAG `dstl`.
8. NMS file untouched. No `messageService` method. No `_KDB.cognosAPI` from SSS.
9. `createWritebackSetService.js` AMD still 10; no JS file >150.

---

## 4. Parent one-liners (captain after dual review)

- P1 delta Q5/Q6/Q11: auto-default no longer silent; two SSS notifies; H2 in this sibling.
- `writeback-urlParameterId-contractdelta.md` §7: info rung may `notify` each `labelKeys[]` entry.
- `specialSingleSelect.md` §9: restore auto-default may notify via writebackSet (this delta).

---

## Approval log

| Date | Status | Approver | Notes |
|---|---|---|---|
| 2026-09-09 | Approved | PO vastenburg | Default copy; two toasts; default-boot not silent; H2+v2 prefix now. |
| 2026-09-09 | Implemented | SSS captain | Allowlist JS + dual review (try/catch fix). Parent one-liners. Cognos pending. |
| 2026-09-09 | Cognos green | PO vastenburg | Behaviour as intended. Info toast vanishes too fast → next WP. |
