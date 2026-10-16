define(["./dispatchToolboxTabsAdd"], function (_dispatchToolboxTabsAdd) {
  "use strict";
  let didWarnTabsDispatch = false;
  let didWarnCommentsDispatch = false;
  let kdbForToolboxPlaceholders = null;
  function safeTabsDispatch(_KDB, intent) {
    const api = _KDB && _KDB.api && _KDB.api.tabs;
    if (api && typeof api.dispatch === "function") {
      api.dispatch(intent);
      return;
    }
    if (!didWarnTabsDispatch) {
      didWarnTabsDispatch = true;
      console.warn("[kdbControl] _KDB.api.tabs.dispatch is missing; toolbox tab placeholder actions are ignored.");
    }
  }
  function safeCommentsDispatch(_KDB, intent) {
    const api = _KDB && _KDB.api && _KDB.api.comments;
    if (api && typeof api.dispatch === "function") {
      api.dispatch(intent);
      return;
    }
    if (!didWarnCommentsDispatch) {
      didWarnCommentsDispatch = true;
      console.warn("[kdbControl] _KDB.api.comments.dispatch is missing; toolbox comment placeholder actions are ignored.");
    }
  }
  function dispatchCommentsStartCreate() {
    const _KDB = kdbForToolboxPlaceholders;
    if (!_KDB) return;
    safeCommentsDispatch(_KDB, { type: "comments/startCreate", payload: { source: "kdbControl" } });
  }
  function startCommentsTextDrag(ev) {
    const buttonEl = ev.target;
    const _KDB = kdbForToolboxPlaceholders;
    const api = _KDB && _KDB.api && _KDB.api.dragDrop;
    if (!api || typeof api.startDrag !== "function") return false;
    return api.startDrag(ev, buildCommentsTextDragSourceInfo(buttonEl));
  }
  function finishCommentsTextDrag(ev) {
    const _KDB = kdbForToolboxPlaceholders;
    const api = _KDB && _KDB.api && _KDB.api.dragDrop;
    if (!api || typeof api.finishDrag !== "function") return false;
    return api.finishDrag(ev);
  }
  function buildCommentsTextDragSourceInfo(buttonEl) {
    return {
      dragSourceEl: buttonEl,
      draggedElementType: "text",
      originId: buttonEl.id || null,
      payload: {
        draggedElementType: "text",
        display: "Kommentar",
        title: "Kommentar",
        name: "Kommentar"
      },
      sourceKind: "toolboxTextButton"
    };
  }
  function onTabsAddClick(ev) {
    const t = ev.target;
    if (!t || t.tagName !== "BUTTON") return;
    if (t.getAttribute("data-kdb-action") !== "tabs.add") return;
    const _KDB = kdbForToolboxPlaceholders;
    if (!_KDB) return;
    _dispatchToolboxTabsAdd(_KDB);
  }
  let tabSelectRaf = 0;
  let tabSelectRafPending = null;
  function flushTabSelectEditTarget() {
    tabSelectRaf = 0;
    const radio = tabSelectRafPending;
    tabSelectRafPending = null;
    if (!radio || radio.tagName !== "INPUT" || radio.type !== "radio") return;
    if (!radio.closest(".kdb-control_tab-edit-placeholder")) return;
    if (!radio.hasAttribute("data-tab-index")) return;
    if (!radio.checked) return;
    const raw = radio.getAttribute("data-tab-index");
    const tabIndex = parseInt(raw, 10);
    if (isNaN(tabIndex)) return;
    const _KDB = kdbForToolboxPlaceholders;
    if (!_KDB) return;
    safeTabsDispatch(_KDB, { type: "tabs/selectEditTarget", payload: { source: "kdbControl", tabIndex: tabIndex } });
  }
  function scheduleTabSelectEditTarget(radio) {
    if (!radio || radio.tagName !== "INPUT" || radio.type !== "radio") return;
    if (!radio.closest(".kdb-control_tab-edit-placeholder")) return;
    if (!radio.hasAttribute("data-tab-index")) return;
    tabSelectRafPending = radio;
    if (tabSelectRaf) cancelAnimationFrame(tabSelectRaf);
    tabSelectRaf = requestAnimationFrame(flushTabSelectEditTarget);
  }
  /** Tab-edit radios: `change` (keyboard / programmatic) + `click` (incl. label); rAF coalesces duplicate change+click. */
  function onTabEditActionRadioChange(ev) {
    const t = ev.target;
    if (!t || t.tagName !== "INPUT" || t.type !== "radio") return;
    scheduleTabSelectEditTarget(t);
  }
  function onTabEditActionRadioClick(ev) {
    const t = ev.target;
    if (!t) return;
    let radio = null;
    if (t.tagName === "INPUT" && t.type === "radio") radio = t;
    else if (t.tagName === "LABEL") radio = t.querySelector('input[type="radio"][data-tab-index]');
    if (!radio) return;
    scheduleTabSelectEditTarget(radio);
  }
  function isCommentsStartPlaceholderTarget(t) {
    return !!(t && t.tagName === "BUTTON" && t.getAttribute("data-kdb-toolbox-placeholder") === "comments.startCreate");
  }
  function __controller(_ctx, _signal) {
    const el = _ctx.contentEl;
    if (!el) return;
    kdbForToolboxPlaceholders = _ctx._KDB;
    el.addEventListener("click", onTabsAddClick, { signal: _signal });
    el.addEventListener("change", onTabEditActionRadioChange, { signal: _signal });
    el.addEventListener("click", onTabEditActionRadioClick, { signal: _signal });
    el.addEventListener(
      "click",
      function (ev) {
        if (isCommentsStartPlaceholderTarget(ev.target)) dispatchCommentsStartCreate();
      },
      { signal: _signal }
    );
    el.addEventListener(
      "mousedown",
      function (ev) {
        if (isCommentsStartPlaceholderTarget(ev.target)) dispatchCommentsStartCreate();
      },
      { signal: _signal }
    );
    el.addEventListener(
      "dragstart",
      function (ev) {
        if (isCommentsStartPlaceholderTarget(ev.target)) startCommentsTextDrag(ev);
      },
      { signal: _signal }
    );
    el.addEventListener(
      "dragend",
      function (ev) {
        if (isCommentsStartPlaceholderTarget(ev.target)) finishCommentsTextDrag(ev);
      },
      { signal: _signal }
    );
  }
  return __controller;
});
