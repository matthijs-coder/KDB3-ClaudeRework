define([
  "../view/syncDienststelleViewFromState.js",
  "../view/syncDienststelleFilterDockNames.js"
], function (_syncView, _syncFilterDockNames) {
  "use strict";

  var USER_CONFIRM_DEFER_FRAMES = 4;

  function hasOwnScopeValue(_valuesByScope) {
    var scopeId;
    if (!_valuesByScope || typeof _valuesByScope !== "object") {
      return false;
    }
    for (scopeId in _valuesByScope) {
      if (Object.prototype.hasOwnProperty.call(_valuesByScope, scopeId)) {
        return true;
      }
    }
    return false;
  }

  function isGlobalHandoff(_handoff) {
    return (
      _handoff &&
      (_handoff.filterScope === "global" ||
        _handoff.scope === "global" ||
        _handoff.scopeType === "global")
    );
  }

  function needsPageContextCommittedSyncAfterGlobalConfirm(_context, _reconcileResult) {
    var handoff = _context && _context.viewSyncHandoff ? _context.viewSyncHandoff : null;
    var resolution = _reconcileResult && _reconcileResult.resolution ? _reconcileResult.resolution : null;
    var dominantValues = resolution && resolution.dominantValues ? resolution.dominantValues : [];
    return (
      _context &&
      _context.source === "user" &&
      isGlobalHandoff(handoff) &&
      dominantValues.length === 0 &&
      hasOwnScopeValue(resolution ? resolution.pageContextValuesByScope : null)
    );
  }

  function runLifecycleViewSync(_KDB, _handoff, _context, _reconcileResult) {
    _syncFilterDockNames(_KDB);
    _syncView(_KDB, _handoff);
    if (needsPageContextCommittedSyncAfterGlobalConfirm(_context, _reconcileResult)) {
      _syncView(_KDB, null);
    }
  }

  function ensureDienststelleTimers(_KDB) {
    var runtime;
    try {
      runtime = _KDB && _KDB.runtime ? _KDB.runtime.dienststelle : null;
      if (!runtime) { return null; }
      runtime.timers = runtime.timers || {};
      return runtime.timers;
    } catch (_error) {
      console.warn("[dienststelle.scheduleDienststelleViewSync] timers bucket failed", _error);
      return null;
    }
  }

  function clearMixedHandle(_handle) {
    if (typeof _handle !== "number") { return; }
    try {
      clearTimeout(_handle);
      if (typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(_handle);
      }
    } catch (_error) {
      console.warn("[dienststelle.scheduleDienststelleViewSync] clear viewSync failed", _error);
    }
  }

  function isLiveViewSync(_KDB, _handleId) {
    var liveTimers = _KDB && _KDB.runtime && _KDB.runtime.dienststelle && _KDB.runtime.dienststelle.timers;
    if (!liveTimers) { return true; }
    return liveTimers.viewSync === _handleId;
  }

  function onViewSyncFrame(_KDB, _handoff, _context, _reconcileResult, _framesLeft, _frameId) {
    try {
      if (!isLiveViewSync(_KDB, _frameId)) { return; }
      runDeferredLifecycleViewSync(_KDB, _handoff, _context, _reconcileResult, _framesLeft);
    } catch (_error) {
      console.warn("[dienststelle.scheduleDienststelleViewSync] viewSync frame failed", _error);
    }
  }

  function runDeferredLifecycleViewSync(_KDB, _handoff, _context, _reconcileResult, _framesLeft) {
    var timers = ensureDienststelleTimers(_KDB);
    var liveTimers;
    var frameId;
    var timeoutId;
    if (_framesLeft <= 0) {
      liveTimers = _KDB && _KDB.runtime && _KDB.runtime.dienststelle && _KDB.runtime.dienststelle.timers;
      if (liveTimers) { delete liveTimers.viewSync; }
      runLifecycleViewSync(_KDB, _handoff, _context, _reconcileResult);
      return;
    }
    clearMixedHandle(timers ? timers.viewSync : null);
    if (typeof requestAnimationFrame === "function") {
      frameId = requestAnimationFrame(function (_timestamp) {
        onViewSyncFrame(_KDB, _handoff, _context, _reconcileResult, _framesLeft - 1, frameId);
      });
      if (timers) { timers.viewSync = frameId; }
      return;
    }
    timeoutId = setTimeout(function () {
      onViewSyncFrame(_KDB, _handoff, _context, _reconcileResult, 0, timeoutId);
    }, 0);
    if (timers) { timers.viewSync = timeoutId; }
  }

  function shouldDeferViewSync(_context) {
    var handoff = _context && _context.viewSyncHandoff ? _context.viewSyncHandoff : null;
    if (_context && _context.source === "historyReplay" && USER_CONFIRM_DEFER_FRAMES > 0) {
      return true;
    }
    return !!(_context && _context.source === "user" && handoff && USER_CONFIRM_DEFER_FRAMES > 0);
  }

  function resolveViewSyncHandoff(_context) {
    if (_context && _context.source === "historyReplay") {
      return null;
    }
    return _context && _context.viewSyncHandoff ? _context.viewSyncHandoff : null;
  }

  function scheduleDienststelleViewSync(_KDB, _context, _reconcileResult) {
    var handoff = resolveViewSyncHandoff(_context);
    if (shouldDeferViewSync(_context)) {
      runDeferredLifecycleViewSync(_KDB, handoff, _context, _reconcileResult, USER_CONFIRM_DEFER_FRAMES);
      return;
    }
    runLifecycleViewSync(_KDB, handoff, _context, _reconcileResult);
  }

  return scheduleDienststelleViewSync;
});
