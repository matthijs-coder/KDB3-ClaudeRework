define([
  "../view/resolveQueryRoot.js",
  "../view/syncLegendVisibility.js",
  "../runtime/ensureWidgetRuntime.js",
  "./widgetFocusMode.js",
  "./cleanupDrillthroughDecorations.js",
  "./cleanupCanvasMaximize.js",
  "../../../../core/cognosHost/config/widgetChromeSelectors.js"
], function (_resolveQueryRoot, _syncLegendVisibility, _ensureWidgetRuntime, _widgetFocusMode, _clearDrillthroughDecorations, _cleanupCanvasMaximize, _widgetChrome) {
  "use strict";
  var TOOLTIP_ATTR = "data-kdb-pipe-parts";
  var widget = _widgetChrome.widget.strings;
  var legend = _widgetChrome.legend.strings;
  var KDB_VISIBLE_CLASS = "KDB_visible";

  function clearTooltipMetadataAttrs(_queryRoot, _diagnostics) {
    if (!_queryRoot || typeof _queryRoot.querySelectorAll !== "function") {
      _diagnostics.tooltip = { skipped: "no_query_root" };
      return;
    }
    var removed = 0;
    var nodes = _queryRoot.querySelectorAll("[" + TOOLTIP_ATTR + "]");
    for (var i = 0; i < nodes.length; i += 1) {
      if (nodes[i] && typeof nodes[i].removeAttribute === "function") {
        nodes[i].removeAttribute(TOOLTIP_ATTR);
        removed += 1;
      }
    }
    _diagnostics.tooltip = { removed: removed };
  }

  function clearLegendDecorations(_queryRoot, _diagnostics) {
    if (!_queryRoot || typeof _queryRoot.querySelectorAll !== "function") {
      _diagnostics.legend = { skipped: "no_query_root" };
      return;
    }
    var titles = _queryRoot.querySelectorAll(legend.titleSelector);
    var reverted = 0;
    for (var i = 0; i < titles.length; i += 1) {
      var titleNode = titles[i];
      if (titleNode && titleNode.classList && titleNode.classList.contains(KDB_VISIBLE_CLASS)) {
        titleNode.classList.remove(KDB_VISIBLE_CLASS);
        reverted += 1;
      }
    }
    _diagnostics.legend = { kdbVisibleReverted: reverted };
  }

  function resolveShell(_widgetId) {
    var id = String(_widgetId);
    return document.getElementById(id) || document.querySelector('[data-kdb-widget-id="' + id + '"]');
  }

  function clearTitleLinkDecorations(_runtime, _widgetId, _diagnostics) {
    var titleLinkEl = _runtime && _runtime.domRefs ? _runtime.domRefs.titleLinkEl : null;
    var shell = resolveShell(_widgetId);
    var titleEl = shell ? shell.querySelector(widget.vizTitleSelector) : null;
    var spanEl = shell ? shell.querySelector(widget.vizTitleSpanSelector) : null;
    var anchor = spanEl && spanEl.parentElement && spanEl.parentElement.tagName === "A"
      && spanEl.parentElement.classList && spanEl.parentElement.classList.contains("kdb_hyperlink")
      ? spanEl.parentElement
      : null;
    try {
      if (titleLinkEl) {
        titleLinkEl.textContent = "";
      }
      if (anchor && anchor.parentNode) {
        anchor.parentNode.insertBefore(spanEl, anchor);
        anchor.parentNode.removeChild(anchor);
      }
      if (titleEl) {
        titleEl.removeAttribute("title");
      }
      _diagnostics.titleLink = { cleared: !!titleLinkEl, unwrapped: !!anchor, titleAttrRemoved: !!titleEl };
    } catch (err) {
      console.error("[widgetVis.cleanupVisualizationContent] title link clear failed", err);
      _diagnostics.titleLink = { error: String(err && err.message ? err.message : err) };
    }
  }
  function cleanupFocusModeArtifacts(_KDB, widgetId, runtime, diagnostics) {
    _widgetFocusMode.exitNativeFocus(_KDB, widgetId, diagnostics);
    diagnostics.focusMode = _widgetFocusMode.disposeFocusMode(_KDB, widgetId, runtime).diagnostics || {};
  }
  function resetCleanupRuntimeFields(_runtime, _diagnostics) {
    _runtime.lastSuccessfulPlan = null;
    _runtime.lastAppliedVisPropertiesType = null;
    if (_runtime.domRefs) {
      _runtime.domRefs.contentEl = null;
      _runtime.domRefs.headerEl = null;
      _runtime.domRefs.titleLinkEl = null;
    }
    _diagnostics.runtimeReset = {
      lastSuccessfulPlan: true,
      lastAppliedVisPropertiesType: true,
      domRefsCleared: true
    };
  }
  function cleanupVisualizationContent(_KDB, _options) {
    var options = _options || {};
    var widgetId = options.widgetId;
    var opSeq = options.opSeq;
    var payload = options.payload || {};
    var diagnostics = {
      widgetId: widgetId,
      opSeq: opSeq,
      clearDrillthrough: payload.clearDrillthrough === true,
      clearDomDecorations: payload.clearDomDecorations === true
    };
    if (typeof options.isStaleOpSeq === "function" && options.isStaleOpSeq(widgetId, opSeq)) {
      return { ok: false, stale: true, widgetId: widgetId, opSeq: opSeq, diagnostics: diagnostics };
    }
    try {
      var runtime = options.runtime || _ensureWidgetRuntime(_KDB, widgetId);
      cleanupFocusModeArtifacts(_KDB, widgetId, runtime, diagnostics);
      diagnostics.legendObserver = _syncLegendVisibility.disconnectLegendTextObserver(runtime);
      _cleanupCanvasMaximize(runtime, diagnostics);
      if (payload.clearDrillthrough === true) {
        _clearDrillthroughDecorations(runtime, diagnostics);
      }
      if (payload.clearDomDecorations === true) {
        var queryRoot = _resolveQueryRoot(runtime, widgetId);
        clearTitleLinkDecorations(runtime, widgetId, diagnostics);
        clearLegendDecorations(queryRoot, diagnostics);
        clearTooltipMetadataAttrs(queryRoot, diagnostics);
      }
      resetCleanupRuntimeFields(runtime, diagnostics);
      return { ok: true, widgetId: widgetId, opSeq: opSeq, diagnostics: diagnostics };
    } catch (err) {
      console.error("[widgetVis.cleanupVisualizationContent] failed", widgetId, err);
      return {
        ok: false,
        widgetId: widgetId,
        opSeq: opSeq,
        errorCode: "WIDGET_VIS_CLEANUP_FAILED",
        errorMessage: String(err && err.message ? err.message : err),
        diagnostics: diagnostics
      };
    }
  }
  return cleanupVisualizationContent;
});
