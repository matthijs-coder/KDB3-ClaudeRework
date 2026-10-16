define([
  "../../../utils/kit/async.js",
  "./parameterSetSelectConstants.js"
], function (_kitAsync, _constants) {
  "use strict";

  var OPTION_INTERVAL_MS = 50;

  function readSelectNode() {
    return typeof document !== "undefined" ? document.getElementById(_constants.SELECT_ID) : null;
  }

  function isRealOptionValue(_value) {
    var value = _value == null ? "" : String(_value);
    return value !== _constants.NEW_DASHBOARD_VALUE
      && _constants.PLACEHOLDER_VALUES.indexOf(value) === -1;
  }

  function readFirstRealOption(_select) {
    var index;
    if (!_select || !_select.options) return null;
    for (index = 0; index < _select.options.length; index += 1) {
      if (isRealOptionValue(_select.options[index].value)) return _select.options[index];
    }
    return null;
  }

  // The host appends " :: <suffix>" to option labels; callers only want the visible part.
  function sanitizeLabel(_label) {
    var match;
    if (!_label) return _label || null;
    match = /^(.*)\s*::\s*.*$/.exec(_label);
    return match ? match[1] : _label;
  }

  function isPlaceholderValue(_value) {
    return _constants.PLACEHOLDER_VALUES.indexOf(_value) !== -1 || _value === _constants.NEW_DASHBOARD_VALUE;
  }

  // Selected parameter-set id, or null for no select, the placeholder or the new-dashboard sentinel.
  function readSelectedId() {
    var select = readSelectNode();
    if (!select || isPlaceholderValue(select.value)) return null;
    return select.value;
  }

  function readSelectedParameterSet() {
    var select = readSelectNode();
    var option;
    if (!select || isPlaceholderValue(select.value)) return { id: null, label: null };
    option = select.options && select.selectedIndex >= 0 ? select.options[select.selectedIndex] : null;
    return { id: select.value, label: sanitizeLabel(option ? option.text : null) };
  }

  function revertSelect(_runtime) {
    var select = readSelectNode();
    if (select) {
      select.value = _runtime.lastConfirmedParameterSetId || "-";
    }
  }

  // Waits for the host select to exist and hold a real option (not the placeholder or the sentinel).
  // Resolves { select } | { aborted: true } | { timedOut: true }.
  async function waitForParameterSetSelectReady(_remainingMs, _signal) {
    var outcome;
    if (_signal && _signal.aborted) return { aborted: true };
    if (typeof _remainingMs !== "number" || _remainingMs <= 0) return { timedOut: true };
    outcome = await _kitAsync.pollUntil({
      check: function () {
        var select = readSelectNode();
        return readFirstRealOption(select) ? select : null;
      },
      intervalMs: OPTION_INTERVAL_MS,
      timeoutMs: _remainingMs,
      signal: _signal
    });
    if (outcome.ok) return { select: outcome.value };
    return outcome.reason === "aborted" ? { aborted: true } : { timedOut: true };
  }

  return {
    readSelectNode: readSelectNode,
    readSelectedId: readSelectedId,
    readSelectedParameterSet: readSelectedParameterSet,
    revertSelect: revertSelect,
    waitForParameterSetSelectReady: waitForParameterSetSelectReady
  };
});
