define([
  "../effects.js",
  "../config/labels.js",
  "../../../../core/utils/kit/runtime.js"
], function (_effects, _labels, _rt) {
  "use strict";

  var TABS_MAX_VISIBLE_CODE = "TABS_MAX_VISIBLE";
  var TAB_EDIT_AREA_SELECTOR = ".kdb-control_tab-edit-placeholder";
  var TAB_SELECT_TIMER_KEY = "tabSelectEditTarget";

  function isCommentsStartTarget(target) {
    return !!target && target.tagName === "BUTTON" && target.getAttribute("data-kdb-toolbox-placeholder") === "comments.startCreate";
  }

  function isTabEditRadio(el) {
    return !!el && el.tagName === "INPUT" && el.type === "radio" && !!el.closest(TAB_EDIT_AREA_SELECTOR) && el.hasAttribute("data-tab-index");
  }

  // Adds a tab through the tabs owner; blocked (fail closed) when tabs state or the message service is unavailable.
  function addTab(_KDB) {
    try {
      var tabsApi = _KDB.api && _KDB.api.tabs;
      var snapshot = tabsApi ? tabsApi.getState() : null;
      if (snapshot === undefined || snapshot === null || typeof snapshot !== "object") {
        console.warn("[kdbControl.addTab] tabs getState unavailable; add blocked");
        return;
      }
      var messages = _KDB.services && _KDB.services.message;
      if (!messages) {
        console.warn("[kdbControl.addTab] messageService.notify unavailable; add blocked (fail closed)");
        return;
      }
      if (snapshot.canAdd !== true) {
        messages.notify({ severity: "warning", message: _labels.toolbox.maxTabsReached, code: TABS_MAX_VISIBLE_CODE });
        return;
      }
      _effects.dispatchToOwnerApi(_KDB, "tabs", { type: "tabs/add", payload: { source: "kdbControl" } });
    } catch (err) {
      console.error("[kdbControl.addTab] failed", err);
    }
  }

  function buildCommentsDragSource(buttonEl) {
    var caption = _labels.toolbox.commentButton;
    return {
      dragSourceEl: buttonEl,
      draggedElementType: "text",
      originId: buttonEl.id || null,
      payload: { draggedElementType: "text", display: caption, title: caption, name: caption },
      sourceKind: "toolboxTextButton"
    };
  }

  // Toolbox buttons: add tab, tab-edit radios (coalesced per frame), comment create/drag.
  function bindToolboxActions(ctx, signal) {
    var _KDB = ctx._KDB;
    var rt = _KDB.runtime.kdbControl;
    var pendingRadio = null;

    function selectPendingTabEditTarget() {
      var radio = pendingRadio;
      pendingRadio = null;
      if (!isTabEditRadio(radio) || !radio.checked) return;
      var tabIndex = parseInt(radio.getAttribute("data-tab-index"), 10);
      if (isNaN(tabIndex)) return;
      _effects.dispatchToOwnerApi(_KDB, "tabs", { type: "tabs/selectEditTarget", payload: { source: "kdbControl", tabIndex: tabIndex } });
    }

    // change (keyboard/programmatic) and click (incl. label) both arrive; one frame coalesces the pair.
    function scheduleTabEditTarget(radio) {
      if (!isTabEditRadio(radio)) return;
      pendingRadio = radio;
      _rt.scheduleFrame(rt.timers, TAB_SELECT_TIMER_KEY, selectPendingTabEditTarget);
    }

    function startCommentCreate() {
      _effects.dispatchToOwnerApi(_KDB, "comments", { type: "comments/startCreate", payload: { source: "kdbControl" } });
    }

    function onClick(event) {
      var target = event.target;
      if (!target) return;
      if (target.tagName === "BUTTON" && target.getAttribute("data-kdb-action") === "tabs.add") addTab(_KDB);
      if (target.tagName === "INPUT" && target.type === "radio") scheduleTabEditTarget(target);
      else if (target.tagName === "LABEL") scheduleTabEditTarget(target.querySelector('input[type="radio"][data-tab-index]'));
      if (isCommentsStartTarget(target)) startCommentCreate();
    }

    function onChange(event) {
      var target = event.target;
      if (target && target.tagName === "INPUT" && target.type === "radio") scheduleTabEditTarget(target);
    }

    function onMouseDown(event) {
      if (isCommentsStartTarget(event.target)) startCommentCreate();
    }

    function onDragStart(event) {
      var dragDrop = _KDB.api && _KDB.api.dragDrop;
      if (isCommentsStartTarget(event.target) && dragDrop) {
        dragDrop.startDrag(event, buildCommentsDragSource(event.target));
      }
    }

    function onDragEnd(event) {
      var dragDrop = _KDB.api && _KDB.api.dragDrop;
      if (isCommentsStartTarget(event.target) && dragDrop) dragDrop.finishDrag(event);
    }

    ctx.contentEl.addEventListener("click", onClick, { signal: signal });
    ctx.contentEl.addEventListener("change", onChange, { signal: signal });
    ctx.contentEl.addEventListener("mousedown", onMouseDown, { signal: signal });
    ctx.contentEl.addEventListener("dragstart", onDragStart, { signal: signal });
    ctx.contentEl.addEventListener("dragend", onDragEnd, { signal: signal });
  }

  return bindToolboxActions;
});
