define([
  "./readCanvasFacet.js",
  "../../../../core/utils/convertUnitToPx.js"
], function (_readCanvasFacet, _convertUnitToPx) {
  "use strict";

  const PAGE_SELECTOR = ".dashboardFrame .page.pagegenericPage";
  const SURROUND_SELECTOR = ".ba-common-container.ba-common-tabList__innerContainer";
  const FOOTER_ID = "KDB_bottomFooterWrapper";
  const HEX_RGB_PATTERN = /^#[0-9A-Fa-f]{6}$/;

  function isFooterPage(_node) {
    if (!_node) {
      return true;
    }
    if (_node.id === FOOTER_ID) {
      return true;
    }
    return typeof _node.closest === "function" && _node.closest("#" + FOOTER_ID) !== null;
  }

  function hexToRGBA(_hex) {
    const r = parseInt(_hex.slice(1, 3), 16);
    const g = parseInt(_hex.slice(3, 5), 16);
    const b = parseInt(_hex.slice(5, 7), 16);
    return "rgba(" + r + "," + g + "," + b + ",0.75)";
  }

  function applyPageBackground(_KDB, _value) {
    try {
      if (typeof document === "undefined" || typeof document.querySelectorAll !== "function") {
        return;
      }
      const nodes = document.querySelectorAll(PAGE_SELECTOR);
      const isEmpty = typeof _value !== "string" || _value.trim() === "";
      let index;
      let node;
      for (index = 0; index < nodes.length; index += 1) {
        node = nodes[index];
        if (isFooterPage(node)) {
          continue;
        }
        if (isEmpty) {
          node.style.removeProperty("background-color");
        } else {
          node.style.backgroundColor = _value;
        }
      }
      const surround = document.querySelector(SURROUND_SELECTOR);
      if (surround) {
        const trimmed = typeof _value === "string" ? _value.trim() : "";
        if (HEX_RGB_PATTERN.test(trimmed)) {
          surround.style.backgroundColor = hexToRGBA(trimmed);
        } else {
          surround.style.removeProperty("background-color");
        }
      }
    } catch (err) {
      console.error("[pageSurface.applyPageBackground] failed", err);
    }
  }

  function warnMissingFacet(_KDB) {
    const runtime = _KDB && _KDB.runtime ? _KDB.runtime.pageSurface : null;
    if (runtime && runtime.didWarnMissingCanvasFacet === true) {
      return;
    }
    if (runtime) {
      runtime.didWarnMissingCanvasFacet = true;
    }
    console.warn("[pageSurface.applyPageSize] canvasFacet.setCanvasPageSize unavailable");
  }

  function applyPageSize(_KDB, _axis, _value) {
    try {
      const px = _convertUnitToPx(_value);
      if (px === null) {
        return;
      }
      const cssPx = String(px) + "px";
      const facet = _readCanvasFacet(_KDB);
      if (!facet || typeof facet.setCanvasPageSize !== "function") {
        warnMissingFacet(_KDB);
        return;
      }
      const outcome = facet.setCanvasPageSize(_axis, cssPx);
      if (!outcome || outcome.ok !== true) {
        console.error("[pageSurface.applyPageSize] setCanvasPageSize failed", outcome);
      }
    } catch (err) {
      console.error("[pageSurface.applyPageSize] failed", err);
    }
  }

  function applyDashboardSettings(_KDB, _dashboard) {
    try {
      const dashboard = _dashboard || {};
      applyPageSize(_KDB, "width", dashboard.width);
      applyPageSize(_KDB, "height", dashboard.height);
      applyPageBackground(_KDB, dashboard.backgroundColor);
    } catch (err) {
      console.error("[pageSurface.applyDashboardSettings] failed", err);
    }
  }

  return {
    applyPageBackground: applyPageBackground,
    applyPageSize: applyPageSize,
    applyDashboardSettings: applyDashboardSettings
  };
});
