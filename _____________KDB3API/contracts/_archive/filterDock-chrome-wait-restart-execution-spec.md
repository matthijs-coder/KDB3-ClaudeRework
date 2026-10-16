# Execution Spec: FilterDock chrome wait after `whenUrl`

> **Superseded 2026-08-30.** Live: `ready` → lift spinner → `filterDock.mount` → fire `whenUrl()` **no await**. Dock is not gated on share settlement. Do **not** move `filterDock.mount` after `await p`. See writeback delta §6.2 items 1–5 and `share-inbound-cleanup-execution-spec.md`.

> Separate from inbound share membership (`selectParameterSetById`). Do **not** scrape `#selectParameterSet` from filterDock. Do **not** revert overlay C. Do **not** invent a 60s overlay.
> Source: `filterDock.md` bootstrap; `writeback-urlParameterId-contractdelta.md` §6.2 item 4.
> Army verdict 2026-08-29: [FilterDock wait vs overlay](49a4d078-73cd-47bb-9e5b-08a23b0765e4) — **B**.

---

**Status:** `Superseded`
**Captain spec patch:** 2026-08-29 ~21:56 (PO Cognos: FilterDock 30s miss ~29s after boot despite C + wait-chain) ~00:43 superseded: mount after lift, not after await p.
**Module / contract:** `filterDock.md` (bootstrap when); writeback delta §6.2 leftover closed
**Phase:** `fix` (chrome-wait clock)
**Authoring AI:** Cursor Grok 4.6 captain, 2026-08-29
**Executing AI:** captain (KDB.js one-call-site wiring; army exception)

---

## Section A. Pre-flight

Echo one sentence per MUST, then edit.

1. KEEP C: `p = whenUrl()` → `ready` → `finishLoading` → `await p` → **then** `filterDock.mount({})` → `presentPending`.
2. First FilterDock 30s wait starts **after** `await p` (absent / SET / recovery / failed / throw), **before** `presentPending`. Alert must not gate chrome.
3. Remove `filterDock.mount({})` from `mountFeatureModules`. Do not start-then-abort. Do not `await` `mount()` (still returns `true` when armed).
4. Reuse `waitForFilterDockReady` (30s, three selectors, `trackChromeWait`). Never `timeoutMs: 0`.
5. Do not edit filterDock JS, writeback wait-chain, `selectParameterSetById`, or tabs hydrate. Do not mix dock into share membership.

---

## Exclusive allowlist

**May edit:**

- `KDB3/js/KDB.js` only (move one `filterDock.mount({})`)

**Must not:** `filterDock/**` JS, `writeback/**` JS, `tabs/**`, `cognosWritebackBridge.js`, `.cursor/rules/*.mdc`, git commit/push.

---

## Section C. `KDB.js`

Live ~411 / 500. Stay under 500. One writer.

1. Delete `_KDB.api.filterDock.mount({});` from `mountFeatureModules` (today ~line 90). Leave `singleSelect` / `dienststelle` / `sicht` / other mounts unchanged.
2. In `finishDashboardInitialization`, after the `try { if (p) await p; } catch` block and **before** `presentPendingUrlShareMessage`:
   - if `!this._isDisposed`: `this.api.filterDock.mount({})`;
   - do not await;
   - still call this if `await p` threw (dock chrome is independent of share restore).
3. Keep overlay-lift-before-await. Do not add abort/remount. Do not split `KDB.js`.

Empty share: `absent` is sync; `await p` returns immediately after lift; dock wait starts then. Inbound-with-id: wait starts after canvas + select + SET / recovery; host `#filterDockContainer` is expected present (PO poll: `dockNow: true` after alert). If already in DOM, `waitForElObserver` resolves immediately.

---

## Section J. Acceptance

1. Inbound known-id: no `[filterDock.mount] filter dock wait failed` / `#filterDockContainer` 30s miss ~29s after boot. Dock binds after spinner + URL path.
2. Empty share: dock wait starts right after lift; no extra overlay; no extra delay vs overlay C.
3. Missing-id / host-list-unready alert still after lift; dock wait does not wait on dismiss.
4. No filterDock JS diff. No `selectParameterSetById` diff for this ticket.
5. Tabs `.ba-common-tabList__tooltip` 30s hydrate remains a **sibling leftover** (not this allowlist).

---

## Section K. Forbidden

No revert C; no 60s overlay; no FilterDock scrape of `#selectParameterSet`; no abort-then-immediate-`mount()` (coalesce race); no new public `remount()`; no tabs fold-in; no git commit/push.
