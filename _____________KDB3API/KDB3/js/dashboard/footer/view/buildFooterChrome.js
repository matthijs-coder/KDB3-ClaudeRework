define(["../../../core/cognosHost/config/rootChromeSelectors.js"], function (_rootChrome) {
  "use strict";
  function div(id, className) {
    var n = document.createElement("div");
    if (id) n.id = id;
    if (className) n.className = className;
    return n;
  }
  function resolveFooterServerUrl() {
    try {
      var loc = typeof document !== "undefined" ? document.location : null;
      if (!loc) return "";
      var href = String(loc.href || "");
      var parts = href.split("/");
      if (parts.length < 4) return loc.origin || "";
      return loc.protocol + "//" + loc.host + "/" + parts[3];
    } catch (err) {
      console.error("[footer.resolveFooterServerUrl]", err);
      return "";
    }
  }
  function buildFooterChrome() {
    var wrapper = div("KDB_bottomFooterWrapper", "KDB_bottomFooterWrapper " + _rootChrome.footer.strings.pageClassNames);
    var emptyLeft = div("KDB_bottomFooter_emptyLeft", null);
    var bar = div("KDB_bottomFooter", "KDB_bottomFooter");
    var leftCol = div("KDB_bottomFooter_leftContainer", "KDB_bottomFooter_column");
    var dashboardTitle = div("KDB_footer_dashboardTitle", null);
    var dataAkt = div("KDB_footer_dataAkt", null);
    leftCol.appendChild(dashboardTitle);
    leftCol.appendChild(dataAkt);
    var centerCol = div("KDB_bottomFooter_centerContainer", "KDB_bottomFooter_column");
    var centerDateUser = div("KDB_footer_centerDateUser", null);
    var centerDex = div(null, null);
    centerDex.textContent = "Data Excellence Conform";
    centerCol.appendChild(centerDateUser);
    centerCol.appendChild(centerDex);
    var rightCol = div("KDB_bottomFooter_rightContainer", "KDB_bottomFooter_column");
    var rightUrl = div(null, null);
    rightUrl.textContent = resolveFooterServerUrl();
    var pageInd = div("KDB_footer_pageIndicator", null);
    pageInd.textContent = "1";
    rightCol.appendChild(rightUrl);
    rightCol.appendChild(pageInd);
    bar.appendChild(leftCol);
    bar.appendChild(centerCol);
    bar.appendChild(rightCol);
    var emptyRight = div("KDB_bottomFooter_emptyRight", null);
    wrapper.appendChild(emptyLeft);
    wrapper.appendChild(bar);
    wrapper.appendChild(emptyRight);
    return {
      root: wrapper,
      barEl: bar,
      dashboardTitleEl: dashboardTitle,
      dataAktEl: dataAkt,
      centerDateUserEl: centerDateUser,
      pageIndicatorEl: pageInd,
    };
  }
  return buildFooterChrome;
});
