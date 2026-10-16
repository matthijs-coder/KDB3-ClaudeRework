define(["../config/extAssetPaths", "../config/headerIconKeys"], function (_extAssetPaths, _iconKeys) {
  "use strict";
  function el(tag, cls, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) {
      var k;
      for (k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]);
      }
    }
    return n;
  }
  function buildHeaderChrome(_KDB) {
    var imgBase = _extAssetPaths.resolveKdb3ExtImagesBase(_KDB);
    var wrapper = el("div", "KDB_topHeaderWrapper", { "data-kdb-header-root": "1" });
    var top = el("div", "KDB_topHeader", null);
    top.id = "KDB_topHeader";
    var leftEmpty = el("div", "KDB_topHeader_leftEmptyContainer", null);
    var textCol = el("div", "KDB_topHeader_textContainer", null);
    var title = el("p", "KDB_topHeader_headerText", null);
    title.id = "KDB__topHeader_headerText";
    title.setAttribute("tabindex", "0");
    var sub = el("p", "kdb-header-subtitle-text", null);
    sub.id = "KDB__topHeader_subtitleText";
    sub.setAttribute("tabindex", "0");
    var draftTitle = el("input", "kdb-dashboard-header-draft kdb-dashboard-header-draft-title", {
      type: "text",
      "aria-label": "Title draft",
    });
    var draftSub = el("input", "kdb-dashboard-header-draft kdb-dashboard-header-draft-subtitle", {
      type: "text",
      "aria-label": "Subtitle draft",
    });
    textCol.appendChild(title);
    textCol.appendChild(sub);
    textCol.appendChild(draftTitle);
    textCol.appendChild(draftSub);
    var right = el("div", "KDB_topHeader_right", null);
    var manualWrap = el("div", "KDB_topHeader_userManualIconContainer", { title: "Benutzerhandbuch" });
    var manualA = el("a", null, {
      href: "https://www.intern.magwien.gv.at/web/md-pr/konfigurierbares-personaldashboard",
      target: "_blank",
      rel: "noopener noreferrer",
    });
    var manualImg = el("img", null, {
      id: "KDB_userManual",
      src: imgBase + "benutzerHandbuch.png",
      alt: "Benutzerhandbuch",
    });
    manualA.appendChild(manualImg);
    manualWrap.appendChild(manualA);
    var dsWrap = el("div", "KDB_topHeader_dataSpotIconContainer", { title: "Dataspot" });
    var dsA = el("a", null, {
      href: "https://dxmeta.wien.gv.at/dataspot/web/dxmeta/datasets/0d1344b9-6253-4ca3-ac24-f506db843e58",
      target: "_blank",
      rel: "noopener noreferrer",
    });
    var dsImg = el("img", null, {
      id: "KDB_dataSpotIcon",
      src: imgBase + "dataspot.png",
      alt: "Dataspot",
    });
    dsA.appendChild(dsImg);
    dsWrap.appendChild(dsA);
    var st = _KDB && _KDB.state && _KDB.state.header;
    var iconKey = (st && st.iconKey) || _iconKeys.DEFAULT_ICON_KEY;
    var iconWrap = el("div", "KDB_topHeader_iconContainer", null);
    var headerIcon = el("img", "headerIcon", {
      id: "Stadt-wien",
      alt: "Stadt Wien",
      src: imgBase + iconKey + ".png",
      "data-icon-key": iconKey,
    });
    iconWrap.appendChild(headerIcon);
    /* LTR: handbook → dataspot → Stadt-wien (= RTL: Stadt-wien, dataspot, benutzerHandbuch). */
    right.appendChild(manualWrap);
    right.appendChild(dsWrap);
    right.appendChild(iconWrap);
    top.appendChild(leftEmpty);
    top.appendChild(textCol);
    top.appendChild(right);
    wrapper.appendChild(top);
    return {
      root: wrapper,
      titleEl: title,
      subtitleEl: sub,
      draftTitleEl: draftTitle,
      draftSubtitleEl: draftSub,
      iconEl: headerIcon,
    };
  }
  return buildHeaderChrome;
});
