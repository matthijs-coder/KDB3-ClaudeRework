# Contract Delta: widgetSettings control families (A inherit vs B sentinel)

> Standing gate for **every new** widgetSettings live option, and for classifying existing ones.
> Does **not** invent grouping chrome, writeback keys, or apply handlers. Those stay in the owning feature delta.
> PO vastenburg 2026-09-11: solution 4 — keep two families; do not force one model.

---

**Status:** `Approved` — PO vastenburg 2026-09-11 (policy solution 4 + wording CP-1 after GREEN check).
**Owner module / service:** `widgetSettings` (gate); consequence owners unchanged
**Type:** `feature-module contract delta` (policy)
**Authoring AI:** Cursor Grok 4.6 captain, 2026-09-11
**Reviewed by:** live + process dual review; final GREEN `81dabeee` 2026-09-11; PO ordered approve-on-green
**Related rules:** `feature-structure.mdc` (workflow), `state.mdc`, `module-public-api.mdc`, `naming.mdc`
**Parents this delta amends**

| Parent | Slice |
|---|---|
| `contracts/widgetSettings.md` | §4 seed / snapshot / §4.1 sentinels / **§4.2** pointer. No new dispatch methods. |
| `contracts/widgetVis-show-values-contractdelta.md` | D2 Frozen except the inherit-row chrome/click/history cite in `contracts/widgetSettings-family-a-inherit-row-chrome-contractdelta.md`. KEEP / `vals` / List hide / catalog maps / seed stay. |
| `contracts/writeback.md` | No new `wgts[]` field here. Omit rule is chosen **by family** when a field is added. |
| `contracts/historyService.md` | **No new key.** Replay stays `widgetSettings_optionSelect`. |

---

## 1. Purpose

`widgetSettings` has two live machines for “what is the value if the user never picked / after visType switch / on GET→SET”. They look like the same dropdown family. They are **two product kinds**. Forcing one machine is a product change, not a cleanup.

This delta names them, routes **future** options to one of them, and forbids mixing the machines on one control.

---

## 2. Gate (when A, when B)

Ask **one** question before adding a settings option (or before changing an existing one):

> Must the **effective** value change on a visType switch **while the user never picked this control**?

| Answer | Family | Why |
|---|---|---|
| **Yes** — a catalog / default **varies by visType** | **A — inherit** | Absent means “follow the **current** visType catalog”. Seeding would freeze the create-time catalog and kill follow-type. |
| **No** — one real default on **every** visType | **B — sentinel** | That token is a real user-visible choice (e.g. Ohne). Seed it. Copy it through visType switches. |

**Forbidden as inherit tokens:** `"none"` (dim/topN Ohne — `widgetSettings.md` §4.1), `"default"` (other controls’ sentinel), `""` (binder-null in `normalizeDefaultValue`, not a settings inherit flag). Family A inherit is **absence** of the field only.

`visualization` / `visType` is a **switcher**, not A or B. It *is* the visType.

Chrome-only actions (move, resize, maximize, info, title) are out of this gate.

On doubt: stop and ask PO. Do not invent a per-visType catalog to justify A. Do not seed a Family-A control to look like B.

---

## 3. Family machines

### 3.1 Family A — inherit (3-state)

Live exemplar: `showValues` (`contracts/widgetVis-show-values-contractdelta.md` D2).

| Concern | Law |
|---|---|
| Stored unset | Field **absent** / `undefined`. Not a sentinel string. |
| Stored explicit | Concrete override (showValues: `true` \| `false`). |
| Seed / `VIS_STARTUP_KINDS` | **Do not** add. Do not commit inherit on `seedDefaults`. |
| Snapshot | Include the field **only when explicit**. Completeness triad stays `{ dimension, visType, topNChoice }` unless a later delta makes a new field bind-required. |
| visType switch | Does **not** rewrite the field. Unset → new type’s catalog. Explicit → KEEP. **showValues** is KEEP-all-vis. **Grouping** is KEEP-specialize (allowlist / CLEAR) — `contracts/widgetVis-grouping-jahr-stichtag-contractdelta.md` §15. Not a third family. |
| GET | **Omit when inherit** (field not explicit). For **showValues**, explicit equal-to-catalog **is** persisted (`vals: 0` on a hide-catalog type). **Grouping is Q6-A** (`contracts/widgetVis-grouping-jahr-stichtag-contractdelta.md` §13): omit inherit; persist explicit equal-to-`defaultGrain`. Illegal-for-`type` omit/CLEAR is that delta, not omit-when-equals-default. |
| SET / restore | `hasOwnProperty` only. Missing key → leave absent (inherit). Do **not** `commitRequiredSetting` a default. |
| Chrome | Unset **marks the inherit row** (**Diagrammstandard**, key `inherit`, never stored). Do **not** mark catalog Anzeigen/Ausblenden or `defaultGrain` while unset. Inherit click **deletes** the field. Concrete click still **commits explicit** (no “already showing catalog → stay inherit” on Anzeigen/Ausblenden). Inherit row may reuse Dimension default **look** (`data-kdb-default`) without Family B seed. Law: `contracts/widgetSettings-family-a-inherit-row-chrome-contractdelta.md`. Unset still marks `inherit` (never stored). **showValues** paints that mark on the **Standard position** (Aus / Standard / Ein). **WP2** `iterator` / `zoom` mark Standard on their own nest rows (same pill family). **Grouping** still paints a **Diagrammstandard row**. Do not mark Ein/Aus or `defaultGrain` from catalog while unset. |
| History | First paint is not a history step. User/undo of **this** control is. |

### 3.2 Family B — sentinel (2-state)

Live exemplars: `dimension`, `topNChoice` (also global shell defaults such as `backgroundColor`).

| Concern | Law |
|---|---|
| Stored unset | After first successful seed/restore: always a concrete token. |
| Default token | One **global** value (vis: `"none"` / Ohne). Same on every visType. |
| Seed / `VIS_STARTUP_KINDS` | **Must** include. Commit after confirmed startup apply. |
| Snapshot | **Always** fill (configured default if unread). |
| visType switch | **KEEP** / copy-through. There is no per-type catalog to follow. |
| GET | **Omit when value equals owner default** (or null). |
| SET / restore | Missing key → **write** the owner default (`commitRequiredSetting`). After GET→SET the omitted default becomes explicit in state. |
| Chrome | Dropdown default row = that token. |
| History | Seed does not push history. |

`"none"` on dim/topN is a **real clear** (dimension Ohne / no TopN), not “inherit a visType catalog”.

---

## 4. Live classification (do not migrate without a dedicated WP)

| Control | Family | Do not |
|---|---|---|
| `showValues` | **A** | Seed it. Reopen D2 beyond inherit-row chrome (`family-a-inherit-row-chrome`) **and** this WP1 chrome cite (`widgetSettings-vis-toggle-panel-wp1-contractdelta.md`). Move to B “for uniformity”. |
| `dimension` | **B** | Stop seeding. Treat `"none"` as inherit. Invent per-visType dim catalogs. |
| `topNChoice` | **B** | Same as dimension. |
| `visType` | switcher | Call it inherit. |
| `backgroundColor` | **B** | — |
| grouping (Jahr/Stichtag) | **A** (KEEP-via-A) | Seed a grain. Reuse `"none"`. **Unconditional** CLEAR on visType switch. Product/chrome/writeback: grouping delta only. **F specialize (grouping-delta §12.3):** KEEP iff the new vis allowlists the token; else **delete** the key (inherit). Not a third family. Not `"default"`. |
| `iterator` | **A** | Seed it. Copy grouping CLEAR. Add `settingFamily` this WP. Reopen D2. B-omit explicit `false`. |
| `zoom` (Zoomleiste) | **A** | Same as iterator. Persist explicit `0` on every type (including hide). |

---

## 5. Future option checklist

Copy the matching column. Do **not** add a settings-family registry or `variesByVisType` framework in the same WP as the option (AMD-9 / 150 caps). Third A (`iterator` / `zoom`) is live. Cleanup WP **declined** a shared helper (`widgetSettings-setting-family-helper-cleanup-contractdelta.md`): four-site boolean copies stay owner envelopes; `assignOptionalFlag01` stays GET-only; inherit-delete stays in commit. Frozen `handleApplySetting` `resolveSettings` stays **showValues + grouping only**; iterator/zoom KEEP is `getState()` overlay — do not “complete” Frozen. A later KEEP-all-vis boolean still hand-copies the four envelopes (+ restore-batch / stamp / GET / inherit kind). In-file factory-scope lift is allowed if a **wall** forces it; that is not a reopened shared *may*. No `core/utils` copier. No `_KDB.services.settingFamily`.

Shared (both families): `controlDefinitions.js` `live[]`, `options.js`, `intentDispatchMap.js`, `kindToStateKey.js`, `KIND_TO_CONTROL`, writeback catalog + validate + GET + restore **together**, focus keep-list class, SVG, hardcoded German chrome (not `labels.de` unless PO overrides). `bindWidgetSettingsPanel.js` stays generic except WP2 **kind-set only** (`showValues` \| `iterator` \| `zoom`) — `widgetSettings-vis-toggle-panel-wp2-contractdelta.md`. Not a rewrite. Not a stay-open helper. `actionRouter.js` routes only, no new import. No third `*DropdownSafeguard.js` clone — generalize or stamp. WP2 must not add extra `live[]` icons.

| Step | Family A | Family B |
|---|---|---|
| `dropdownDefaults.js` / `VIS_STARTUP_KINDS` | omit | add |
| Snapshot fill | only if explicit | always |
| `isCompleteSettingsSnapshot` | omit unless bind-required | only if bind-required |
| GET omit | inherit (unset) | equals default token |
| SET missing | leave unset | write default token |
| `stampPanelVisType` inherit mark | always remake: explicit → concrete row; unset → inherit row. **Do not** merge grouping into showValues `inheritKey` | no |
| Apply path | property-only **or** full rebind — product of the feature delta, **not** this gate | usually full rebind via `handleApplySetting` |

Unknown `wgts[]` field → `WRITEBACK_INVALID_V3_PAYLOAD`. No `SCHEMA_VERSION` bump for a new optional vis key. Key ≤5 chars. Not `dim`.

---

## 6. Anti-goals

- No third family (“sometimes seed, sometimes inherit”) on one control.
- No converting showValues → B or dim/topN → A without an explicit PO WP that amends this delta **and** the showValues D2 delta. D2 reopen is only the inherit-row cite above **+ WP1 chrome cite**.
- No `"none"` / `"default"` as Family-A inherit.
- No router service or `_KDB.services.settingFamily`.
- No silent copy of showValues property-only apply onto a binding control (or the reverse).
- No editing `.cursor/rules/*.mdc` for this gate; the contract is the authority.

---

## 7. Out of scope

- Grouping dropdown, icon, overlay recipes, title-delta pack keys, `grp` field — grouping feature delta.
- Generalizing the two safeguard files (allowed later; not required to approve this gate).
- Changing GET omit of live `vals` / `dim` / `topn`.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-11 | Policy solution 4 agreed in chat | PO vastenburg | Two families + routing rule; showValues stays A; grouping is A |
| 2026-09-11 | `Draft` contract text | captain | Wording CP-1 open |
| 2026-09-11 | `Draft → Approved` | PO vastenburg (approve-on-green) | Final GREEN check; two families + gate law |
| 2026-09-12 night | Grouping KEEP-specialize | captain; PO F lock | Grouping-delta §12.3 only. showValues D2 unchanged. |
| 2026-09-12 | Family A inherit-row chrome | captain; PO rec lock | §3.1 Chrome: unset marks Diagrammstandard; inherit click deletes. D2 reopen only that cite. |
| 2026-09-12 | WP1 chrome cite | captain; PO GO | showValues paints Standard position (Aus/Standard/Ein). D2 reopen += WP1 cite. |
| 2026-09-12 | Grouping Q6-A | PO vastenburg; captain | §3.1 GET: grouping omit inherit; persist explicit equal-to-`defaultGrain`. |
| 2026-09-13 | WP2 iterator / zoom | PO vastenburg; captain | §4 rows A KEEP-all-vis. §5 bind kind-set only. Persist `0`. No `settingFamily`. |
| 2026-09-13 | §5 *may* closed | PO GO (rec A, army re-stress STANDS) | No helper. No service. Fourth A still hand-copies. |
