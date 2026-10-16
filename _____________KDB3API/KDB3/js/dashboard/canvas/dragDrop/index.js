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

    // Boundary: also the dragend handler of the drag sources and the end of every drop.
    function completeDrop(event) {
      try {
        const didCleanup = _session.finishDragSession(_KDB, event, rt);

        dispatch({ type: _state.ACTION_TYPES.DRAG_FINISHED });
        return didCleanup;
      } catch (error) {
        return handleBoundaryError("finishDrag", error);
      }
    }

    function mount(options) {
      if (guard.blocked("mount")) {
        return false;
      }
      try {
        _avatar.createAvatarTemplates(_KDB, rt);
        _bind.bindAllDropboxes(ctx);
        _rebind.subscribeTabsChangedRebind(ctx);
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
      try {
        return _bind.bindAllDropboxes(ctx);
      } catch (error) {
        return handleBoundaryError("refreshDropboxes", error);
      }
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
        const errors = _rt.disposeRuntimeBuckets(rt);

        if (errors.length) {
          console.error("[dragDrop.destroy] cleanup errors", errors);
        }
        rt.sourceRuntime = null;
        dispatch({ type: _state.ACTION_TYPES.DESTROY });
      } catch (error) {
        console.error("[dragDrop.destroy] destroy failed", error);
      }
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
