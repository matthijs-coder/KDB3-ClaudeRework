define([
  "../dom.js",
  "../runtime.js",
  "../selectors.js",
  "../visTypes.js",
  "../legend/sweep.js",
  "../drillthrough/install.js",
  "../focus/focusMode.js",
  "../focus/maximizeIcon.js",
  "./title.js",
  "./visProperties.js",
  "../../../../core/cognosHost/config/widgetChromeSelectors.js"
], function (
  _dom,
  _visRuntime,
  _selectors,
  _visTypes,
  _legendSweep,
  _drillthroughInstall,
  _focusMode,
  _maximizeIcon,
  _title,
  _visProperties,
  _widgetChrome
) {
  "use strict";

  var widget = _widgetChrome.widget.strings;
  var legend = _widgetChrome.legend.strings;
  var TOOLTIP_ATTR = "data-kdb-pipe-parts";
  var SPLIT_PIPE = /\s+\|\s+/;
  var KDB_VISIBLE_CLASS = "KDB_visible";
  var JAHR_COLUMN_ID = "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]";
  var STICHTAG_COLUMN_ID = "[Personal_KDB_TM1].[Stichtag].[Stichtag].[Stichtag]";
  var YEAR_SEGMENT_KEY = "series.year.segmentIndex";
  var PROGNOSE_SEGMENT_KEY = "series.prognose.segmentIndex";

  function hasQueryRoot(_queryRoot) {
    return !!_queryRoot && typeof _queryRoot.querySelectorAll === "function";
  }

  function syncTooltipMetadata(_queryRoot) {
    var diagnostics = { scanned: 0, annotated: 0 };
    if (!hasQueryRoot(_queryRoot)) {
      diagnostics.skipped = "no_query_root";
      return diagnostics;
    }
    var nodes = _queryRoot.querySelectorAll(widget.tooltipNodeSelector);
    var index;
    for (index = 0; index < nodes.length; index += 1) {
      var node = nodes[index];
      if (!node || typeof node.getAttribute !== "function") {
        continue;
      }
      diagnostics.scanned += 1;
      var text = node.textContent || "";
      if (SPLIT_PIPE.test(text)) {
        node.setAttribute(TOOLTIP_ATTR, JSON.stringify(text.split(SPLIT_PIPE)));
        diagnostics.annotated += 1;
      }
    }
    return diagnostics;
  }

  function readPlanVisType(_plan, _settings) {
    return (_plan && _plan.visualization && _plan.visualization.visType) || (_settings && _settings.visType) || null;
  }

  function buildSegmentIndexMap(_plan) {
    var slots = _plan && Array.isArray(_plan.slots) ? _plan.slots : [];
    var seriesSlot = slots.filter(function (_slot) {
      return _slot && _slot.slotName === "series";
    })[0];
    var columnIds = seriesSlot && Array.isArray(seriesSlot.columnIds) ? seriesSlot.columnIds : [];
    var yearIndex = columnIds.indexOf(JAHR_COLUMN_ID);
    var prognoseIndex = columnIds.indexOf(STICHTAG_COLUMN_ID);
    var propertyMap = {};
    if (yearIndex >= 0) {
      propertyMap[YEAR_SEGMENT_KEY] = yearIndex;
    }
    if (prognoseIndex >= 0) {
      propertyMap[PROGNOSE_SEGMENT_KEY] = prognoseIndex;
    }
    return propertyMap;
  }

  async function applyPrognoseSeriesSegmentIndexes(_KDB, _plan, _widgetId, _signal, _settings) {
    var skipped = { ok: true, skipped: true };
    try {
      var isAborted = !!(_signal && _signal.aborted === true);
      if (!_widgetId || isAborted || _visTypes.normalizeVisualizationType(readPlanVisType(_plan, _settings)) !== "Prognose") {
        return skipped;
      }
      var propertyMap = buildSegmentIndexMap(_plan);
      if (!Object.keys(propertyMap).length) {
        return skipped;
      }
      var facet = _visRuntime.readHostFacet(_KDB, "visualizationFacet");
      if (!facet || typeof facet.setContentProperty !== "function") {
        console.error("[widgetVis.applyPrognoseSeriesSegmentIndexes] visualizationFacet missing", _widgetId);
        return skipped;
      }
      var mapResult = await _visProperties.applyPropertyMap(
        facet.setContentProperty.bind(facet), _widgetId, propertyMap, { appliedKeys: [], failed: [] }, "segmentIndex", _signal
      );
      return _signal && _signal.aborted === true ? { ok: true, skipped: true, aborted: true } : mapResult;
    } catch (err) {
      if (err && err.name === "AbortError") {
        return { ok: true, skipped: true, aborted: true };
      }
      console.error("[widgetVis.applyPrognoseSeriesSegmentIndexes] failed", _widgetId, err);
      return skipped;
    }
  }

  function applyPostRenderCleanup(_options) {
    var options = _options || {};
    var widgetId = options.widgetId;
    var runtime = options.runtime || {};
    var input = options.input || {};
    var settings = input.settings || {};
    var diagnostics = { title: null, legend: null, tooltip: null, drillthrough: null, maximize: null, stale: false };
    if (typeof options.isStaleOpSeq === "function" && options.isStaleOpSeq(widgetId, options.opSeq)) {
      diagnostics.stale = true;
      return { ok: false, stale: true, titleText: "", diagnostics: diagnostics };
    }
    var record = _selectors.readVisRecord(options._KDB, widgetId);
    var titleResult = _title.syncVisualizationTitle({
      _KDB: options._KDB,
      widgetId: widgetId,
      metric: input.metric || {},
      settings: settings,
      helperTableResult: input.helperTableResult || null,
      derived: record && record.derived ? record.derived : {},
      runtime: runtime
    });
    diagnostics.title = titleResult.diagnostics || null;
    diagnostics.legend = _legendSweep.sweepLegendCaptions(runtime, widgetId, {
      widgetId: widgetId,
      opSeq: options.opSeq,
      reason: options.plan && options.plan.reason ? options.plan.reason : null,
      mode: input.mode,
      dimension: settings.dimension != null ? settings.dimension : null,
      visType: settings.visType != null ? settings.visType : null,
      runtime: runtime,
      isStaleOpSeq: options.isStaleOpSeq
    });
    try {
      diagnostics.tooltip = syncTooltipMetadata(_dom.resolveQueryRoot(runtime, widgetId));
      diagnostics.drillthrough = _drillthroughInstall.installDrillthrough({ _KDB: options._KDB, widgetId: widgetId });
      diagnostics.maximize = _maximizeIcon.installCanvasMaximize({ _KDB: options._KDB, widgetId: widgetId });
    } catch (err) {
      console.error("[widgetVis.applyPostRenderCleanup] decoration install failed", widgetId, err);
      diagnostics.decorationError = String(err && err.message ? err.message : err);
    }
    // Top-level ok reflects title sync only; legend/tooltip outcomes live in diagnostics.
    return { ok: titleResult.ok !== false, titleText: titleResult.titleText || "", diagnostics: diagnostics };
  }

  function clearTooltipMetadataAttrs(_queryRoot, _diagnostics) {
    if (!hasQueryRoot(_queryRoot)) {
      _diagnostics.tooltip = { skipped: "no_query_root" };
      return;
    }
    var nodes = _queryRoot.querySelectorAll("[" + TOOLTIP_ATTR + "]");
    var removed = 0;
    var index;
    for (index = 0; index < nodes.length; index += 1) {
      if (nodes[index] && typeof nodes[index].removeAttribute === "function") {
        nodes[index].removeAttribute(TOOLTIP_ATTR);
        removed += 1;
      }
    }
    _diagnostics.tooltip = { removed: removed };
  }

  function clearLegendDecorations(_queryRoot, _diagnostics) {
    if (!hasQueryRoot(_queryRoot)) {
      _diagnostics.legend = { skipped: "no_query_root" };
      return;
    }
    var titles = _queryRoot.querySelectorAll(legend.titleSelector);
    var reverted = 0;
    var index;
    for (index = 0; index < titles.length; index += 1) {
      var titleNode = titles[index];
      if (titleNode && titleNode.classList && titleNode.classList.contains(KDB_VISIBLE_CLASS)) {
        titleNode.classList.remove(KDB_VISIBLE_CLASS);
        reverted += 1;
      }
    }
    _diagnostics.legend = { kdbVisibleReverted: reverted };
  }

  function clearTitleLinkDecorations(_runtime, _widgetId, _diagnostics) {
    var titleLinkEl = _runtime && _runtime.domRefs ? _runtime.domRefs.titleLinkEl : null;
    var shell = _dom.resolveWidgetShell(_widgetId);
    var titleEl = shell ? shell.querySelector(widget.vizTitleSelector) : null;
    var spanEl = shell ? shell.querySelector(widget.vizTitleSpanSelector) : null;
    var parent = spanEl ? spanEl.parentElement : null;
    var anchor = parent && parent.tagName === "A" && parent.classList && parent.classList.contains("kdb_hyperlink") ? parent : null;
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
  }

  function resetCleanupRuntimeFields(_runtime, _diagnostics) {
    _runtime.lastSuccessfulPlan = null;
    _runtime.lastAppliedVisPropertiesType = null;
    if (_runtime.domRefs) {
      _runtime.domRefs.contentEl = null;
      _runtime.domRefs.headerEl = null;
      _runtime.domRefs.titleLinkEl = null;
    }
    _diagnostics.runtimeReset = { lastSuccessfulPlan: true, lastAppliedVisPropertiesType: true, domRefsCleared: true };
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
      var runtime = options.runtime || _visRuntime.ensureWidgetRuntime(_KDB, widgetId);
      _focusMode.exitNativeFocus(_KDB, widgetId, diagnostics);
      diagnostics.focusMode = _focusMode.disposeFocusMode(_KDB, widgetId, runtime).diagnostics || {};
      diagnostics.legendObserver = _legendSweep.disconnectLegendTextObserver(runtime);
      _maximizeIcon.cleanupCanvasMaximize(runtime, diagnostics);
      if (payload.clearDrillthrough === true) {
        _drillthroughInstall.cleanupDrillthroughDecorations(runtime, diagnostics);
      }
      if (payload.clearDomDecorations === true) {
        var queryRoot = _dom.resolveQueryRoot(runtime, widgetId);
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

  return {
    applyPostRenderCleanup: applyPostRenderCleanup,
    applyPrognoseSeriesSegmentIndexes: applyPrognoseSeriesSegmentIndexes,
    cleanupVisualizationContent: cleanupVisualizationContent
  };
});
