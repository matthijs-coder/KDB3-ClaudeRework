define(["./dispatchPopupDisplayResync.js"], function (_dispatchPopupDisplayResync) {
  "use strict";

  var POPUP_DISPLAY_RESYNC_CONFIRM_DELAYS_MS = [0, 16, 50];

  function isDisposed(_options) {
    return _options && typeof _options.isDisposed === "function" && _options.isDisposed();
  }

  function buildConfirmOptions(_options) {
    return Object.assign({}, _options || {}, { resyncSource: "mountMutationConfirm" });
  }

  function flushResync(_KDB, _runtime, _options) {
    if (isDisposed(_options)) {
      return;
    }
    _dispatchPopupDisplayResync(_KDB, _runtime, _options);
  }

  function runPrimaryResync(_KDB, _runtime, _options) {
    try {
      var pendingOptions = _runtime.popupDisplayResyncPendingOptions || _options;
      delete _runtime.timers.popupDisplayResync;
      flushResync(_KDB, _runtime, pendingOptions);
    } catch (error) {
      console.error("[filterDock.runPrimaryPopupDisplayResync] failed", error);
    }
  }

  function runConfirmResync(_KDB, _runtime, _options) {
    try {
      var pendingOptions = _runtime.popupDisplayResyncPendingOptions || _options;
      flushResync(_KDB, _runtime, buildConfirmOptions(pendingOptions));
    } catch (error) {
      console.error("[filterDock.runConfirmPopupDisplayResync] failed", error);
    }
  }

  function clearConfirmLadder(_runtime) {
    var handles;
    var idx;
    if (!_runtime || !_runtime.timers) {
      return;
    }
    handles = _runtime.timers.popupDisplayResyncConfirmLadder;
    if (handles && handles.length) {
      for (idx = 0; idx < handles.length; idx += 1) {
        clearTimeout(handles[idx]);
      }
    }
    delete _runtime.timers.popupDisplayResyncConfirmLadder;
  }

  function schedulePrimaryResync(_KDB, _runtime, _options) {
    if (_runtime.timers.popupDisplayResync != null) {
      return true;
    }
    if (typeof requestAnimationFrame === "function") {
      _runtime.timers.popupDisplayResync = requestAnimationFrame(
        runPrimaryResync.bind(null, _KDB, _runtime, _options)
      );
    } else {
      _runtime.timers.popupDisplayResync = setTimeout(
        runPrimaryResync.bind(null, _KDB, _runtime, _options),
        0
      );
    }
    return true;
  }

  function scheduleConfirmLadder(_KDB, _runtime, _options) {
    var delays = POPUP_DISPLAY_RESYNC_CONFIRM_DELAYS_MS;
    var handles = [];
    var idx;
    clearConfirmLadder(_runtime);
    for (idx = 0; idx < delays.length; idx += 1) {
      handles.push(
        setTimeout(
          runConfirmResync.bind(null, _KDB, _runtime, _options),
          delays[idx]
        )
      );
    }
    _runtime.timers.popupDisplayResyncConfirmLadder = handles;
  }

  function __controller(_KDB, _runtime, _options) {
    if (!_runtime) {
      return false;
    }
    if (isDisposed(_options)) {
      return false;
    }
    try {
      _runtime.timers = _runtime.timers || {};
      _runtime.popupDisplayResyncPendingOptions = _options;
      scheduleConfirmLadder(_KDB, _runtime, _options);
      return schedulePrimaryResync(_KDB, _runtime, _options);
    } catch (error) {
      console.error("[filterDock.schedulePopupDisplayResync] failed", error);
      return false;
    }
  }

  __controller.clearConfirmLadder = clearConfirmLadder;

  return __controller;
});
