define([
  "./parameterSetSelectConstants.js"
], function (_constants) {
  "use strict";

  var SELECT_SELECTOR = "#" + _constants.SELECT_ID;
  var OPTION_INTERVAL_MS = 50;

  function remainingUntil(_deadlineAt) {
    return Math.max(0, _deadlineAt - Date.now());
  }

  function isRealOptionValue(_value) {
    var value = _value == null ? "" : String(_value);
    return value !== _constants.NEW_DASHBOARD_VALUE
      && _constants.PLACEHOLDER_VALUES.indexOf(value) === -1;
  }

  function readFirstRealOption(_select) {
    var index;
    var option;
    if (!_select || !_select.options) return null;
    for (index = 0; index < _select.options.length; index += 1) {
      option = _select.options[index];
      if (isRealOptionValue(option.value)) return option;
    }
    return null;
  }

  function readSelectNode() {
    return typeof document !== "undefined" ? document.getElementById(_constants.SELECT_ID) : null;
  }

  function readOptionWaitValue(_signal) {
    if (_signal && _signal.aborted) return { aborted: true };
    return readFirstRealOption(readSelectNode());
  }

  async function waitForFirstRealOption(_KDB, _signal, _remainingMs) {
    var waitFor;
    var result;
    var select;
    try {
      waitFor = _KDB.utils && _KDB.utils.waitFor;
      if (typeof waitFor !== "function") {
        console.warn("[writebackBridge.waitForParameterSetSelectReady] waitFor missing");
        return { timedOut: true };
      }
      if (typeof _remainingMs !== "number" || _remainingMs <= 0) return { timedOut: true };
      result = await waitFor(readOptionWaitValue.bind(null, _signal), {
        timeoutMs: _remainingMs,
        interval: OPTION_INTERVAL_MS
      });
      if ((result && result.aborted === true) || (_signal && _signal.aborted)) return { aborted: true };
      select = readSelectNode();
      if (select && readFirstRealOption(select)) return { select: select };
      return { timedOut: true };
    } catch (error) {
      if (error && error.code === "WAITFOR_TIMEOUT") return { timedOut: true };
      console.error("[writebackBridge.waitForFirstRealOption] failed", error);
      throw error;
    }
  }

  async function waitForSelectNode(_KDB, _timeoutMs, _signal) {
    var waitForElObserver;
    try {
      waitForElObserver = _KDB.utils && _KDB.utils.waitForElObserver;
      if (typeof waitForElObserver !== "function") {
        console.warn("[writebackBridge.waitForParameterSetSelectReady] waitForElObserver missing");
        return { timedOut: true };
      }
      return {
        select: await waitForElObserver(SELECT_SELECTOR, document, {
          timeoutMs: _timeoutMs,
          signal: _signal
        })
      };
    } catch (error) {
      if (error && error.code === "ABORTED") return { aborted: true };
      return { timedOut: true };
    }
  }

  async function waitForParameterSetSelectReady(_KDB, _remainingMs, _signal) {
    var deadlineAt;
    var selectWait;
    var readySelect;
    try {
      if (_signal && _signal.aborted) return { aborted: true };
      if (typeof _remainingMs !== "number" || _remainingMs <= 0) return { timedOut: true };
      deadlineAt = Date.now() + _remainingMs;
      selectWait = await waitForSelectNode(_KDB, _remainingMs, _signal);
      if (selectWait.aborted === true || (_signal && _signal.aborted)) return { aborted: true };
      if (selectWait.timedOut === true || !selectWait.select) return { timedOut: true };
      readySelect = readFirstRealOption(selectWait.select) ? selectWait.select : null;
      if (readySelect) return { select: readySelect };
      return await waitForFirstRealOption(_KDB, _signal, remainingUntil(deadlineAt));
    } catch (error) {
      console.error("[writebackBridge.waitForParameterSetSelectReady] failed", error);
      throw error;
    }
  }

  return waitForParameterSetSelectReady;
});
