# Contract Delta: share link KDB read-only chrome (pad A)

> PO vastenburg 2026-09-04: **A** — toggle **in** the Teilen copy dialog (not toolbar). Readable English hash key `readOnly=1`. CSS class + `display: none` hides kdbControl + widget settings. Maximize and drillthrough stay. Not a security ACL (DevTools bypass OK).

---

**Status:** `Approved — Cognos green`
**Type:** `feature module contract delta` (shareControls outbound + inbound chrome; messageService copyable toggle)
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-04
**Reviewed by:** PO vastenburg — pad A 2026-09-04; polarity + labels; token `readOnly=1`; Cognos green 2026-09-04
**Related rules:** `feature-structure.mdc` (Module Contract First), `naming.mdc`, `amd.mdc`, `dom.mdc`, `kdb-object.mdc`, `state.mdc`, `events.mdc`, `error-handling.mdc`, `cognos-adapter.mdc`, `module-public-api.mdc`

**Parents this delta amends** (one-line patches **after** PO Approved — do not rewrite parents in this WP)

| Parent | Slice |
|---|---|
| `contracts/shareControls.md` | §0 dialog row; §9 folder; §10.2 extra hash key + dual URL; §10.3 toggle labels; inbound chrome **exception** (not SET restore) |
| `contracts/messageService.md` | Q11 stays “no HTML/callbacks”; `showCopyable` optional declarative `toggle`; copy uses **live** `copyText` after toggle |

Related (do **not** amend except “stay out”): `writeback-urlParameterId-contractdelta.md` (unknown hash keys ignored), `leftover-widgets-developer-hide-contractdelta.md`, `kdb-ready-halt-developer-mode-contractdelta.md`, `kdbControl-developer-mode-toggle-contractdelta.md`, `dashboardPdf-capture-chrome-hide-contractdelta.md`, `widgetSettings.md` (`hidWs` / `KDB_hide` inert sister path).

---

## 0. Locked product

| Topic | Decision |
|---|---|
| Toggle placement | **A** — inside `showCopyable`, not the action-bar icon |
| Polarität | German **„Nur Lesen“**, **default ON** (checked = read-only URL) |
| Unchecked | Full KDB edit (no extra hash key) |
| Token | Readable English **`readOnly=1`** after `parameterLabel`. Extra **12** characters: `&readOnly=1`. Off = **0** extra characters (key omitted). Inbound **exact** `1` only — `readOnly=0` / empty / other values do **not** hide chrome |
| Security | Chrome hide only. Not Cognos ACL. DevTools class/hash edit is accepted |
| Cognos authoring | Unchanged (`_KDB.state.authoring` out) |

Do **not** use opaque hex keys, German `nurLesen`, or HMAC/SHA. UI label stays German **„Nur Lesen“**; hash key is technical English `readOnly`.

---

## 1. Purpose

A dashboard author can share a URL that opens KDB **without** the Steuerung panel and **without** widget-settings gears/menus, while maximize and drillthrough keep working. The copy dialog shows a kdbControl-like switch so the author sees which URL they copy.

---

## 2. Outbound URL

`buildShareDashboardLink` stays `biBase + "#" + params.toString()` (no braces).

When `input.isKdbReadOnly === true`, **after** `parameterLabel`:

```text
params.set("readOnly", "1")
```

Token strings live in `shareControls/config/shareReadOnlyToken.js` (`TOKEN_KEY`, `TOKEN_VALUE`). Do **not** put them in `shareLinkHashKeys.js` (that file stays Cognos `perspective` / `action` / `mode` only).

Click builds **two** strings with the same `biBase` / `boardId` / `parameterId` / `parameterLabel`:

| Switch | `isKdbReadOnly` | Hash tail |
|---|---|---|
| On (default) | `true` | `…&parameterLabel=…&readOnly=1` |
| Off | `false` | same as today |

Pass both into `showCopyable` (see §4). No `location` / `history` mutation.

Reserved keys: Cognos `perspective`, `action`, `mode`, `id`, `objRef`; KDB `parameterId`, `parameterLabel`, **`readOnly`**. Still **not** in `shareLinkHashKeys.js`.

---

## 3. Inbound chrome (not restore)

shareControls **does not** restore `parameterId` (writeback still owns that). **Exception:** shareControls **does** stamp a CSS class from this token so chrome can hide before `kdbControl.mount`.

| Piece | Owner |
|---|---|
| Parse + `classList` | `shareControls/effects/readShareReadOnlyTokenPresent.js` + `applyShareReadOnlyChrome.js` |
| Call site | (1) `__orchestratorShareControls` after facet stamp — early, may miss Cognos hash. (2) **Required second call:** `KDB.js` `finishDashboardInitialization`, **immediately before** `writebackSet.whenUrlShareRestoreSettled()` — same URL snapshot SET uses for `parameterId`. Do **not** stamp inside writeback / `whenUrlShareRestoreSettled.js`. CSS `<link>`s already injected. First call is still before `kdbControl.mount`; second call is after mount (CSS hide, possible brief flash if first missed). |
| Host | `document.querySelector(_KDB.elements.selectors.root.dashboardClassHost)` — **`#main`**. No `getElementById("main")`, not `html`/`body`, not `#kdb-control-root` as class host. **Second** shareControls `dom.mdc` document-root exception (toolbar wait is the first). `document.location.href` is a URL parse, **not** a `dom.mdc` exception |
| Class token | `shareControls/config/shareReadOnlyClass.js` → `SHARE_READ_ONLY_CLASS = "kdb-share-read-only"` |
| Reconcile | **Add** when any candidate has exact `readOnly=1`. **Remove** when none do (absent, empty, `0`, other values). Cognos **reuses `#main`**. |
| Missing host / bad URL | tagged `console.warn`; **no throw**; do not add or remove if the host node is missing |
| Destroy | **do not** `classList` `#main`. Next orchestrator / second apply reconciles from the current URL |

Parse — **copy the writeback ladder, do not import `readUrlParameterId`:**

1. Candidate A = `performance.getEntriesByType("navigation")[0].name` (no fragment).
2. Candidate B = `document.location.href` (has hash). Always listed; do not skip B if A missed `readOnly` (A cannot carry hash-only tokens).
3. Per candidate: `new URL(href, origin)`; query `searchParams.get(TOKEN_KEY)` first; if not exact `"1"`, hash `?`-slice (same as `readUrlParameterId`). Exact `TOKEN_VALUE` (`"1"`) wins and stops. `readOnly=0` / empty / other do not win.

PO Cognos 2026-09-04: new-tab address bar is query-only (`?perspective=&id=&boardId=`), no class on `#main`, no apply warn (host existed; orch hash-only parse silent-removed). `[urlShareWait]` ran ⇒ SET saw a non-null `parameterId` at **restore-settle** time. Chrome must re-read then.

Do **not** stamp inside writeback effects, GET, or `applyDeveloperMode`. **Allowed `KDB.js` exception:** one `applyReadOnlyChrome()` call in `finishDashboardInitialization` immediately before `whenUrlShareRestoreSettled`. Do **not** add a cognosHost facet. Do **not** write `_KDB.state.*`. No new `_KDB.*` namespace. No events. Outbound stays hash-only (`biBase + "#" + params`); do not put `readOnly` on Cognos search unless a later Cognos pass proves the hash is already gone at settle.

---

## 4. messageService `showCopyable` toggle (declarative)

Q11 remains: **no** arbitrary HTML, render callbacks, or consumer event handlers in options.

New **optional** field `toggle` on `showCopyable` only:

```js
toggle: {
  label: string,                 // visible German
  title: string,                 // tooltip / title attr
  isChecked: boolean,            // initial
  copyTextChecked: string,       // URL when on
  copyTextUnchecked: string      // URL when off
}
```

Rules:

- `copyText` stays required. It **must** equal the URL for the initial `isChecked` (share: checked → read-only URL).
- Omit `toggle` → today’s copyable dialog (all other callers). Live `showCopyable` does **not** whitelist/drop unknown option keys — do **not** add a sanitizer that would strip `toggle`.
- Invalid / incomplete `toggle` → ignore it, keep `copyText` only, one `console.warn`. Do not throw.
- Service owns the checkbox. On change: set textarea value **and** mutate `request.options.copyText` to the matching URL. Copy already reads `request.options.copyText` **by reference** at click (`createModalQueue.js`); it does **not** clone a string at enqueue and does **not** read the textarea. Mutating the property is required. **Do not** edit `createModalQueue.js` unless a live Copy click still pastes the old URL.
- Focus trap: include `input:not([disabled])` (live `readFocusable` is only `button` / `textarea` / `[tabindex]`).
- Initial focus stays on the textarea (unchanged).
- Markup: same **visual** switch as kdbControl (`kdb-control_switch-row`, track, `input.kdb-control_switch-input`, `KDB_ToggleButton_slider`). **No** kdbControl JS, **no** `data-kdb-action`. Optional `kdb-message-dialog__toggle` wrapper in `messageService.css` for dialog alignment only (`toggle-button.css` is already in `cssHrefList.js`).
- Placement: **above** the textarea, under the title.
- Tab stop: the checkbox.

`showCopyable` still returns `undefined` (passive queue). No confirm/choose for this switch.

---

## 5. shareControls click + labels

`showCopyable` payload from share (German from `_KDB.config.labels.de.shareControls`):

```js
{
  title: /* existing dialogTitleWithSet / WithoutSet */,
  message: "",
  copyText: readOnlyUrl,
  toggle: {
    label: labels.readOnlyToggleLabel,
    title: labels.readOnlyToggleTitle,
    isChecked: true,
    copyTextChecked: readOnlyUrl,
    copyTextUnchecked: editUrl
  }
}
```

New keys:

| Key | German |
|---|---|
| `readOnlyToggleLabel` | `Nur Lesen` |
| `readOnlyToggleTitle` | `Ohne KDB-Steuerung und Widget-Einstellungen` |

Existing titles unchanged. Live `bindShareClick.js` is **110** lines / 2 AMD; `onShareClick` is already **57** / controller-fn cap **60**. Dual URL + `toggle` **must** go in a new factory-scope file `openShareCopyDialog.js` (imported by `bindShareClick`, **not** by the controller). Controller stays **≤6 AMD**.

---

## 6. CSS hide-set

New file `KDB3/css/shareReadOnly.css`. `cssHrefList.js` entry **`./v1/ext/KDB3/css/shareReadOnly.css` immediately after** `shareControls.css`.

```css
#main.kdb-share-read-only #kdb-control-root,
#main.kdb-share-read-only .KDB_widgetSettingsButton,
#main.kdb-share-read-only .KDB_widgetSettings,
#main.kdb-share-read-only .KDB_focusModeSettingsPanel {
  display: none !important;
}
```

`!important` beats `.KDB_widgetSettings.KDB_visible { display: flex }` and `.expandModeContainer .KDB_widgetSettingsButton { display: inline-block !important }`.

| Hide | Keep |
|---|---|
| Entire Steuerung `#kdb-control-root` (content **and** collapse strip) | `.kdb-widget-maximize` |
| Gear `.KDB_widgetSettingsButton` (vis **and** text) | `.kdb_hyperlink_icon` / `.kdb-datapoint-pkz` / T1 `.liveWidgetAnnotations` |
| Panel `.KDB_widgetSettings` (so a hidden gear cannot still open the menu) | `.widgetIcons` as a whole |
| Focus clone `.KDB_focusModeSettingsPanel` (settings chrome; exit maximize stays `[role="button"].collapseSvg.focusMode`) | leftover / IBM developer invert |

Do **not** copy `pdfCapture.css` grouped selectors. Do **not** reuse `KDB_developerMode`, `KDB_hide`, `hidWs`, `kdb-pdf-capturing`. Do **not** skip `placeWidgetSettingsPanel` (leftover `:has(.KDB_widgetSettings)` + vis seedDefaults).

---

## 7. Files (implementation, after Approved)

| Path | Job |
|---|---|
| `KDB3/js/dashboard/controls/shareControls/config/shareReadOnlyToken.js` | `TOKEN_KEY` / `TOKEN_VALUE` |
| `KDB3/js/dashboard/controls/shareControls/config/shareReadOnlyClass.js` | `SHARE_READ_ONLY_CLASS` |
| `KDB3/js/dashboard/controls/shareControls/config/shareLabels.js` | two German keys |
| `KDB3/js/dashboard/controls/shareControls/effects/buildShareDashboardLink.js` | optional `params.set` |
| `KDB3/js/dashboard/controls/shareControls/effects/readShareReadOnlyTokenPresent.js` | **required** — A-then-B, query-then-hash, exact `1`; do not import `readUrlParameterId` |
| `KDB3/js/dashboard/controls/shareControls/effects/applyShareReadOnlyChrome.js` | host + add/remove; uses token-present helper |
| `KDB3/js/dashboard/controls/shareControls/__orchestratorShareControls.js` | early apply; assign `applyReadOnlyChrome` via `.bind(null, _KDB)` (controller AMD stays 6) |
| `KDB3/js/KDB.js` | **one wiring call** in `finishDashboardInitialization` immediately before `whenUrlShareRestoreSettled` — no extra AMD |
| `KDB3/js/dashboard/controls/shareControls/effects/openShareCopyDialog.js` | **required** — dual URL + `showCopyable` `toggle` |
| `KDB3/js/dashboard/controls/shareControls/effects/bindShareClick.js` | click → `openShareCopyDialog` only (stay ≤150 / `onShareClick` ≤60) |
| `KDB3/css/shareReadOnly.css` | hide-set |
| `KDB3/js/core/css/config/cssHrefList.js` | one href |
| `KDB3/js/core/services/messageService/view/appendCopyableToggle.js` | **required** — toggle markup; factory-scope |
| `KDB3/js/core/services/messageService/view/bindCopyableToggle.js` | **required** — change handler + `options.copyText` mutation; try/catch |
| `KDB3/js/core/services/messageService/view/buildMessageDialog.js` | call append when `toggle` valid; return `toggleInputEl` on handle |
| `KDB3/js/core/services/messageService/view/bindMessageDialog.js` | `readFocusable` adds `input:not([disabled])`; call `bindCopyableToggle` (live **130** — do not inline the handler) |
| `KDB3/js/core/services/messageService/effects/createModalQueue.js` | **do not edit** unless Copy still uses a stale string after `options.copyText` mutation |
| `KDB3/css/messageService.css` | optional toggle-row alignment |

Hard caps: JS 150 / orch 120 / controller-fn 60 / AMD 10 (smell at 6). Named helpers at AMD factory scope. `try/catch` on apply + click. English ids; German only in labels.

---

## 8. Out of scope

- Toolbar toggle (pad B), custom share modal (pad C), `hidWs` / `KDB_developerMode` (pad D)
- Skip-building settings panel (pad E)
- Writeback GET/SET, `readUrlParameterId` schema, `parameterLabel` inbound
- Extra `KDB.js` AMD (one `applyReadOnlyChrome()` call is the allowed wiring exception)
- `.cursor/rules/*.mdc`
- Cognos collaboration share plugin
- Real ACL / SuperUser / tableData rights
- Hiding leftover widgets, IBM chrome, launchpad, filters, header/footer

---

## 9. Parent one-liners (after Approved)

**shareControls.md**

- §0 Dialog: `showCopyable` **plus optional declarative `toggle`** (messageService). Still no Glass / custom share portal.
- §9: five shareControls files — `shareReadOnlyToken.js`, `shareReadOnlyClass.js`, `applyShareReadOnlyChrome.js`, `readShareReadOnlyTokenPresent.js`, `openShareCopyDialog.js` — plus label/href/CSS edits, `applyReadOnlyChrome` API, `KDB.js` second apply. Document the second `#main` `querySelector` exception.
- §10.2: dual URL; optional token after `parameterLabel`; `isKdbReadOnly`.
- §10.3: `readOnlyToggleLabel` / `readOnlyToggleTitle`.
- New short subsection: inbound chrome class from token at orchestrator **and** at `finishDashboardInitialization` (same slot as SET URL read); destroy does not touch `#main`; not SET restore.

**messageService.md**

- Q11: still no HTML/callbacks; optional `toggle` object is in-bounds.
- Method table `showCopyable`: shared fields plus `copyText`, optional `toggle`, existing copy/close labels. Copy uses the **current** `options.copyText` after a toggle change.
- Focus trap includes `input:not([disabled])`. View files may add `appendCopyableToggle.js` / `bindCopyableToggle.js` (verb+noun).

---

## 10. Cognos checklist (after implementation)

1. Teilen, switch **on** (default): hash ends with `&readOnly=1` (~12 extra characters). Copy.
2. Switch **off**: hash has **no** `readOnly` key. Copy.
3. Open a read-only link **in a new tab**: no kdbControl (no collapse strip); vis + text have no gear / no settings panel; maximize + drillthrough still work. `#main` has `kdb-share-read-only`.
4. Open a normal share (no token): kdbControl + gears as today.
5. Read-only + leftover widgets: still hidden unless developer mode (class is **not** `KDB_developerMode`).
6. Read-only + parameter set in the URL: SET restore still runs; chrome stays hidden.
7. After a read-only dashboard, open a normal URL in the same Cognos `#main`: kdbControl and gears return (apply **removed** the class).
8. Optional: open a URL with `readOnly=0` (or other value) — chrome **not** hidden (exact `1` only).

---

## Approval log

| Date | Status | Approver | Notes |
|---|---|---|---|
| 2026-09-04 | Draft | coordinator | Pad A. Polarität „Nur Lesen“ default on; token `7c91e04b2a1f=1`. |
| 2026-09-04 | Draft (nits) | coordinator after [Verify read-only delta](23ea6f5a-42f7-4018-922f-5921512e24c5) | No PO blockers. Stamp before `kdbControl.mount` (not “any mount”). `openShareCopyDialog.js` required (`onShareClick` 57/60). Copy is live `options.copyText` by reference. Line counts: orch 68, `bindShareClick` 110. |
| 2026-09-04 | Draft (blocker) | coordinator after [Semantic contract vs live](5ebf52ab-768f-487a-9cb5-15bc7b604827) | Apply **add and remove** on `#main` from current hash (Cognos reuses host). Destroy still does not touch the class. Parse `location.href` + `?`-slice like `readUrlParameterId`; no `showCopyable` sanitizer. |
| 2026-09-04 | Draft (MUST nits) | coordinator after [Mechanical MUST review](72c8f160-8dd4-49ee-9305-02bad4948ad7) | §9 four-file list (blocker was stale vs live delta). Second `#main` query exception. Required `appendCopyableToggle` / `bindCopyableToggle`. Checklist English. Item 7: class remove on later normal URL. |
| 2026-09-04 | **Approved** | PO vastenburg | Implement W1–W4. Do not reopen pad A / polarity / token / hide-set. |
| 2026-09-04 | Implemented — awaiting PO Cognos | Captain after [Mechanical MUST](4c686cd4-06fe-4958-9ecd-3a5e705c1bee) + [Semantic delta](5b20fb0e-365c-4e24-b1e3-0458a3cb8634) | Dual review PASS WITH NITS (no FAIL). Parent one-liners patched. Accepted nits: apply 97/70; `.bind(null)`; Object.assign dual URL; parse-fail warn wording. |
| 2026-09-04 | Product patch (token) | PO vastenburg | Readable English `readOnly=1` (not opaque hex, not `nurLesen`). Inbound exact `1` only. UI label stays „Nur Lesen“. |
| 2026-09-04 | Cognos miss → copy SET parse | PO vastenburg + captain | New-tab query-only bar; no class; `[urlShareWait]` ran. Second apply in `KDB.js` before SET settle; fork A/B query+hash. |
| 2026-09-04 | Implemented — awaiting PO Cognos retest | Captain after [MUST](f70eebfb-35a5-410a-abaa-a472d9c7ec03) + [semantic](5237a740-6465-426c-9ace-ac2cf21405c5) | PASS WITH NITS. Controller comment patched. `.bind(null)` accepted. |
| 2026-09-04 | **Approved — Cognos green** | PO vastenburg | New-tab hide + share dialog green. Army leftover scan CLEAN. |
