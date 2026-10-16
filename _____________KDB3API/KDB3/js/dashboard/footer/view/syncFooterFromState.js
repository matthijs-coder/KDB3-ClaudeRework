define(["../state/selectors.js"], function (_selectors) {
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
  function formatDMY(d) {
    return d.getDate() + "." + (d.getMonth() + 1) + "." + d.getFullYear();
  }
  function syncFooterFromState(_KDB) {
    var st = _KDB && _KDB.state && _KDB.state.footer;
    var rt = _KDB && _KDB.runtime && _KDB.runtime.footer;
    var dr = rt && rt.domRefs;
    if (!st || !dr || !dr.rootEl) return;
    var active = st.status === "active";
    setHidden(dr.rootEl, !active);
    if (!active) return;
    if (dr.dashboardTitleEl) {
      dr.dashboardTitleEl.textContent = _selectors.readHeaderTitleText(_KDB);
    }
    if (dr.dataAktEl) {
      dr.dataAktEl.textContent = "Datenaktualisierung: " + String((st && st.aktualisierungsDatumFormatted) || "n.v.");
    }
    if (dr.centerDateUserEl) {
      dr.centerDateUserEl.textContent = formatDMY(new Date()) + " (" + String((st && st.createdUserName) || "unbekannt") + ")";
    }
    if (dr.pageIndicatorEl) {
      var idx = _selectors.readActiveTabIndex(_KDB);
      if (typeof idx === "number") dr.pageIndicatorEl.textContent = String(idx + 1);
    }
  }
  return syncFooterFromState;
});
