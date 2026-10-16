define(["../dom.js", "./sanitize.js", "./observer.js"], function (_dom, _sanitize, _observer) {
  "use strict";

  function readErrorMessage(_err) {
    return String(_err && _err.message ? _err.message : _err);
  }

  function resolveLegendRoot(_runtime, _widgetId) {
    var resolved = _dom.resolveVisualizationContent(_widgetId);
    var contentEl = resolved && resolved.contentEl ? resolved.contentEl : null;
    if (!contentEl) {
      return { queryRoot: null, skipReason: "no_query_root", isShell: false };
    }
    var isShell = !_dom.isVisualizationContentRoot(contentEl);
    if (_runtime && !isShell) {
      var domRefs = _runtime.domRefs || (_runtime.domRefs = {});
      Object.assign(domRefs, {
        contentEl: contentEl,
        headerEl: resolved.headerEl != null ? resolved.headerEl : domRefs.headerEl,
        titleLinkEl: resolved.titleLinkEl != null ? resolved.titleLinkEl : domRefs.titleLinkEl
      });
    }
    return { queryRoot: contentEl, skipReason: null, isShell: isShell };
  }

  function sanitizeLegendAndInstallObserver(_queryRoot, _context) {
    var diagnostics = _sanitize.runLegendSanitizers(_queryRoot, _context, { fromObserver: false });
    if (_context.runtime) {
      diagnostics.observer = _observer.installLegendTextObserver(_queryRoot, _context);
    }
    return diagnostics;
  }

  function sweepLegendCaptions(_runtime, _widgetId, _context) {
    try {
      var legendRoot = resolveLegendRoot(_runtime, _widgetId);
      if (!legendRoot.queryRoot) {
        var skipReason = legendRoot.skipReason || "no_query_root";
        return { skipped: skipReason, observer: { action: "skipped", reason: skipReason } };
      }
      var context = Object.assign({}, _context || {}, { isShell: legendRoot.isShell === true });
      return sanitizeLegendAndInstallObserver(legendRoot.queryRoot, context);
    } catch (err) {
      console.error("[widgetVis.sweepLegendCaptions] failed", _widgetId, err);
      return { error: readErrorMessage(err) };
    }
  }

  function installLegendObserverBeforeApply(_runtime, _widgetId, _options) {
    var options = _options || {};
    try {
      var legendRoot = resolveLegendRoot(_runtime, _widgetId);
      if (!legendRoot.queryRoot) {
        return { action: "skipped", reason: legendRoot.skipReason || "no_query_root" };
      }
      return _observer.installLegendTextObserver(legendRoot.queryRoot, {
        widgetId: _widgetId,
        opSeq: options.opSeq,
        reason: "preApplyBinding",
        mode: options.mode,
        dimension: options.dimension != null ? options.dimension : null,
        visType: options.visType != null ? options.visType : null,
        runtime: _runtime,
        isStaleOpSeq: options.isStaleOpSeq,
        skipReason: legendRoot.skipReason,
        isShell: legendRoot.isShell === true
      });
    } catch (err) {
      console.error("[widgetVis.installLegendObserverBeforeApply] failed", _widgetId, err);
      return { action: "failed", error: readErrorMessage(err) };
    }
  }

  return {
    sweepLegendCaptions: sweepLegendCaptions,
    installLegendObserverBeforeApply: installLegendObserverBeforeApply,
    disconnectLegendTextObserver: _observer.disconnectLegendTextObserver
  };
});
