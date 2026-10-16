define([
  "./applyPageSurface.js",
  "./readCanvasFacet.js"
], function (_applyPageSurface, _readCanvasFacet) {
  "use strict";

  const AXES = ["width", "height", "background"];

  function readRuntime(_KDB) {
    _KDB.runtime = _KDB.runtime || {};
    _KDB.runtime.pageSurface = _KDB.runtime.pageSurface || {};
    return _KDB.runtime.pageSurface;
  }

  function applyAxis(_KDB, _axis, _value) {
    if (_axis === "background") {
      _applyPageSurface.applyPageBackground(_KDB, _value);
      return;
    }
    _applyPageSurface.applyPageSize(_KDB, _axis, _value);
  }

  function dashboardValue(_dashboard, _axis) {
    return _axis === "background" ? _dashboard.backgroundColor : _dashboard[_axis];
  }

  function writePending(_KDB, _axis, _value) {
    const runtime = readRuntime(_KDB);
    runtime.pending = runtime.pending || {};
    runtime.pending[_axis] = _value;
  }

  function flushPending(_KDB) {
    const runtime = readRuntime(_KDB);
    const pending = runtime.pending || {};
    const flushed = { width: false, height: false, background: false };
    let index;
    let axis;
    for (index = 0; index < AXES.length; index += 1) {
      axis = AXES[index];
      if (Object.prototype.hasOwnProperty.call(pending, axis)) {
        applyAxis(_KDB, axis, pending[axis]);
        flushed[axis] = true;
      }
    }
    runtime.pending = {};
    return flushed;
  }

  function applyUnflushedSettings(_KDB, _flushed) {
    const api = _KDB.api && _KDB.api.kdbControl;
    if (!api || typeof api.getState !== "function") return;
    const snapshot = api.getState();
    const dashboard = snapshot && snapshot.settings && snapshot.settings.dashboard;
    if (!dashboard) return;
    if (_flushed.width !== true && _flushed.height !== true && _flushed.background !== true) {
      _applyPageSurface.applyDashboardSettings(_KDB, dashboard);
      return;
    }
    let index;
    let axis;
    for (index = 0; index < AXES.length; index += 1) {
      axis = AXES[index];
      if (_flushed[axis] !== true) applyAxis(_KDB, axis, dashboardValue(dashboard, axis));
    }
  }

  function shouldQueue(_instance) {
    return _instance.didFlushAfterReady !== true;
  }

  function flushOnce(_instance) {
    if (_instance._isDisposed === true || _instance.didFlushAfterReady === true) return;
    _instance.didFlushAfterReady = true;
    applyUnflushedSettings(_instance._KDB, flushPending(_instance._KDB));
  }

  function isAbortGate(_instance, _signal, _outcome) {
    return _instance._isDisposed === true ||
      (_signal && _signal.aborted) ||
      (_outcome && _outcome.outcome === "aborted");
  }

  function clearPageSizeWaitPromise(_runtime, _p) {
    if (!_runtime || !_runtime.pendingPromises) return;
    if (_runtime.pendingPromises.pageSizeWait === _p) {
      delete _runtime.pendingPromises.pageSizeWait;
    }
  }

  async function runApplyWhenReady(_instance, _signal) {
    try {
      const facet = _readCanvasFacet(_instance._KDB);
      if (!facet || typeof facet.whenCanvasReady !== "function") {
        if (_instance.didWarnMissingWhenReady !== true) {
          _instance.didWarnMissingWhenReady = true;
          console.warn("[pageSurface.applyPageSurfaceWhenReady] canvasFacet.whenCanvasReady unavailable");
        }
        if (!isAbortGate(_instance, _signal, null)) flushOnce(_instance);
        return;
      }
      const outcome = await facet.whenCanvasReady({ signal: _signal });
      if (isAbortGate(_instance, _signal, outcome)) return;
      if (!(outcome && outcome.ok === true && outcome.data && outcome.data.ready === true)) {
        console.error("[pageSurface.applyPageSurfaceWhenReady] whenCanvasReady failed", outcome);
      }
      flushOnce(_instance);
    } catch (err) {
      if (isAbortGate(_instance, _signal, null)) return;
      if (err && err.name === "AbortError") return;
      console.error("[pageSurface.applyPageSurfaceWhenReady] failed", err);
      if (_instance._isDisposed !== true && !(_signal && _signal.aborted)) flushOnce(_instance);
    }
  }

  function startApplyWhenReady(_instance) {
    try {
      const runtime = readRuntime(_instance._KDB);
      runtime.abortControllers = runtime.abortControllers || {};
      runtime.pendingPromises = runtime.pendingPromises || {};
      if (runtime.abortControllers.pageSizeWait) {
        runtime.abortControllers.pageSizeWait.abort();
      }
      const controller = new AbortController();
      runtime.abortControllers.pageSizeWait = controller;
      const p = runApplyWhenReady(_instance, controller.signal);
      runtime.pendingPromises.pageSizeWait = p;
      p.then(clearPageSizeWaitPromise.bind(null, runtime, p), clearPageSizeWaitPromise.bind(null, runtime, p));
    } catch (err) {
      console.error("[pageSurface.startApplyWhenReady] failed", err);
      if (!isAbortGate(_instance, null, null)) flushOnce(_instance);
    }
  }

  function abortWait(_instance) {
    const runtime = _instance._KDB.runtime && _instance._KDB.runtime.pageSurface;
    if (!runtime || !runtime.abortControllers || !runtime.abortControllers.pageSizeWait) return;
    runtime.abortControllers.pageSizeWait.abort();
    delete runtime.abortControllers.pageSizeWait;
  }

  return {
    startApplyWhenReady: startApplyWhenReady,
    writePending: writePending,
    applyAxis: applyAxis,
    shouldQueue: shouldQueue,
    abortWait: abortWait
  };
});
