define([
  "./avatar.js",
  "./selectors.js",
  "./session.js",
  "./state.js",
  "./dropboxes/bind.js",
  "./dropboxes/rebind.js",
  "../../../core/utils/kit/errors.js",
  "../../../core/utils/kit/runtime.js"
], function (_avatar, _selectors, _session, _state, _bind, _rebind, _errors, _rt) {
  "use strict";

  // Lifecycle terms for dragDrop: idle, ready, error, disposed.

  function createDragDropController(_KDB) {
    const guard = _errors.createDisposedGuard("dragDrop");
    const rt = _rt.ensureRuntime(_KDB, "dragDrop", { dropboxBindings: new Map(), dropboxesById: {}, sourceRuntime: null });
    const ctx = { _KDB: _KDB, rt: rt, dispatch: dispatch, completeDrop: completeDrop, isDisposed: guard.isDisposed };

    function dispatch(action) {
      _KDB.state.dragDrop = _state.reduceDragDropState(_KDB.state.dragDrop, action);
    }

    function handleBoundaryError(methodName, error) {
      console.error("[dragDrop." + methodName + "] failed", error);
      dispatch({
        type: _state.ACTION_TYPES.ERROR,
        payload: {
          errorCode: "DRAG_DROP_" + methodName.toUpperCase() + "_FAILED",
          errorMessage: error && error.message ? error.message : String(error)
        }
      });
      return false;
    }

    // finishDragSession is the boundary of the cleanup (never throws); also the dragend handler of the drag sources.
    function completeDrop(event) {
      const didCleanup = _session.finishDragSession(_KDB, event, rt);

      dispatch({ type: _state.ACTION_TYPES.DRAG_FINISHED });
      return didCleanup;
    }

    // A failing bind is not fatal: the module stays usable and the next tabs:changed or refresh retries it.
    function bindAllDropboxesSafely(methodName) {
      try {
        return _bind.bindAllDropboxes(ctx);
      } catch (error) {
        console.error("[dragDrop." + methodName + "] bind failed", error);
        return false;
      }
    }

    function mount(options) {
      if (guard.blocked("mount")) {
        return false;
      }
      try {
        _avatar.createAvatarTemplates(_KDB, rt);
        _rebind.subscribeTabsChangedRebind(ctx);
        bindAllDropboxesSafely("mount");

        dispatch({ type: _state.ACTION_TYPES.MOUNT_SUCCEEDED, payload: { mountedAt: Date.now(), options: options || {} } });
        return true;
      } catch (error) {
        return handleBoundaryError("mount", error);
      }
    }

    function refreshDropboxes() {
      if (guard.blocked("refreshDropboxes")) {
        return false;
      }
      return bindAllDropboxesSafely("refreshDropboxes");
    }

    function startDrag(event, sourceInfo) {
      if (guard.blocked("startDrag")) {
        return false;
      }
      return _session.startDragSession(_KDB, event, sourceInfo, rt, dispatch);
    }

    function finishDrag(event) {
      if (guard.blocked("finishDrag")) {
        return false;
      }
      return completeDrop(event);
    }

    function getState() {
      return guard.isDisposed() ? undefined : _selectors.readDragDropState(_KDB);
    }

    function destroy() {
      if (guard.isDisposed()) {
        return;
      }
      guard.dispose();
      try {
        _session.finishDragSession(_KDB, null, rt);
        _bind.unbindAllDropboxes(rt);
        _avatar.removeAvatarTemplates(rt);
      } catch (error) {
        console.error("[dragDrop.destroy] teardown failed", error);
      } finally {
        releaseRuntime();
      }
    }

    // Always runs on destroy: releases the tabs:changed subscription, the rebind poll, timers and listeners.
    function releaseRuntime() {
      const errors = _rt.disposeRuntimeBuckets(rt);

      if (errors.length) {
        console.error("[dragDrop.destroy] cleanup errors", errors);
      }
      rt.sourceRuntime = null;
      dispatch({ type: _state.ACTION_TYPES.DESTROY });
    }

    return {
      destroy: destroy,
      finishDrag: finishDrag,
      getState: getState,
      mount: mount,
      refreshDropboxes: refreshDropboxes,
      startDrag: startDrag
    };
  }

  function registerDragDrop(_KDB) {
    _KDB.state = _KDB.state || {};
    _KDB.api = _KDB.api || {};
    _KDB.elements = _KDB.elements || {};
    _KDB.elements.selectors = _KDB.elements.selectors || {};
    if (!_KDB.state.dragDrop) {
      _KDB.state.dragDrop = _state.createInitialDragDropState();
    }
    _KDB.api.dragDrop = createDragDropController(_KDB);
    return _KDB.api.dragDrop;
  }

  return registerDragDrop;
});
