define([
  "../view/syncView.js",
  "../view/dockNames.js",
  "../../../../core/utils/kit/runtime.js"
], function (_syncView, _dockNames, _kitRuntime) {
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
    _dockNames.syncFilterDockNames(_KDB);
    _syncView.syncViewFromState(_KDB, _handoff);
    if (needsPageContextCommittedSyncAfterGlobalConfirm(_context, _reconcileResult)) {
      _syncView.syncViewFromState(_KDB, null);
    }
  }

  function runDeferredViewSync(_KDB, _handoff, _context, _reconcileResult, _framesLeft) {
    if (_framesLeft <= 0) {
      runLifecycleViewSync(_KDB, _handoff, _context, _reconcileResult);
      return;
    }
    _kitRuntime.scheduleFrame(_KDB.runtime.dienststelle.timers, "viewSync", function () {
      try {
        runDeferredViewSync(_KDB, _handoff, _context, _reconcileResult, _framesLeft - 1);
      } catch (_error) {
        console.warn("[dienststelle.viewSync] viewSync frame failed", _error);
      }
    });
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

  function scheduleViewSync(_KDB, _context, _reconcileResult) {
    var handoff = resolveViewSyncHandoff(_context);
    if (shouldDeferViewSync(_context)) {
      runDeferredViewSync(_KDB, handoff, _context, _reconcileResult, USER_CONFIRM_DEFER_FRAMES);
      return;
    }
    runLifecycleViewSync(_KDB, handoff, _context, _reconcileResult);
  }

  return {
    scheduleViewSync: scheduleViewSync
  };
});
