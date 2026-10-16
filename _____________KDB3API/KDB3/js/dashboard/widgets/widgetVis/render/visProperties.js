define([
  "../visTypes.js",
  "../runtime.js",
  "./displayOptions.js"
], function (_visTypes, _visRuntime, _displayOptions) {
  "use strict";

  var APPLY_ON_REASON = {
    startup: true,
    visType: true,
    showValues: true,
    iterator: true,
    zoom: true,
    valueCaption: true,
    contentCreate: true
  };

  function isAbortedOutcome(_outcome) {
    return !!(
      _outcome && (
        _outcome.outcome === "aborted" ||
        _outcome.aborted === true ||
        _outcome.reason === "aborted" ||
        _outcome.reason === "aborted-after-effect" ||
        _outcome.reason === "disposed"
      )
    );
  }

  function readErrorMessage(_err) {
    return String(_err && _err.message ? _err.message : _err);
  }

  function shouldApplyVisualizationProperties(_input, _runtime, _normalizedVisType, _options) {
    var options = _options || {};
    if (options.force === true || options.phase === "postRender") {
      return true;
    }
    if (_input && _input.mode === "cleanup") {
      return false;
    }
    if (APPLY_ON_REASON[_input && _input.reason] === true) {
      return true;
    }
    var lastApplied = _runtime && _runtime.lastAppliedVisPropertiesType;
    return lastApplied !== _normalizedVisType;
  }

  async function applyPropertyMap(_setContentProperty, _widgetId, _propertyMap, _diagnostics, _groupName, _signal) {
    var keys = Object.keys(_propertyMap || {});
    var applied = [];
    var failed = [];
    var index;
    for (index = 0; index < keys.length; index += 1) {
      var key = keys[index];
      try {
        var outcome = await Promise.resolve(_setContentProperty(_widgetId, key, _propertyMap[key], { signal: _signal }));
        if (isAbortedOutcome(outcome)) {
          return { ok: false, aborted: true };
        }
        if (outcome && outcome.ok === true) {
          applied.push(key);
        } else {
          failed.push({
            group: _groupName,
            key: key,
            errorMessage: outcome && outcome.errorCode ? String(outcome.errorCode) : "setContentProperty failed"
          });
        }
      } catch (err) {
        failed.push({ group: _groupName, key: key, errorMessage: readErrorMessage(err) });
      }
    }
    if (applied.length) {
      _diagnostics.appliedKeys = (_diagnostics.appliedKeys || []).concat(applied.map(function (_appliedKey) {
        return _groupName + ":" + _appliedKey;
      }));
    }
    if (failed.length) {
      _diagnostics.failed = (_diagnostics.failed || []).concat(failed);
    }
    return { ok: failed.length === 0, aborted: false };
  }

  function addBlocker(_diagnostics, _blocker) {
    _diagnostics.blockers = (_diagnostics.blockers || []).concat([_blocker]);
  }

  async function ensureVisType(_facet, _widgetId, _desiredVisType, _diagnostics, _signal) {
    var readOutcome = await Promise.resolve(_facet.getVisType(_widgetId));
    if (isAbortedOutcome(readOutcome)) {
      return { ok: false, aborted: true };
    }
    if (!readOutcome || readOutcome.ok !== true) {
      addBlocker(_diagnostics, "visualization.getVisType");
      return { ok: false, aborted: false };
    }
    _diagnostics.currentVisType = readOutcome.data != null ? readOutcome.data : null;
    _diagnostics.desiredVisType = _desiredVisType;
    if (readOutcome.data === _desiredVisType) {
      _diagnostics.visTypeWriteNeeded = false;
      return { ok: true, aborted: false };
    }
    if (typeof _facet.setVisType !== "function") {
      addBlocker(_diagnostics, "visualization.setVisType");
      return { ok: false, aborted: false };
    }
    _diagnostics.visTypeWriteNeeded = true;
    var writeOutcome = await Promise.resolve(_facet.setVisType(_widgetId, _desiredVisType, { signal: _signal }));
    if (isAbortedOutcome(writeOutcome)) {
      return { ok: false, aborted: true };
    }
    if (!writeOutcome || writeOutcome.ok !== true) {
      addBlocker(_diagnostics, "visualization.setVisType");
      return { ok: false, aborted: false };
    }
    return { ok: true, aborted: false };
  }

  function resolveBlockedResult(_facet, _diagnostics) {
    if (!_facet) {
      _diagnostics.blockers.push("cognosHost.visualization");
    } else if (typeof _facet.setContentProperty !== "function") {
      _diagnostics.blockers.push("visualization.setContentProperty");
    } else {
      return null;
    }
    return { ok: false, skipped: false, diagnostics: _diagnostics };
  }

  function buildPropertyMaps(_KDB, _options, _normalizedVisType, _input) {
    var propertyValues = _visTypes.resolveVisualizationPropertyValues(_options.visualizationType, _KDB);
    if (_options.phase === "postRender" || _options.omitTitleMode === true) {
      // titleMode only pre-binding on visible vis; post-render rewrite
      // reopened Cognos title edit (2026-07-13). Helpers must omit it too:
      // customTitle opens note-editable and kills metrics-tree HTML5 drag.
      propertyValues = Object.assign({}, propertyValues);
      delete propertyValues.titleMode;
    }
    var layoutPropertyValues = _visTypes.resolveVisualizationLayoutPropertyValues(_options.visualizationType, _KDB);
    layoutPropertyValues = _displayOptions.overlayShowValuesOnLayoutMap(layoutPropertyValues, _input.settings, _normalizedVisType);
    layoutPropertyValues = _displayOptions.overlayIteratorZoomOnLayoutMap(_KDB, _options.widgetId, layoutPropertyValues, _normalizedVisType);
    return { propertyValues: propertyValues, layoutPropertyValues: layoutPropertyValues };
  }

  async function applyPropertyMaps(_facet, _KDB, _options, _maps, _diagnostics) {
    var widgetId = _options.widgetId;
    var signal = _options.signal;
    var visTypeReady = await ensureVisType(
      _facet, widgetId, _visTypes.resolveCognosVisualizationTypeId(_options.visualizationType, _KDB), _diagnostics, signal
    );
    if (visTypeReady.aborted === true) {
      return { ok: false, aborted: true, diagnostics: _diagnostics };
    }
    if (visTypeReady.ok !== true) {
      return { ok: false, diagnostics: _diagnostics };
    }
    if (signal && signal.aborted) {
      return { ok: false, aborted: true, diagnostics: _diagnostics };
    }
    var setContentProperty = _facet.setContentProperty.bind(_facet);
    var propertyResult = await applyPropertyMap(setContentProperty, widgetId, _maps.propertyValues, _diagnostics, "propertyValues", signal);
    if (propertyResult.aborted === true) {
      return { ok: false, aborted: true, diagnostics: _diagnostics };
    }
    var layoutResult = await applyPropertyMap(setContentProperty, widgetId, _maps.layoutPropertyValues, _diagnostics, "layoutPropertyValues", signal);
    if (layoutResult.aborted === true) {
      return { ok: false, aborted: true, diagnostics: _diagnostics };
    }
    return { ok: propertyResult.ok && layoutResult.ok, skipped: false, diagnostics: _diagnostics };
  }

  async function applyVisualizationProperties(_KDB, _options) {
    var options = _options || {};
    var widgetId = options.widgetId;
    var runtime = options.runtime || {};
    var input = options.input || {};
    var normalizedVisType = _visTypes.normalizeVisualizationType(options.visualizationType) || options.visualizationType;
    var phase = options.phase || "preBinding";
    var facet = _visRuntime.readHostFacet(_KDB, "visualizationFacet");
    var diagnostics = {
      phase: phase,
      skipped: false,
      reason: input.reason || null,
      normalizedVisType: normalizedVisType,
      appliedKeys: [],
      failed: [],
      blockers: []
    };
    if (!widgetId) {
      diagnostics.blockers.push("widgetId");
      return { ok: false, skipped: true, diagnostics: diagnostics };
    }
    if (!shouldApplyVisualizationProperties(input, runtime, normalizedVisType, options)) {
      diagnostics.skipped = true;
      diagnostics.skipReason = "visTypeUnchanged";
      return { ok: true, skipped: true, diagnostics: diagnostics };
    }
    var blocked = resolveBlockedResult(facet, diagnostics);
    if (blocked) {
      return blocked;
    }
    var maps = buildPropertyMaps(_KDB, options, normalizedVisType, input);
    if (options.signal && options.signal.aborted) {
      return { ok: false, aborted: true, diagnostics: diagnostics };
    }
    try {
      var result = await applyPropertyMaps(facet, _KDB, options, maps, diagnostics);
      if (result.ok === true) {
        runtime.lastAppliedVisPropertiesType = normalizedVisType;
      }
      return result;
    } catch (err) {
      console.error("[widgetVis.applyVisualizationProperties] failed", widgetId, err);
      diagnostics.failed.push({ group: "ensureVisType", key: null, errorMessage: readErrorMessage(err) });
      return { ok: false, diagnostics: diagnostics };
    }
  }

  return {
    applyVisualizationProperties: applyVisualizationProperties,
    applyPropertyMap: applyPropertyMap,
    isAbortedOutcome: isAbortedOutcome,
    shouldApplyVisualizationProperties: shouldApplyVisualizationProperties
  };
});
