define([
  "../view/applyWidgetLayout.js",
  "./readWidgetsFacet.js"
], function (_applyWidgetLayoutView, _readWidgetsFacet) {
  function applyWidgetLayout(_KDB, _widgetId, _layout) {
    return _applyWidgetLayoutView(_KDB, _widgetId, _layout).then(function (layoutResult) {
      if (!layoutResult || layoutResult.ok !== true) {
        return layoutResult;
      }
      return writeHostLayout(_KDB, _widgetId, _layout).then(function (hostResult) {
        if (hostResult.ok === true) {
          return layoutResult;
        }
        return hostResult;
      });
    });
  }

  function writeHostLayout(_KDB, widgetId, layout) {
    var widgetsFacet = _readWidgetsFacet(_KDB);
    if (!widgetsFacet || typeof widgetsFacet.setWidgetLayout !== "function") {
      return Promise.resolve({ ok: true });
    }
    return Promise.resolve(widgetsFacet.setWidgetLayout(widgetId, {
      left: layout.x + "px",
      top: layout.y + "px",
      width: layout.width + "px",
      height: layout.height + "px"
    })).then(function (outcome) {
      if (outcome && outcome.ok === true) {
        return { ok: true };
      }
      if (isSkippedHost(outcome)) {
        return { ok: true };
      }
      return {
        ok: false,
        layout: layout,
        errorCode: "WIDGET_BASE_COGNOS_LAYOUT_FAILED",
        errorMessage: outcome && outcome.errorCode ? String(outcome.errorCode) : "Cognos layout write failed."
      };
    }).catch(function (err) {
      return {
        ok: false,
        layout: layout,
        errorCode: "WIDGET_BASE_COGNOS_LAYOUT_FAILED",
        errorMessage: String(err && err.message ? err.message : err)
      };
    });
  }

  function isSkippedHost(outcome) {
    if (!outcome) {
      return true;
    }
    if (outcome.ok === true) {
      return false;
    }
    if (outcome.outcome === "aborted") {
      return true;
    }
    return outcome.errorCode === "WIDGETS_HOST_UNAVAILABLE"
      || outcome.errorCode === "WIDGETS_HOST_CAPABILITY_MISSING";
  }

  return applyWidgetLayout;
});
