define([], function () {
  "use strict";
  function setClass(el, cls, on) {
    try {
      if (!el) return;
      if (on) el.classList.add(cls);
      else el.classList.remove(cls);
    } catch (err) {
      console.error("[kdbControl.syncFrameworkTabEditUi] setClass failed", err);
      throw err;
    }
  }
  function syncTabEditAreaVisibility(_KDB, rootOrGallery) {
    try {
      var tabsApi = _KDB && _KDB.api && _KDB.api.tabs;
      if (!tabsApi || typeof tabsApi.getState !== "function") return;
      var st;
      try {
        st = tabsApi.getState();
      } catch (err) {
        return;
      }
      if (!st || typeof st !== "object") return;
      var container = rootOrGallery;
      if (!container || !container.querySelector) return;
      var area = container.querySelector(".kdb-control_tab-edit-area");
      if (!area) return;
      var visible = st.editUi && st.editUi.toolboxVisible === true;
      setClass(area, "KDB_visible", visible);
      area.hidden = !visible;
      var ph = area.querySelector(".kdb-control_tab-edit-placeholder");
      if (!ph) return;
      var visibleTabIndexes = {};
      var editIndexes = st.editUi && Array.isArray(st.editUi.visibleEditTabIndexes) ? st.editUi.visibleEditTabIndexes : null;
      if (editIndexes) {
        var e;
        for (e = 0; e < editIndexes.length; e++) {
          visibleTabIndexes[editIndexes[e]] = true;
        }
      } else if (Array.isArray(st.visibleTabs)) {
        var t;
        for (t = 0; t < st.visibleTabs.length; t++) {
          if (st.visibleTabs[t] && typeof st.visibleTabs[t].index === "number") {
            visibleTabIndexes[st.visibleTabs[t].index] = true;
          }
        }
      }
      var radios = ph.querySelectorAll('input[type="radio"][data-tab-index]');
      var i;
      for (i = 0; i < radios.length; i++) {
        var r = radios[i];
        var raw = r.getAttribute("data-tab-index");
        var idx = parseInt(raw, 10);
        var show = !isNaN(idx) && visibleTabIndexes[idx] === true;
        var label = r.closest && r.closest("label");
        r.hidden = !show;
        if (label) {
          label.hidden = !show;
          setClass(label, "KDB_hidden", !show);
        }
      }
    } catch (err) {
      console.error("[kdbControl.syncFrameworkTabEditUi] syncTabEditAreaVisibility failed", err);
      throw err;
    }
  }
  function syncTabToolboxEditRadiosFromOwner(_KDB, rootOrGallery) {
    try {
      var tabsApi = _KDB && _KDB.api && _KDB.api.tabs;
      if (!tabsApi || typeof tabsApi.getState !== "function") return;
      var st;
      try {
        st = tabsApi.getState();
      } catch (err) {
        return;
      }
      if (!st || typeof st !== "object") return;
      var lineIdx = st.toolboxTabEditLineIndex;
      var container = rootOrGallery;
      if (!container || !container.querySelector) return;
      var ph = container.querySelector(".kdb-control_tab-edit-placeholder");
      if (!ph) return;
      var radios = ph.querySelectorAll('input[type="radio"][data-tab-index]');
      var valid =
        typeof lineIdx === "number" &&
        lineIdx === Math.floor(lineIdx) &&
        lineIdx >= 0 &&
        lineIdx <= 4;
      var i;
      for (i = 0; i < radios.length; i++) {
        var r = radios[i];
        var raw = r.getAttribute("data-tab-index");
        var idx = parseInt(raw, 10);
        var parsedOk = !isNaN(idx);
        r.checked = valid && parsedOk && idx === lineIdx;
      }
    } catch (err) {
      console.error("[kdbControl.syncFrameworkTabEditUi] syncTabToolboxEditRadiosFromOwner failed", err);
      throw err;
    }
  }
  function __controller(_KDB, _rootOrGallery) {
    try {
      syncTabEditAreaVisibility(_KDB, _rootOrGallery);
      syncTabToolboxEditRadiosFromOwner(_KDB, _rootOrGallery);
    } catch (err) {
      console.error("[kdbControl.syncFrameworkTabEditUi] failed", err);
      throw err;
    }
  }
  return __controller;
});
