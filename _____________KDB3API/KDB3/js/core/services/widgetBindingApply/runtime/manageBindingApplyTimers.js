define([
  "./ensureWidgetBindingApplyRuntime.js",
], function (_ensureWidgetBindingApplyRuntime) {
  "use strict";

  function ensureTimersBucket(_KDB) {
    var runtime = _ensureWidgetBindingApplyRuntime(_KDB);
    if (!runtime) {
      return null;
    }
    runtime.timers = runtime.timers || {};
    return runtime.timers;
  }

  function buildScopedTimerKey(_scopeId, _key) {
    return String(_scopeId || "default") + ":" + String(_key || "");
  }

  function buildApplyBindingTimerScopeId(_target) {
    var target = _target || {};
    var widgetId = target.widgetId != null ? String(target.widgetId) : "unknown";
    var opSeq = target.opSeq != null ? String(target.opSeq) : "0";
    return "applyBinding:" + widgetId + ":" + opSeq;
  }

  function clearTimerEntry(_timers, _key) {
    if (_timers[_key] != null) {
      clearTimeout(_timers[_key]);
      delete _timers[_key];
    }
  }

  function withTimers(_KDB, _fn, _errorContext) {
    try {
      var timers = ensureTimersBucket(_KDB);
      if (timers) {
        _fn(timers);
      }
    } catch (err) {
      console.error("[widgetBindingApply.manageBindingApplyTimers] " + _errorContext + " failed", err);
    }
  }

  function registerBindingApplyTimer(_KDB, _scopeId, _key, _timerId) {
    withTimers(_KDB, function (timers) {
      var scopedKey = buildScopedTimerKey(_scopeId, _key);
      if (_timerId == null) {
        return;
      }
      clearTimerEntry(timers, scopedKey);
      timers[scopedKey] = _timerId;
    }, "registerBindingApplyTimer");
  }

  function clearBindingApplyTimer(_KDB, _scopeId, _key) {
    withTimers(_KDB, function (timers) {
      clearTimerEntry(timers, buildScopedTimerKey(_scopeId, _key));
    }, "clearBindingApplyTimer");
  }

  function clearBindingApplyTimerScope(_KDB, _scopeId) {
    withTimers(_KDB, function (timers) {
      var prefix = String(_scopeId || "") + ":";
      Object.keys(timers).forEach(function (key) {
        if (key.indexOf(prefix) === 0) {
          clearTimerEntry(timers, key);
        }
      });
    }, "clearBindingApplyTimerScope");
  }

  function clearAllBindingApplyTimers(_KDB) {
    withTimers(_KDB, function (timers) {
      Object.keys(timers).forEach(function (key) {
        clearTimerEntry(timers, key);
      });
    }, "clearAllBindingApplyTimers");
  }

  return {
    buildApplyBindingTimerScopeId: buildApplyBindingTimerScopeId,
    registerBindingApplyTimer: registerBindingApplyTimer,
    clearBindingApplyTimer: clearBindingApplyTimer,
    clearBindingApplyTimerScope: clearBindingApplyTimerScope,
    clearAllBindingApplyTimers: clearAllBindingApplyTimers,
  };
});
