define([
  "./effects.js",
  "../../../core/utils/kit/errors.js",
  "../../../core/utils/kit/runtime.js"
], function (_effects, _errors, _rt) {
  "use strict";

  const INTENT_AXIS = {
    "kdbControl.canvasIntent.dashboardWidth": "width",
    "kdbControl.canvasIntent.dashboardHeight": "height",
    "kdbControl.canvasIntent.dashboardBackgroundColor": "background"
  };

  function createPageSurfaceController(_KDB) {
    const guard = _errors.createDisposedGuard("canvas");
    const rt = _rt.ensureRuntime(_KDB, "pageSurface", { pending: {} });
    let isMounted = false;
    let didFlushAfterReady = false;
    let didWarnMissingWhenReady = false;

    // applyAxis is the boundary for the DOM and facet work of one axis.
    function dispatch(action) {
      const axis = action ? INTENT_AXIS[action.type] : undefined;

      if (guard.blocked("dispatch") || !axis) {
        return;
      }
      if (isMounted !== true || didFlushAfterReady !== true) {
        _effects.writePending(rt, axis, action.payload ? action.payload.value : undefined);
        return;
      }
      _effects.applyAxis(_KDB, rt, axis, action.payload ? action.payload.value : undefined);
    }

    function mount() {
      if (guard.blocked("mount") || isMounted) {
        return;
      }
      isMounted = true;
      startApplyWhenReady();
    }

    function destroy() {
      if (guard.isDisposed()) {
        return;
      }
      guard.dispose();
      const errors = _rt.disposeRuntimeBuckets(rt);

      if (errors.length) {
        console.error("[pageSurface.destroy] cleanup errors", errors);
      }
      rt.pending = {};
      rt.canvasFacet = null;
    }

    function getState() {
      return undefined;
    }

    function startApplyWhenReady() {
      const controller = new AbortController();
      let pending;

      if (rt.abortControllers.pageSizeWait) {
        rt.abortControllers.pageSizeWait.abort();
      }
      rt.abortControllers.pageSizeWait = controller;
      pending = applyWhenReady(controller.signal);
      rt.pendingPromises.pageSizeWait = pending;
      pending.then(clearPending, clearPending);

      function clearPending() {
        if (rt.pendingPromises.pageSizeWait === pending) {
          delete rt.pendingPromises.pageSizeWait;
        }
      }
    }

    function isAborted(signal, outcome) {
      return guard.isDisposed() || signal.aborted || (outcome && outcome.outcome === "aborted");
    }

    function flushOnce() {
      if (guard.isDisposed() || didFlushAfterReady) {
        return;
      }
      didFlushAfterReady = true;
      _effects.flushPendingAndSettings(_KDB, rt);
    }

    // Queues dispatches until the canvas reports ready, then applies them and the current settings once.
    // Without a usable facet the settings are applied right away.
    async function applyWhenReady(signal) {
      const facet = rt.canvasFacet;

      try {
        if (!facet || typeof facet.whenCanvasReady !== "function") {
          if (!didWarnMissingWhenReady) {
            didWarnMissingWhenReady = true;
            console.warn("[pageSurface.applyWhenReady] canvasFacet.whenCanvasReady unavailable");
          }
          if (!isAborted(signal, null)) {
            flushOnce();
          }
          return;
        }
        const outcome = await facet.whenCanvasReady({ signal: signal });

        if (isAborted(signal, outcome)) {
          return;
        }
        if (!(outcome && outcome.ok === true && outcome.data && outcome.data.ready === true)) {
          console.error("[pageSurface.applyWhenReady] whenCanvasReady failed", outcome);
        }
        flushOnce();
      } catch (err) {
        if (isAborted(signal, null) || (err && err.name === "AbortError")) {
          return;
        }
        console.error("[pageSurface.applyWhenReady] failed", err);
        flushOnce();
      }
    }

    return { mount: mount, destroy: destroy, dispatch: dispatch, getState: getState };
  }

  function registerPageSurface(_KDB) {
    const cognosHost = _KDB.services ? _KDB.services.cognosHost : null;

    _rt.ensureRuntime(_KDB, "pageSurface", { pending: {} }).canvasFacet = cognosHost && cognosHost.canvas ? cognosHost.canvas : null;
    _KDB.api.canvas = createPageSurfaceController(_KDB);
    return _KDB.api.canvas;
  }

  return registerPageSurface;
});
