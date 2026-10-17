define([
  "./config.js",
  "./state/selectors.js"
], function (_config, _selectors) {
  "use strict";

  function createDiv(_id, _className) {
    var node = document.createElement("div");
    if (_id) node.id = _id;
    if (_className) node.className = _className;
    return node;
  }

  function readServerUrl() {
    var loc = document.location;
    if (!loc) return "";
    var parts = String(loc.href || "").split("/");
    if (parts.length < 4) return loc.origin || "";
    return loc.protocol + "//" + loc.host + "/" + parts[3];
  }

  function buildFooterChrome(_KDB) {
    var wrapper = createDiv("KDB_bottomFooterWrapper", "KDB_bottomFooterWrapper " + _KDB.elements.selectors.footer.pageClassNames);
    var emptyLeft = createDiv("KDB_bottomFooter_emptyLeft", null);
    var bar = createDiv("KDB_bottomFooter", "KDB_bottomFooter");
    var leftCol = createDiv("KDB_bottomFooter_leftContainer", "KDB_bottomFooter_column");
    var dashboardTitle = createDiv("KDB_footer_dashboardTitle", null);
    var dataAkt = createDiv("KDB_footer_dataAkt", null);
    leftCol.appendChild(dashboardTitle);
    leftCol.appendChild(dataAkt);
    var centerCol = createDiv("KDB_bottomFooter_centerContainer", "KDB_bottomFooter_column");
    var centerDateUser = createDiv("KDB_footer_centerDateUser", null);
    var centerDex = createDiv(null, null);
    centerDex.textContent = _config.LABELS.dataExcellence;
    centerCol.appendChild(centerDateUser);
    centerCol.appendChild(centerDex);
    var rightCol = createDiv("KDB_bottomFooter_rightContainer", "KDB_bottomFooter_column");
    var rightUrl = createDiv(null, null);
    rightUrl.textContent = readServerUrl();
    var pageIndicator = createDiv("KDB_footer_pageIndicator", null);
    pageIndicator.textContent = "1";
    rightCol.appendChild(rightUrl);
    rightCol.appendChild(pageIndicator);
    bar.appendChild(leftCol);
    bar.appendChild(centerCol);
    bar.appendChild(rightCol);
    var emptyRight = createDiv("KDB_bottomFooter_emptyRight", null);
    wrapper.appendChild(emptyLeft);
    wrapper.appendChild(bar);
    wrapper.appendChild(emptyRight);
    return {
      root: wrapper,
      barEl: bar,
      dashboardTitleEl: dashboardTitle,
      dataAktEl: dataAkt,
      centerDateUserEl: centerDateUser,
      pageIndicatorEl: pageIndicator
    };
  }

  function placeFooter(_mountTarget, _rootEl) {
    if (!_mountTarget || !_rootEl) return;
    _mountTarget.appendChild(_rootEl);
  }

  function setHidden(_node, _hidden) {
    if (!_node) return;
    if (_hidden) {
      _node.setAttribute("hidden", "hidden");
      _node.style.display = "none";
    } else {
      _node.removeAttribute("hidden");
      _node.style.display = "";
    }
  }

  function formatDayMonthYear(_date) {
    return _date.getDate() + "." + (_date.getMonth() + 1) + "." + _date.getFullYear();
  }

  function syncFooterView(_KDB) {
    var state = _KDB && _KDB.state && _KDB.state.footer;
    var domRefs = _KDB && _KDB.runtime && _KDB.runtime.footer && _KDB.runtime.footer.domRefs;
    if (!state || !domRefs || !domRefs.rootEl) return;
    var isActive = state.status === "active";
    setHidden(domRefs.rootEl, !isActive);
    if (!isActive) return;
    var labels = _config.LABELS;
    if (domRefs.dashboardTitleEl) {
      domRefs.dashboardTitleEl.textContent = _selectors.readHeaderTitleText(_KDB);
    }
    if (domRefs.dataAktEl) {
      domRefs.dataAktEl.textContent = labels.updateDatePrefix + String(state.aktualisierungsDatumFormatted || labels.updateDateUnknown);
    }
    if (domRefs.centerDateUserEl) {
      domRefs.centerDateUserEl.textContent = formatDayMonthYear(new Date()) + " (" + String(state.createdUserName || labels.userUnknown) + ")";
    }
    if (domRefs.pageIndicatorEl) {
      var tabIndex = _selectors.readActiveTabIndex(_KDB);
      if (typeof tabIndex === "number") domRefs.pageIndicatorEl.textContent = String(tabIndex + 1);
    }
  }

  function ensureFooterChrome(_KDB) {
    var domRefs = _KDB.runtime.footer.domRefs;
    if (_KDB.state.footer.status !== "active") return;
    if (domRefs.rootEl) {
      if (!domRefs.rootEl.parentNode) placeFooter(domRefs.mountTargetEl, domRefs.rootEl);
      return;
    }
    var built = buildFooterChrome(_KDB);
    domRefs.rootEl = built.root;
    domRefs.barEl = built.barEl;
    domRefs.dashboardTitleEl = built.dashboardTitleEl;
    domRefs.dataAktEl = built.dataAktEl;
    domRefs.centerDateUserEl = built.centerDateUserEl;
    domRefs.pageIndicatorEl = built.pageIndicatorEl;
    placeFooter(domRefs.mountTargetEl, domRefs.rootEl);
  }

  function removeFooterChrome(_KDB) {
    var domRefs = _KDB.runtime.footer.domRefs;
    if (domRefs.rootEl && domRefs.rootEl.parentNode) domRefs.rootEl.parentNode.removeChild(domRefs.rootEl);
    domRefs.rootEl = null;
    domRefs.barEl = null;
    domRefs.dashboardTitleEl = null;
    domRefs.dataAktEl = null;
    domRefs.centerDateUserEl = null;
    domRefs.pageIndicatorEl = null;
  }

  return {
    ensureFooterChrome: ensureFooterChrome,
    removeFooterChrome: removeFooterChrome,
    syncFooterView: syncFooterView
  };
});
