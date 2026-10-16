define(["../config/extAssetPaths", "../config/headerIconKeys"], function (_extAssetPaths, _iconKeys) {
  "use strict";
  function setHidden(node, hidden) {
    if (!node) return;
    if (hidden) {
      node.setAttribute("hidden", "hidden");
      node.style.display = "none";
    } else {
      node.removeAttribute("hidden");
      node.style.display = "";
    }
  }
  function setEditable(node, editable, selected) {
    if (!node) return;
    if (editable) {
      node.setAttribute("contenteditable", "true");
      node.setAttribute("tabindex", "-1");
    } else {
      node.removeAttribute("contenteditable");
      node.setAttribute("tabindex", "0");
    }
    if (node.classList) node.classList.toggle("kdb-header-edit-selected", !!selected);
  }
  function syncHeaderFromState(_KDB) {
    var st = _KDB && _KDB.state && _KDB.state.header;
    var rt = _KDB && _KDB.runtime && _KDB.runtime.header;
    var dr = rt && rt.domRefs;
    if (!st || !dr || !dr.rootEl) return;
    var active = st.status === "active";
    setHidden(dr.rootEl, !active);
    if (!active) {
      if (dr.rootEl.classList) dr.rootEl.classList.remove("KDB_topHeaderWrapper--hasSubtitle");
      return;
    }
    var et = st.activeEditableTarget || (st.editTarget === "mainTitle" ? "title" : st.editTarget);
    if (et !== "title") dr.titleEl.textContent = st.titleText || "";
    if (et !== "subtitle") dr.subtitleEl.textContent = st.subtitleText || "";
    var subOn = st.subtitleStatus === "active" || st.subtitleStatus === "visible";
    if (dr.rootEl.classList) {
      dr.rootEl.classList.toggle("KDB_topHeaderWrapper--hasSubtitle", !!subOn);
    }
    setHidden(dr.subtitleEl, !subOn);
    setEditable(dr.titleEl, et === "title", et === "title");
    setEditable(dr.subtitleEl, et === "subtitle", et === "subtitle");
    if (et === "title") {
      dr.draftTitleEl.value = st.draftTitleText || "";
      setHidden(dr.draftTitleEl, true);
      setHidden(dr.draftSubtitleEl, true);
    } else if (et === "subtitle") {
      dr.draftSubtitleEl.value = st.draftSubtitleText || "";
      setHidden(dr.draftSubtitleEl, true);
      setHidden(dr.draftTitleEl, true);
    } else {
      setHidden(dr.draftTitleEl, true);
      setHidden(dr.draftSubtitleEl, true);
    }
    syncHeaderIcon(dr, st, _KDB);
  }
  function syncHeaderIcon(_dr, _st, _KDB) {
    if (!_dr.iconEl) return;
    var iconKey = _st.iconKey || _iconKeys.DEFAULT_ICON_KEY;
    var imgBase = _extAssetPaths.resolveKdb3ExtImagesBase(_KDB);
    _dr.iconEl.setAttribute("src", imgBase + iconKey + ".png");
    _dr.iconEl.setAttribute("data-icon-key", iconKey);
  }
  return syncHeaderFromState;
});
