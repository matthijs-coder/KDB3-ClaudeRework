define(["../events/eventNames", "./warnMissingOwnerApis"], function (_eventNames, _warnApis) {
  "use strict";
  var SETTINGS_CP1_INPUT_IDS = {
    dashboardWidth: 1,
    dashboardHeight: 1,
    dashboardBg: 1,
    graphWidth: 1,
    graphHeight: 1,
    graphBg: 1,
    commentWidth: 1,
    commentHeight: 1,
    commentBg: 1,
    panelBg: 1,
    panelButton: 1,
    panelActionButton: 1,
    panelInnerBg: 1,
  };
  var kdbForFrameworkPrimitives = null;
  function readFrameworkBindContext(_KDB) {
    return _KDB && _KDB.runtime && _KDB.runtime.kdbControl && _KDB.runtime.kdbControl.frameworkBindContext;
  }
  function primitiveSyncAfter() {
    var ctx = readFrameworkBindContext(kdbForFrameworkPrimitives);
    if (ctx && typeof ctx.syncView === "function") ctx.syncView();
  }
  function dispatchHeaderEditRadio(value) {
    var _KDB = kdbForFrameworkPrimitives;
    if (!_KDB) return;
    var ha = _KDB.api && _KDB.api.header;
    if (!ha || typeof ha.dispatch !== "function") {
      _warnApis.warnMissingHeaderDispatch();
      return;
    }
    var typ = value === "renameHeaderSubtitle" ? "header/startSubtitleEdit" : "header/startTitleEdit";
    ha.dispatch({ type: typ, payload: { source: "kdbControl" } });
    primitiveSyncAfter();
  }
  function onPrimitiveInput(ev) {
    var ctx = readFrameworkBindContext(kdbForFrameworkPrimitives);
    if (!ctx) return;
    var t = ev.target;
    if (!t || !t.getAttribute) return;
    var iid = t.getAttribute("data-placeholder-input-id");
    if (!iid || (ev.type === "input" && t.tagName !== "INPUT")) return;
    if (SETTINGS_CP1_INPUT_IDS[iid]) return;
    ctx.dispatch({
      type: _eventNames.ACTION_FRAMEWORK_SET_PLACEHOLDER_INPUT,
      payload: { inputId: iid, value: t.value },
    });
    primitiveSyncAfter();
  }
  function onPrimitiveChange(ev) {
    var ctx = readFrameworkBindContext(kdbForFrameworkPrimitives);
    if (!ctx) return;
    var t = ev.target;
    if (!t || !t.getAttribute) return;
    if (t.tagName === "SELECT") {
      var scid = t.getAttribute("data-placeholder-control-id");
      if (scid) {
        ctx.dispatch({
          type: _eventNames.ACTION_FRAMEWORK_SET_PLACEHOLDER_SELECTION,
          payload: { controlId: scid, value: t.value },
        });
        primitiveSyncAfter();
      }
      return;
    }
    if (t.tagName === "INPUT" && t.getAttribute("type") === "radio" && t.name) {
      var row = t.closest(".kdb-control__gallery-row-radio[data-placeholder-control-id]");
      var cid = row && row.getAttribute("data-placeholder-control-id");
      if (cid === "headerEditMode" && t.checked) {
        dispatchHeaderEditRadio(t.value);
        return;
      }
      if (t.closest && t.closest(".kdb-control_tab-edit-placeholder")) {
        return;
      }
      if (cid && t.checked) {
        ctx.dispatch({
          type: _eventNames.ACTION_FRAMEWORK_SET_PLACEHOLDER_SELECTION,
          payload: { controlId: cid, value: t.value },
        });
        primitiveSyncAfter();
      }
    }
  }
  function onPrimitiveClick(ev) {
    var ctx = readFrameworkBindContext(kdbForFrameworkPrimitives);
    if (!ctx) return;
    var t = ev.target;
    if (!t || !t.closest) return;
    var btn = t.closest("[data-placeholder-control-id]");
    if (!btn || btn.tagName !== "BUTTON") return;
    var cid = btn.getAttribute("data-placeholder-control-id");
    if (!cid) return;
    ctx.dispatch({
      type: _eventNames.ACTION_FRAMEWORK_SET_PLACEHOLDER_SELECTION,
      payload: { controlId: cid, value: "selected" },
    });
    primitiveSyncAfter();
  }
  function __controller(_ctx, _signal) {
    var el = _ctx.contentEl;
    if (!el) return;
    kdbForFrameworkPrimitives = _ctx._KDB;
    el.addEventListener("input", onPrimitiveInput, { signal: _signal });
    el.addEventListener("change", onPrimitiveChange, { signal: _signal });
    el.addEventListener("click", onPrimitiveClick, { signal: _signal });
  }
  return __controller;
});
