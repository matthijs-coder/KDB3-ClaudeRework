define([
  "./state.js",
  "./results.js",
  "./resolve.js",
  "./cleanup.js",
  "../../../core/utils/kit/data.js",
  "../../../core/utils/kit/errors.js",
  "../../../core/utils/kit/runtime.js"
], function (_state, _results, _resolve, _cleanup, _data, _errors, _rt) {
  "use strict";

  // Lifecycle terms: idle, initializing, ready, error, disposed.
  // Runtime: _KDB.runtime.widgetTopN holds the widgetsFacet stamp, byOwner (one
  // record per owner chart: opSeq, resolve AbortController, claim, placement
  // lease) and, in abortControllers/pendingPromises, one cleanup record per helper.

  var ROUTES = {};
  ROUTES[_state.ACTION_TYPES.RESOLVE_REQUESTED] = { handler: _resolve.handleResolveRequested, failCode: "WIDGET_TOPN_INVALID_REQUEST" };
  ROUTES[_state.ACTION_TYPES.CLEANUP] = { handler: _cleanup.handleCleanup, failCode: "WIDGET_TOPN_CLEANUP_FAILED" };
  ROUTES[_state.ACTION_TYPES.ERROR] = { handler: handleError, failCode: "WIDGET_TOPN_INVALID_REQUEST" };

  function readRuntime(_KDB) {
    return _rt.ensureRuntime(_KDB, "widgetTopN", { byOwner: {} });
  }

  function createOwnerRuntimeRecord() {
    return {
      abortControllers: {},
      opSeq: 0,
      helperWidgetId: null,
      claimToken: null,
      helperManagedFilterItemIds: [],
      lastHelperPlan: null,
      lastHelperDataConfig: null,
      helperPlacement: null
    };
  }

  function ensureOwnerRuntime(_KDB, _ownerVisId) {
    var runtime = readRuntime(_KDB);
    if (!runtime.byOwner[_ownerVisId]) {
      runtime.byOwner[_ownerVisId] = createOwnerRuntimeRecord();
    }
    return runtime.byOwner[_ownerVisId];
  }

  function abortOwnerOperation(_ownerRuntime) {
    var controller = _ownerRuntime.abortControllers.resolve;
    if (controller) {
      controller.abort();
      delete _ownerRuntime.abortControllers.resolve;
    }
  }

  // Starts an operation: aborts the owner's previous one and returns its opSeq. A
  // requested opSeq older than the owner's current one starts nothing and is
  // reported stale by isOwnerOpSeqStale.
  function beginOwnerOperation(_KDB, _ownerVisId, _requestedOpSeq) {
    var ownerRuntime = ensureOwnerRuntime(_KDB, _ownerVisId);
    if (typeof _requestedOpSeq === "number" && _requestedOpSeq < ownerRuntime.opSeq) {
      return _requestedOpSeq;
    }
    abortOwnerOperation(ownerRuntime);
    ownerRuntime.abortControllers.resolve = new AbortController();
    ownerRuntime.opSeq = typeof _requestedOpSeq === "number" ? _requestedOpSeq : ownerRuntime.opSeq + 1;
    return ownerRuntime.opSeq;
  }

  function isOwnerOpSeqStale(_KDB, _ownerVisId, _opSeq) {
    var ownerRuntime = readRuntime(_KDB).byOwner[_ownerVisId];
    return !!ownerRuntime && typeof _opSeq === "number" && ownerRuntime.opSeq !== _opSeq;
  }

  function handleError(_context, _action) {
    _context.dispatchInternal({ type: _state.ACTION_TYPES.ERROR_RECORDED, widgetId: _action.widgetId, payload: _action.payload || {} });
    return { ok: true, ownerVisId: _action.widgetId, status: "error" };
  }

  function createWidgetTopNController(_KDB) {
    var guard = _errors.createDisposedGuard("widgetTopN");
    var context = {
      _KDB: _KDB,
      dispatchInternal: dispatchInternal,
      beginOwnerOperation: function (ownerVisId, requestedOpSeq) {
        return beginOwnerOperation(_KDB, ownerVisId, requestedOpSeq);
      },
      readOwnerRuntime: function (ownerVisId) {
        return ensureOwnerRuntime(_KDB, ownerVisId);
      },
      isStaleOpSeq: function (ownerVisId, opSeq) {
        return isOwnerOpSeqStale(_KDB, ownerVisId, opSeq);
      },
      abortOwnerOperation: abortOwnerOperation,
      removeOwner: removeOwner
    };

    function dispatchInternal(_action) {
      _KDB.state.widgets.topN = _state.reduceWidgetTopN(_KDB.state.widgets.topN, _action);
    }

    function ensureState() {
      _KDB.state = _KDB.state || {};
      _KDB.state.widgets = _KDB.state.widgets || {};
      if (!_KDB.state.widgets.topN) {
        _KDB.state.widgets.topN = _state.createInitialState();
      }
    }

    // Prunes the state record and the runtime record of an owner that no longer
    // exists. A newer operation that already replaced the record keeps it.
    function removeOwner(_ownerVisId, _ownerRuntime) {
      var runtime = readRuntime(_KDB);
      if (runtime.byOwner[_ownerVisId] !== _ownerRuntime) {
        return;
      }
      delete runtime.byOwner[_ownerVisId];
      dispatchInternal({ type: _state.ACTION_TYPES.OWNER_REMOVED, widgetId: _ownerVisId });
    }

    function mount() {
      if (guard.blocked("mount")) {
        return false;
      }
      try {
        ensureState();
        readRuntime(_KDB);
        dispatchInternal({ type: _state.ACTION_TYPES.MOUNT_STARTED });
        dispatchInternal({ type: _state.ACTION_TYPES.MOUNT_SUCCEEDED });
        return true;
      } catch (err) {
        console.error("[widgetTopN.mount] failed", err);
        dispatchInternal({
          type: _state.ACTION_TYPES.ERROR_RECORDED,
          payload: { moduleLevel: true, errorCode: "WIDGET_TOPN_MOUNT_FAILED", errorMessage: _results.messageFromError(err) }
        });
        return false;
      }
    }

    async function runRoute(_route, _action) {
      try {
        return _results.normalizeDispatchResult(await _route.handler(context, _action));
      } catch (err) {
        console.error("[widgetTopN.dispatch] " + _action.type + " failed", { widgetId: _action.widgetId }, err);
        return _results.normalizeDispatchResult({
          ok: false,
          status: "error",
          errorCode: _route.failCode,
          errorMessage: _results.messageFromError(err)
        });
      }
    }

    function dispatch(_action) {
      if (guard.blocked("dispatch")) {
        return Promise.resolve(_results.normalizeDispatchResult({ ok: false, outcome: "aborted", reason: "disposed", status: "aborted" }));
      }
      ensureState();
      var action = _state.validateAction(_action);
      var route = !action.errorCode && Object.prototype.hasOwnProperty.call(ROUTES, action.type) ? ROUTES[action.type] : null;
      if (!route) {
        return Promise.resolve(_results.normalizeDispatchResult({
          ok: false,
          status: "error",
          errorCode: action.errorCode || "WIDGET_TOPN_INVALID_REQUEST",
          errorMessage: action.errorCode ? action.errorMessage : "Unknown widgetTopN action."
        }));
      }
      return runRoute(route, action);
    }

    function getState() {
      return guard.isDisposed() ? undefined : _data.cloneJson(_KDB.state.widgets.topN);
    }

    function destroy() {
      if (guard.isDisposed()) {
        return;
      }
      guard.dispose();
      try {
        var runtime = readRuntime(_KDB);
        Object.keys(runtime.byOwner).forEach(function (ownerVisId) {
          Object.keys(runtime.byOwner[ownerVisId].abortControllers).forEach(function (key) {
            runtime.byOwner[ownerVisId].abortControllers[key].abort();
          });
        });
        var errors = _rt.disposeRuntimeBuckets(runtime);
        if (errors.length) {
          console.error("[widgetTopN.destroy] cleanup errors", errors);
        }
        runtime.byOwner = {};
        dispatchInternal({ type: _state.ACTION_TYPES.DESTROY });
      } catch (err) {
        console.error("[widgetTopN.destroy] failed", err);
      }
    }

    return { mount: mount, destroy: destroy, dispatch: dispatch, getState: getState };
  }

  function registerWidgetTopN(_KDB) {
    var cognosHost = _KDB.services && _KDB.services.cognosHost ? _KDB.services.cognosHost : null;
    readRuntime(_KDB).widgetsFacet = cognosHost && cognosHost.widgets ? cognosHost.widgets : null;
    _KDB.api = _KDB.api || {};
    _KDB.api.widgetTopN = createWidgetTopNController(_KDB);
    return _KDB.api.widgetTopN;
  }

  return registerWidgetTopN;
});
