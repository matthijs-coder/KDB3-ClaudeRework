define([
  "../config.js",
  "../runtime.js"
], function (_config, _visRuntime) {
  "use strict";

  // Waiters live in runtime.pendingPromises[bucketKey].waiters; rejection values are plain objects
  // ({timedOut|cancelled|destroyed: true, kind?}) that resolveBindingPrerequisites decodes.
  function createGateWaiters(_bucketKey) {
    function readBucket(_KDB) {
      var pending = _visRuntime.initializeRuntime(_KDB).pendingPromises;
      if (!pending[_bucketKey]) {
        pending[_bucketKey] = { waiters: [] };
      }
      return pending[_bucketKey];
    }

    function wait(_KDB, _options) {
      var options = _options || {};
      var bucket = readBucket(_KDB);
      return new Promise(function (resolve, reject) {
        var entry = { widgetId: options.widgetId, opSeq: options.opSeq, resolve: resolve, reject: reject };
        entry.timerId = setTimeout(function () {
          bucket.waiters = bucket.waiters.filter(function (_waiter) { return _waiter !== entry; });
          reject(options.timeoutReason);
        }, options.timeoutMs);
        // A replaced waiter is dropped without being settled; its own timer still rejects it later.
        if (options.replaceSameWidget === true) {
          bucket.waiters = bucket.waiters.filter(function (_waiter) { return _waiter.widgetId !== options.widgetId; });
        }
        bucket.waiters.push(entry);
      });
    }

    function takeWhere(_KDB, _match) {
      var bucket = readBucket(_KDB);
      var taken = bucket.waiters.filter(_match);
      bucket.waiters = bucket.waiters.filter(function (_waiter) { return taken.indexOf(_waiter) === -1; });
      taken.forEach(function (_waiter) { clearTimeout(_waiter.timerId); });
      return taken;
    }

    function resolveWhere(_KDB, _match, _value) {
      return takeWhere(_KDB, _match).map(function (_waiter) {
        _waiter.resolve(_value);
        return _waiter.widgetId;
      });
    }

    function rejectWhere(_KDB, _match, _reason) {
      var taken = takeWhere(_KDB, _match);
      taken.forEach(function (_waiter) { _waiter.reject(_reason); });
      return taken.length;
    }

    return { wait: wait, resolveWhere: resolveWhere, rejectWhere: rejectWhere };
  }

  var dienststelleWaiters = createGateWaiters("dienststelleGate");
  var topNWaiters = createGateWaiters("topNGate");

  function matchWidget(_widgetId) {
    return function (_waiter) { return _waiter.widgetId === _widgetId; };
  }

  function matchAny() {
    return true;
  }

  function cancelGateWaitersForWidget(_KDB, _widgetId) {
    if (!_KDB.runtime || !_KDB.runtime.widgetVis) {
      return { dienststelleCancelled: 0, topNCancelled: false };
    }
    return {
      dienststelleCancelled: dienststelleWaiters.rejectWhere(_KDB, matchWidget(_widgetId), { cancelled: true }),
      topNCancelled: topNWaiters.rejectWhere(_KDB, matchWidget(_widgetId), { cancelled: true }) > 0
    };
  }

  function rejectAllGateWaiters(_KDB) {
    dienststelleWaiters.rejectWhere(_KDB, matchAny, { destroyed: true });
    topNWaiters.rejectWhere(_KDB, matchAny, { destroyed: true, kind: "topN" });
  }

  function isConfirmedHierarchy(_snapshot) {
    var resolution = (_snapshot || {}).resolution || {};
    if (resolution.hasConfirmedSelection !== true) {
      return false;
    }
    return (resolution.downstreamValues || []).length > 0 || (resolution.dominantValues || []).length > 0;
  }

  function resolveDienststelleGateWaiters(_KDB, _snapshot) {
    var normalized = normalizeHierarchySnapshot({ hierarchySnapshot: _snapshot });
    if (!isConfirmedHierarchy(normalized)) {
      return { resolvedWidgetIds: [] };
    }
    return { resolvedWidgetIds: dienststelleWaiters.resolveWhere(_KDB, matchAny, normalized) };
  }

  function readConfirmedHierarchy(_KDB, _input) {
    var normalized;
    var api;
    if (_input.hierarchySnapshot) {
      normalized = normalizeHierarchySnapshot({ hierarchySnapshot: _input.hierarchySnapshot });
      if (isConfirmedHierarchy(normalized)) {
        return normalized;
      }
    }
    api = _KDB.api && _KDB.api.dienststelle;
    if (!api) {
      return null;
    }
    normalized = normalizeHierarchySnapshot({ hierarchySnapshot: api.getCurrentHierarchySnapshot({ pageScopeId: "active" }) });
    return isConfirmedHierarchy(normalized) ? normalized : null;
  }

  function resolveDienststellePrerequisite(_KDB, _input) {
    var immediate = readConfirmedHierarchy(_KDB, _input);
    if (immediate) {
      return Promise.resolve(immediate);
    }
    return dienststelleWaiters.wait(_KDB, {
      widgetId: _input.widgetId,
      opSeq: _input.opSeq,
      timeoutMs: _config.bindingPrerequisiteTimeoutMs,
      timeoutReason: { timedOut: true }
    }).catch(function (_err) {
      if (_err && _err.destroyed) {
        throw _err;
      }
      // A cancel (park, tab delete, parameter-set reset) is not a timeout: it must end silently as stale.
      throw _err && _err.cancelled ? { cancelled: true, kind: "dienststelle" } : { timedOut: true, kind: "dienststelle" };
    });
  }

  function blockedResult(_status, _errorCode, _blockedReason, _input, _extra) {
    var isStartup = (_input.payload && _input.payload.source === "startup") || _input.reason === "startup";
    var out = {
      ok: false,
      widgetId: _input.widgetId,
      opSeq: _input.opSeq,
      status: _status,
      errorCode: _errorCode,
      errorMessage: _blockedReason === "awaiting_dienststelle"
        ? "Binding blocked until confirmed Dienststelle hierarchy is available."
        : _blockedReason === "awaiting_topN"
          ? "Binding blocked until TopN helper result is available."
          : _blockedReason === "missing_topN_helper_list_config"
            ? "TopN helper List visualization config is missing for the current metric/table."
            : "Binding prerequisites are incomplete.",
      diagnostics: Object.assign({ blockedReason: _blockedReason }, _extra || {})
    };
    if (_blockedReason === "awaiting_topN" && _extra && _extra.topNUnavailable === true && isStartup) {
      out.ok = true;
      out.status = "deferred";
      out.skipped = true;
      out.errorCode = null;
    }
    if (_blockedReason === "prerequisite_failed" && _extra && _extra.errorMessage) {
      out.errorMessage = _extra.errorMessage;
    }
    return out;
  }

  function extractStringValues(_values) {
    var out = [];
    (Array.isArray(_values) ? _values : []).forEach(function (_entry) {
      if (_entry == null) {
        return;
      }
      if (typeof _entry === "string") {
        out.push(_entry);
      } else if (_entry.useValue != null && String(_entry.useValue) !== "") {
        out.push(String(_entry.useValue));
      } else if (_entry.displayValue != null && String(_entry.displayValue) !== "") {
        out.push(String(_entry.displayValue));
      }
    });
    return out;
  }

  function extractDisplayValues(_values) {
    var out = [];
    (Array.isArray(_values) ? _values : []).forEach(function (_entry) {
      if (_entry && typeof _entry === "object" && _entry.displayValue != null && String(_entry.displayValue) !== "") {
        out.push(String(_entry.displayValue));
      } else if (typeof _entry === "string" && _entry.trim()) {
        out.push(_entry.trim());
      }
    });
    return out;
  }

  function hasEffectiveSelection(_payload) {
    var selection = _payload && _payload.selection ? _payload.selection : null;
    return !!(selection && selection.useValue != null && String(selection.useValue) !== "");
  }

  function buildResolutionBlock(_sourceResolution, _options) {
    var source = _sourceResolution && typeof _sourceResolution === "object" ? _sourceResolution : {};
    var options = _options || {};
    var downstreamValues = extractStringValues(source.downstreamValues);
    var dominantValues = extractStringValues(source.dominantValues);
    var displayValues = Array.isArray(source.displayValues)
      ? source.displayValues.slice()
      : extractDisplayValues(source.dominantValues).concat(extractDisplayValues(source.downstreamValues));
    var hostDisplayValues = Array.isArray(source.hostDisplayValues) ? source.hostDisplayValues.slice() : null;
    var hasConfirmedSelection = source.hasConfirmedSelection === true;
    var selection;
    var resolution;

    if (options.applySelectionFallback === true && !downstreamValues.length && !dominantValues.length && hasEffectiveSelection(options.payload)) {
      selection = options.payload.selection;
      dominantValues = [String(selection.useValue)];
      if (selection.displayValue != null && String(selection.displayValue) !== "") {
        displayValues = [String(selection.displayValue)];
      }
      if (typeof selection.hostDisplay === "string" && selection.hostDisplay !== "") {
        hostDisplayValues = [String(selection.hostDisplay)];
      }
    }
    if (!hasConfirmedSelection && (downstreamValues.length || dominantValues.length)) {
      hasConfirmedSelection = true;
    }
    resolution = {
      hasConfirmedSelection: hasConfirmedSelection,
      downstreamValues: downstreamValues,
      dominantValues: dominantValues,
      displayValues: displayValues,
      dominantScopeKey: source.dominantScopeKey != null
        ? String(source.dominantScopeKey)
        : source.dominantScope != null ? String(source.dominantScope) : null
    };
    if (Array.isArray(hostDisplayValues)) {
      resolution.hostDisplayValues = hostDisplayValues;
    }
    return resolution;
  }

  function normalizePlannerSnapshot(_snapshot) {
    var snap = _snapshot || {};
    return {
      activeDownstreamName: snap.activeDownstreamName != null
        ? String(snap.activeDownstreamName)
        : snap.filterId != null ? String(snap.filterId) : null,
      hierarchyItemId: snap.hierarchyItemId != null ? String(snap.hierarchyItemId) : null,
      resolution: buildResolutionBlock(snap.resolution && typeof snap.resolution === "object" ? snap.resolution : {}, {}),
      byFilter: snap.byFilter || null
    };
  }

  function normalizeHierarchySnapshot(_payload) {
    var payload = _payload || {};
    var source;
    if (payload.hierarchySnapshot && typeof payload.hierarchySnapshot === "object") {
      return normalizePlannerSnapshot(payload.hierarchySnapshot);
    }
    source = payload.resolution && typeof payload.resolution === "object" ? payload.resolution : {};
    return {
      activeDownstreamName: payload.activeFilterKey != null
        ? String(payload.activeFilterKey)
        : source.activeFilterKey != null ? String(source.activeFilterKey) : null,
      resolution: buildResolutionBlock(source, { applySelectionFallback: true, payload: payload }),
      byFilter: payload.byFilter || null
    };
  }

  return {
    dienststelleWaiters: dienststelleWaiters,
    topNWaiters: topNWaiters,
    cancelGateWaitersForWidget: cancelGateWaitersForWidget,
    rejectAllGateWaiters: rejectAllGateWaiters,
    isConfirmedHierarchy: isConfirmedHierarchy,
    resolveDienststelleGateWaiters: resolveDienststelleGateWaiters,
    resolveDienststellePrerequisite: resolveDienststellePrerequisite,
    normalizeHierarchySnapshot: normalizeHierarchySnapshot,
    blockedResult: blockedResult
  };
});
