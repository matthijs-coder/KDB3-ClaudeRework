define([
  "../../config.js",
  "../../runtime.js",
  "../normalizeHierarchySnapshot.js"
], function (_config, _visRuntime, _normalizeHierarchySnapshot) {
  "use strict";

  function isConfirmedHierarchy(_snapshot) {
    var snap = _snapshot || {};
    var resolution = snap.resolution || {};
    if (resolution.hasConfirmedSelection !== true) {
      return false;
    }
    var downstream = resolution.downstreamValues || [];
    var dominant = resolution.dominantValues || [];
    return downstream.length > 0 || dominant.length > 0;
  }

  function getDienststelleGateBucket(_KDB) {
    var root = _visRuntime.initializeRuntime(_KDB);
    root.pendingPromises = root.pendingPromises || {};
    if (!root.pendingPromises.dienststelleGate) {
      root.pendingPromises.dienststelleGate = { waiters: [] };
    }
    return root.pendingPromises.dienststelleGate;
  }

  function removeDienststelleWaiter(_bucket, _entry) {
    _bucket.waiters = (_bucket.waiters || []).filter(function (_w) { return _w !== _entry; });
  }

  function waitForDienststelle(_KDB, _widgetId, _opSeq) {
    var timeoutMs = _config.bindingPrerequisiteTimeoutMs;
    return new Promise(function (resolve, reject) {
      var bucket = getDienststelleGateBucket(_KDB);
      var entry = { widgetId: _widgetId, opSeq: _opSeq, resolve: resolve, reject: reject };
      entry.timerId = setTimeout(function () {
        removeDienststelleWaiter(bucket, entry);
        reject({ timedOut: true });
      }, timeoutMs);
      bucket.waiters.push(entry);
    });
  }

  function resolveDienststelleGateWaiters(_KDB, _snapshot) {
    var normalized = _normalizeHierarchySnapshot(
      _snapshot && _snapshot.resolution ? { hierarchySnapshot: _snapshot } : { hierarchySnapshot: _snapshot }
    );
    if (!isConfirmedHierarchy(normalized)) {
      return { resolvedWidgetIds: [] };
    }
    var bucket = getDienststelleGateBucket(_KDB);
    var waiters = (bucket.waiters || []).slice();
    bucket.waiters = [];
    var resolvedWidgetIds = [];
    waiters.forEach(function (_entry) {
      clearTimeout(_entry.timerId);
      resolvedWidgetIds.push(_entry.widgetId);
      _entry.resolve(normalized);
    });
    return { resolvedWidgetIds: resolvedWidgetIds };
  }

  function rejectAllDienststelleGateWaiters(_KDB) {
    var bucket = getDienststelleGateBucket(_KDB);
    (bucket.waiters || []).forEach(function (_entry) {
      clearTimeout(_entry.timerId);
      if (typeof _entry.reject === "function") {
        _entry.reject({ destroyed: true });
      }
    });
    bucket.waiters = [];
  }

  function readConfirmedHierarchy(_KDB, _input) {
    if (_input.hierarchySnapshot && isConfirmedHierarchy(_normalizeHierarchySnapshot({ hierarchySnapshot: _input.hierarchySnapshot }))) {
      return _normalizeHierarchySnapshot({ hierarchySnapshot: _input.hierarchySnapshot });
    }
    var api = _KDB.api && _KDB.api.dienststelle;
    if (!api || typeof api.getCurrentHierarchySnapshot !== "function") {
      return null;
    }
    var snapshot = api.getCurrentHierarchySnapshot({ pageScopeId: "active" });
    var normalized = _normalizeHierarchySnapshot({ hierarchySnapshot: snapshot });
    return isConfirmedHierarchy(normalized) ? normalized : null;
  }

  function resolveDienststellePrerequisite(_KDB, _input) {
    var immediate = readConfirmedHierarchy(_KDB, _input);
    if (immediate) {
      return Promise.resolve(immediate);
    }
    return waitForDienststelle(_KDB, _input.widgetId, _input.opSeq).catch(function (_err) {
      if (_err && _err.destroyed) {
        throw _err;
      }
      if (_err && _err.cancelled) {
        // Cancel (dispose bij park/tab-delete, parameterSet-cancel) is geen
        // timeout: doorlaten zodat de prerequisite-catch hem stil (stale)
        // afhandelt i.p.v. ERROR_RECORDED — zelfde patroon als de topN-gate.
        throw { cancelled: true, kind: "dienststelle" };
      }
      throw { timedOut: true, kind: "dienststelle" };
    });
  }

  return {
    isConfirmedHierarchy: isConfirmedHierarchy,
    resolveDienststelleGateWaiters: resolveDienststelleGateWaiters,
    rejectAllDienststelleGateWaiters: rejectAllDienststelleGateWaiters,
    resolveDienststellePrerequisite: resolveDienststellePrerequisite
  };
});
