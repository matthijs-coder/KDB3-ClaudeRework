define([], function () {
  "use strict";

  function isAbortedOutcome(_outcome) {
    return !!(
      _outcome && (
        _outcome.outcome === "aborted" ||
        _outcome.aborted === true ||
        _outcome.reason === "aborted" ||
        _outcome.reason === "aborted-after-effect" ||
        _outcome.reason === "disposed"
      )
    );
  }

  async function applyPropertyMap(_setContentProperty, _widgetId, _propertyMap, _diagnostics, _groupName, _signal) {
    var keys = Object.keys(_propertyMap || {});
    var applied = [];
    var failed = [];
    var index;
    var key;
    var value;
    var outcome;
    for (index = 0; index < keys.length; index += 1) {
      key = keys[index];
      value = _propertyMap[key];
      try {
        outcome = await Promise.resolve(_setContentProperty(_widgetId, key, value, { signal: _signal }));
        if (isAbortedOutcome(outcome)) {
          return { ok: false, aborted: true };
        }
        if (!outcome || outcome.ok !== true) {
          failed.push({
            group: _groupName,
            key: key,
            errorMessage: outcome && outcome.errorCode ? String(outcome.errorCode) : "setContentProperty failed"
          });
        } else {
          applied.push(key);
        }
      } catch (err) {
        failed.push({
          group: _groupName,
          key: key,
          errorMessage: String(err && err.message ? err.message : err)
        });
      }
    }
    if (applied.length) {
      _diagnostics.appliedKeys = (_diagnostics.appliedKeys || []).concat(applied.map(function (_appliedKey) {
        return _groupName + ":" + _appliedKey;
      }));
    }
    if (failed.length) {
      _diagnostics.failed = (_diagnostics.failed || []).concat(failed);
    }
    return { ok: failed.length === 0, aborted: false };
  }

  return applyPropertyMap;
});
