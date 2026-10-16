define(["../../../core/utils/convertUnitToPx.js"], function (_convertUnitToPx) {
  "use strict";

  const AXES = ["width", "height", "background"];
  const PAGE_SELECTOR = ".dashboardFrame .page.pagegenericPage";
  const SURROUND_SELECTOR = ".ba-common-container.ba-common-tabList__innerContainer";
  const FOOTER_ID = "KDB_bottomFooterWrapper";
  const HEX_RGB_PATTERN = /^#[0-9A-Fa-f]{6}$/;
  const SURROUND_ALPHA = 0.75;

  // Applies one dashboard axis ("width" | "height" | "background"). Boundary per axis: one failing axis
  // must not stop the others when pending values are flushed.
  function applyAxis(_KDB, rt, axis, value) {
    try {
      if (axis === "background") {
        applyPageBackground(value);
      } else {
        applyPageSize(rt, axis, value);
      }
    } catch (err) {
      console.error("[pageSurface.applyAxis] " + axis + " failed", err);
    }
  }

  function applyPageBackground(value) {
    const nodes = document.querySelectorAll(PAGE_SELECTOR);
    const isEmpty = typeof value !== "string" || value.trim() === "";
    const surroundEl = document.querySelector(SURROUND_SELECTOR);

    Array.prototype.forEach.call(nodes, function (node) {
      if (isFooterPage(node)) {
        return;
      }
      if (isEmpty) {
        node.style.removeProperty("background-color");
      } else {
        node.style.backgroundColor = value;
      }
    });
    if (surroundEl) {
      applySurroundBackground(surroundEl, typeof value === "string" ? value.trim() : "");
    }
  }

  function applySurroundBackground(surroundEl, hexValue) {
    if (HEX_RGB_PATTERN.test(hexValue)) {
      surroundEl.style.backgroundColor = hexToRgba(hexValue, SURROUND_ALPHA);
    } else {
      surroundEl.style.removeProperty("background-color");
    }
  }

  function isFooterPage(node) {
    return !node || node.id === FOOTER_ID || (typeof node.closest === "function" && node.closest("#" + FOOTER_ID) !== null);
  }

  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  }

  function applyPageSize(rt, axis, value) {
    const px = _convertUnitToPx(value);
    const facet = rt.canvasFacet;
    let outcome;

    if (px === null) {
      return;
    }
    if (!facet || typeof facet.setCanvasPageSize !== "function") {
      warnMissingFacet(rt);
      return;
    }
    outcome = facet.setCanvasPageSize(axis, String(px) + "px");
    if (!outcome || outcome.ok !== true) {
      console.error("[pageSurface.applyPageSize] setCanvasPageSize failed", outcome);
    }
  }

  function warnMissingFacet(rt) {
    if (rt.didWarnMissingCanvasFacet !== true) {
      rt.didWarnMissingCanvasFacet = true;
      console.warn("[pageSurface.applyPageSize] canvasFacet.setCanvasPageSize unavailable");
    }
  }

  function writePending(rt, axis, value) {
    rt.pending[axis] = value;
  }

  // Applies the values queued before the canvas was ready, then the current kdbControl settings for every
  // axis that had no queued value. Pending is cleared.
  function flushPendingAndSettings(_KDB, rt) {
    const pending = rt.pending;
    const flushedAxes = AXES.filter(function (axis) {
      return Object.prototype.hasOwnProperty.call(pending, axis);
    });

    flushedAxes.forEach(function (axis) {
      applyAxis(_KDB, rt, axis, pending[axis]);
    });
    rt.pending = {};
    applySettingsForAxes(_KDB, rt, AXES.filter(function (axis) {
      return flushedAxes.indexOf(axis) === -1;
    }));
  }

  function applySettingsForAxes(_KDB, rt, axes) {
    const api = _KDB.api && _KDB.api.kdbControl;
    const snapshot = api && typeof api.getState === "function" ? api.getState() : null;
    const dashboard = snapshot && snapshot.settings && snapshot.settings.dashboard;

    if (!dashboard) {
      return;
    }
    axes.forEach(function (axis) {
      applyAxis(_KDB, rt, axis, axis === "background" ? dashboard.backgroundColor : dashboard[axis]);
    });
  }

  return {
    applyAxis: applyAxis,
    flushPendingAndSettings: flushPendingAndSettings,
    writePending: writePending
  };
});
