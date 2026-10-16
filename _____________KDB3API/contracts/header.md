# Module contract: header

**Status:** CP-1 approved (draft resolved; implementation follows execution specs).  
**Owner module:** `header`  
**Type:** feature module  
**Related:** `stateOwnership.md` (subtree `_KDB.state.header`), `module-public-api.mdc`, `state.mdc`, `runtime.mdc`, `dom.mdc`, `events.mdc`, `feature-structure.mdc`  
**Supersedes placeholder intent:** toolbox chrome drives **known owner** `header` via `_KDB.api.header.dispatch` — see [kdbControl-header-footer-toolbox-contractdelta.md](./_archive/kdbControl-header-footer-toolbox-contractdelta.md); legacy `kdbControl.md` §6 `header:*Requested` catalog rows are **not** the path for those controls once this contract is approved.

---

## 1. Purpose

Owns dashboard **Kopfzeile** semantics: serialisable header state, header region **mount/DOM**, subtitle visibility, title/subtitle **edit mode** (not kdbControl UI state). Publishes a **fact** after a **confirmed** header state/render change so consumers (e.g. `footer`) can react without coupling to kdbControl. Confirmed transition to `active` may show the zoom hint per [header-footer-zoom-hint-contractdelta.md](./_archive/header-footer-zoom-hint-contractdelta.md) (`notifyAnchored` on header `rootEl`, `HEADER_FOOTER_ZOOM_HINT`); footer does not own a second copy. **PO 2026-09-07:** trigger parked (commented `_notifyZoomHint` call in header effects); helper/labels remain — not dead code.

---

## 2. Ownership

- **Canonical state subtree:** `_KDB.state.header`  
- **Canonical runtime:** `_KDB.runtime.header` (DOM refs, listeners/AbortControllers, edit focus bookkeeping — nothing JSON-serialisable per `state.mdc` / `runtime.mdc`).  
- **Public surface:** `_KDB.api.header`  
- **Foreign-write paths:** none. Other modules use `dispatch` or read selectors; **no** writes to `_KDB.state.header` from outside the `header` module.

### 2.1 State shape (CP-1)

```txt
_KDB.state.header = {
  status: "idle" | "active" | "removed",
  subtitleStatus: "hidden" | "visible",
  titleText: string,
  subtitleText: string,
  iconKey: string,
  editTarget: "none" | "title" | "subtitle",
  draftTitleText: string,
  draftSubtitleText: string
};
```

- **`status` (domeinveld — chrome presence, niet `lifecycle`):** de drie waarden beschrijven **alleen** zichtbaarheid/mount van de Kopfzeile; ze horen **niet** bij het canonieke module-veld **`lifecycle`** uit `lifecycleVocabulary.md` (dat blijft een aparte concern wanneer de module die gebruikt).  
  - **`idle`** — nooit geplaatst/geactiveerd (init / na cold start; geen header-DOM).  
  - **`active`** — zichtbaar en gemount (normale aanwezige Kopfzeile).  
  - **`removed`** — eerder actief geweest en **bewust** verwijderd (geen zichtbare chrome; geen actieve mount zoals contract dat beschrijft — exact DOM teardown in execution spec).  
- **`subtitleStatus`:** alleen zinvol wanneer `status === "active"`; bij `idle` | `removed` is subtitle-chrome **inert** (reducer mag normaliseren of documenteren).  
- **`iconKey`:** PNG basename without extension for `.headerIcon` (`writeback-t2-item4-contractdelta.md`). Default `"Stadt-wien"`. Kept when `status === "removed"` (same as `titleText`). Not in `header:confirmedChanged`.  
- **`editTarget` + drafts:** inline-edit state blijft eigendom van `header`; zit **niet** in `header:confirmedChanged` payload (CP-1 — zie §7.1).

---

## 3. Runtime (`_KDB.runtime.header`)

| Bucket | Role |
|--------|------|
| `domRefs` | Root/header container, title/subtitle nodes, logo `.headerIcon` img, mount slot reference. |
| `abortControllers` | User-input / keyboard / outside-click for edit sessions. |
| `subscriptions` | Optional internal only; cross-module subs documented per handler owner. |
| `listeners` | Only if non-abortable cleanup required (`runtime.mdc`). |

**Cleanup:** `header.destroy()` tears down DOM, controllers, subscriptions registered by `header`, and clears `domRefs` / timers / pending work.

---

## 4. Public API (`_KDB.api.header`)

- **Style:** dispatch + reducer (`module-public-api.mdc`).  
- **Methods:** `mount(options)`, `destroy()`, `dispatch({ type, payload })`, `getState()`.  
- **No** named commands on this surface.  
- **`getState()`:** read-only projection of `_KDB.state.header` (and documented extensions only).

### 4.1 Sandbox / DOM mount target

- **Contract:** `mount({ mountTarget })` receives a **sandbox dashboard** element (or selector resolving to one) where the header chrome is inserted — same class of target as other port harness “dashboard shell” nodes; exact id/class **documented in execution spec**, not duplicated here.  
- **Rule:** `header` does not mount into `kdbControl`’s control tree; it mounts into the **canvas/dashboard** region per `dom.mdc` ownership boundaries.

---

## 5. Dispatch actions (slash-actions)

**`SourceEnum` on all dispatches (CP-1):** `payload.source` is **`"kdbControl"` | `"api"` | `"bootstrap"`** (closed set; owner validates).

| `type` | Purpose |
|--------|---------|
| `header/toggle` | **`idle` \| `removed` → `active`**; **`active` → `removed`**. |
| `header/show` | Naar **`active`** vanuit **`idle`** of **`removed`** (mount + zichtbaar waar van toepassing); al **`active`** → no-op. |
| `header/hide` | **`active` → `removed`** (bewuste verwijdering); **`idle`** / **`removed`** → no-op. |
| `header/toggleSubtitle` | Flip `subtitleStatus` alleen wanneer `status === "active"`; anders no-op. |
| `header/startTitleEdit` | Set `editTarget: "title"`, initialiseer `draftTitleText` vanuit `titleText` indien drafts in scope. |
| `header/startSubtitleEdit` | Set `editTarget: "subtitle"`, initialiseer `draftSubtitleText` vanuit `subtitleText`. |
| `header/commitTitle` | *(Optional)* `draftTitleText` → `titleText`, edit cleared. |
| `header/commitSubtitle` | *(Optional)* `draftSubtitleText` → `subtitleText`, edit cleared. |
| `header/cancelEdit` | Reset drafts, `editTarget: "none"`. |
| `header/setIcon` | Set `iconKey` to a resolved PNG stem (`writeback-t2-item4-contractdelta.md` §3). No-op when the resolved stem equals current. |

**Reducer purity:** reducer does not touch DOM, Cognos, or `_KDB.events`; effects layer performs mount/unmount sync, Cognos mirror (if any), and **fact** emit.

---

## 6. Selectors

Published from `header/state/selectors.js` (per `module-public-api.mdc`): o.a. `readHeaderStatus(_KDB)` → `"idle" | "active" | "removed"`, `readHeaderSubtitleVisible(_KDB)`, `readHeaderEditTarget(_KDB)`, `readHeaderIconKey(_KDB)` → PNG stem. Consumers avoid deep `_KDB.state.header` shape coupling.

---

## 7. Events

### 7.1 Emit — `header:confirmedChanged` (fact)

- **Emitter:** `header` module (effects after confirmed commit + render sync).  
- **Confirmation point:** after `_KDB.state.header` mutation is committed **and** header DOM reflecting that commit is applied (**state commit + sync pass complete** — ordering in execution spec).  
- **Payload (CP-1, JSON-serialisable, no DOM):** exact deze velden; **geen** `revision`, **geen** `editTarget`:

```js
{
  status: "idle" | "active" | "removed",
  subtitleStatus: "hidden" | "visible",
  titleText: string,
  subtitleText: string,
  source: "kdbControl" | "api" | "bootstrap"
}
```

- **`source`:** de `SourceEnum` van de **dispatch** die de bevestigde transitie initieerde (of vastgelegd effect-pad indien meerdere stappen — execution spec).  
- **Catalog:** add entry to `architecture/eventSubscribe.md` when implementing.

### 7.2 Subscribe

- **`header`** does not subscribe to its own fact for state writes (avoid loops).  
- **`footer`** may subscribe (see `footer.md`) **or** read selectors; recommendation in `footer.md`.

---

## 8. Dependencies

- **`_KDB.elements` / selectors:** mount targets and canvas integration per execution spec.  
- **Cognos:** only via `_KDB.cognosAPI` thin wrappers if/when header persists to host — out of scope for toolbox-only CP unless execution spec extends.  
- **Does not depend on** `kdbControl` for correctness; `kdbControl` is one dispatcher of actions.

---

## 9. Folder layout (target)

```txt
header/
  __orchestratorHeader.js
  createHeaderController.js
  state/
    initialState.js
    createHeaderReducer.js
    selectors.js
  effects/
    __orchestratorHeaderEffects.js
  runtime/
    cleanupHeaderRuntime.js
  dom/
    buildHeaderChrome.js
    placeHeader.js
    syncHeaderFromState.js
  events/
    eventNames.js
```

As-built: `createHeaderController.js` remains the AMD orchestrator path; `runtime/cleanupHeaderRuntime.js` owns destroy abort/DOM/`domRefs`/history-replay-handler cleanup.

---

## 10. Out of scope (this contract)

- Combined `headerFooter` service/module.  
- `kdbControl` owning `_KDB.state.header`.  
- Request-events for toolbox → header commands (**known owner** = direct `dispatch`).
- Toolbox icon dropdown; header icon undo/history; renaming `dom/` → `view/`.
  **PO 2026-08-18:** one icon forever. Picker and icon-history are **never**,
  not a later WP. `header/setIcon` stays for SET restore of the default stem.
- Benutzerhandbuch / Dataspot images (not `head.icon`).

---

## 11. Approval log

| Date | Actor | Note |
|------|-------|------|
| 2026-05-13 | user | CP-1 closed: domein-**`status`** (`idle`/`active`/`removed`) voor chrome presence, `header/toggle` mapping, `SourceEnum`, `header:confirmedChanged` payload zonder `revision`/`editTarget` — zie [kdbControl-header-footer-toolbox-contractdelta.md](./_archive/kdbControl-header-footer-toolbox-contractdelta.md) §2. |
| 2026-08-16 | PO | T2 item 4: `iconKey` + `header/setIcon` + `readHeaderIconKey`; fact payload unchanged. See `writeback-t2-item4-contractdelta.md`. |
| 2026-08-18 | PO | One icon forever. No picker, no `header_iconChange`. Writeback spine kept. |
