define([], function () {
  "use strict";

  function activeEditTarget(st) {
    var target = st && (st.activeEditableTarget || (st.editTarget === "mainTitle" ? "title" : st.editTarget));
    return target === "title" || target === "subtitle" ? target : null;
  }
  function cleanupEditSession(_KDB) {
    var rt = _KDB.runtime.header;
    var ac = rt.abortControllers && rt.abortControllers.editSession;
    if (ac && typeof ac.abort === "function") ac.abort();
    if (rt.abortControllers) delete rt.abortControllers.editSession;
    rt.currentEditTarget = null;
  }
  function placeCursorAtEnd(node) {
    if (!node || typeof document === "undefined" || typeof window === "undefined") return;
    var range = document.createRange();
    var selection = window.getSelection && window.getSelection();
    if (!range || !selection) return;
    range.selectNodeContents(node);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }
  function scheduleFocus(_KDB, target, node) {
    var run = function () {
      var st = _KDB.state && _KDB.state.header;
      if (activeEditTarget(st) !== target || !node || !node.isConnected) return;
      node.focus();
      placeCursorAtEnd(node);
    };
    run();
    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") window.requestAnimationFrame(run);
    else if (typeof window !== "undefined" && typeof window.setTimeout === "function") window.setTimeout(run, 0);
  }
  function commitCurrentEdit(_KDB, target) {
    var ha = _KDB.api && _KDB.api.header;
    var st = _KDB.state && _KDB.state.header;
    if (!ha || typeof ha.dispatch !== "function" || activeEditTarget(st) !== target) return;
    var dr = _KDB.runtime.header.domRefs;
    var node = target === "subtitle" ? dr.subtitleEl : dr.titleEl;
    var type = target === "subtitle" ? "header/commitSubtitle" : "header/commitTitle";
    var source = _KDB.runtime.header.activeEditSource || "api";
    ha.dispatch({ type: type, payload: { source: source, text: node ? String(node.textContent || "") : "" } });
  }
  function bindHeaderEditSession(_KDB, action) {
    var st = _KDB.state.header;
    var rt = _KDB.runtime.header;
    var dr = rt.domRefs;
    var target = activeEditTarget(st);
    if (!target || !dr || !dr.rootEl) {
      cleanupEditSession(_KDB);
      rt.activeEditSource = null;
      return;
    }
    if (rt.currentEditTarget === target && rt.abortControllers && rt.abortControllers.editSession) return;
    cleanupEditSession(_KDB);
    var node = target === "subtitle" ? dr.subtitleEl : dr.titleEl;
    if (!node) return;
    var ac = typeof AbortController !== "undefined" ? new AbortController() : null;
    if (ac) rt.abortControllers.editSession = ac;
    rt.currentEditTarget = target;
    if (action && action.payload && action.payload.source) rt.activeEditSource = action.payload.source;
    var opts = ac ? { signal: ac.signal } : false;
    node.addEventListener(
      "keydown",
      function (ev) {
        if (ev && ev.key === "Enter") {
          ev.preventDefault();
          commitCurrentEdit(_KDB, target);
        }
      },
      opts
    );
    node.addEventListener(
      "blur",
      function () {
        window.setTimeout(function () {
          commitCurrentEdit(_KDB, target);
        }, 0);
      },
      opts
    );
    document.addEventListener(
      "pointerdown",
      function (ev) {
        var t = ev && ev.target;
        if (t && (t === node || (node.contains && node.contains(t)))) return;
        window.setTimeout(function () {
          commitCurrentEdit(_KDB, target);
        }, 0);
      },
      opts
    );
    scheduleFocus(_KDB, target, node);
  }

  return bindHeaderEditSession;
});
