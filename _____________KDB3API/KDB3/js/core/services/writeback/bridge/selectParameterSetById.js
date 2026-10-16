define([
  "./waitForBridgeSetSettlement.js",
  "./waitForParameterSetSelectReady.js",
  "../set/state/ensureWritebackRuntime.js",
  "../schema/errorCodes.js"
], function (_waitForBridgeSetSettlement, _waitForParameterSetSelectReady, _ensureWritebackRuntime, _errorCodes) {
  "use strict";

  var DEFAULT_TIMEOUT_MS = 30000;

  function abortController(_controller) {
    if (_controller && typeof _controller.abort === "function") _controller.abort();
  }

  function bindParentAbort(_parentSignal, _controller) {
    if (!_parentSignal) return;
    if (_parentSignal.aborted) {
      abortController(_controller);
      return;
    }
    _parentSignal.addEventListener("abort", abortController.bind(null, _controller), { once: true });
  }

  function findMatchingOption(_select, _parameterId) {
    var wanted = String(_parameterId);
    var index;
    if (!_select || !_select.options) return null;
    for (index = 0; index < _select.options.length; index += 1) {
      if (_select.options[index].value === wanted) return _select.options[index];
    }
    return null;
  }

  function remainingBudget(_startedAt, _timeoutMs) {
    return Math.max(0, _timeoutMs - (Date.now() - _startedAt));
  }

  function mapPhase2Fail(_phaseWait, _isAborted) {
    if (_isAborted || (_phaseWait && _phaseWait.aborted === true)) {
      return { ok: false, found: false, hostListReady: false, aborted: true };
    }
    return { ok: false, found: false, hostListReady: false, timedOut: true };
  }

  async function selectParameterSetById(_KDB, _parameterId, _options) {
    var startedAt = Date.now();
    var runtime;
    var controller;
    var parentSignal;
    var timeoutMs;
    var remainingMs;
    var phaseWait;
    var changeTime;
    var settle;
    var didSetSkipFlag = false;
    try {
      runtime = _ensureWritebackRuntime(_KDB);
      timeoutMs = _options && typeof _options.timeoutMs === "number" ? _options.timeoutMs : DEFAULT_TIMEOUT_MS;
      parentSignal = _options && _options.signal ? _options.signal : null;
      controller = new AbortController();
      runtime.abortControllers.optionWait = controller;
      bindParentAbort(parentSignal, controller);
      remainingMs = remainingBudget(startedAt, timeoutMs);
      phaseWait = await _waitForParameterSetSelectReady(_KDB, remainingMs, controller.signal);
      if (phaseWait.aborted || controller.signal.aborted || phaseWait.timedOut || !phaseWait.select) {
        return mapPhase2Fail(phaseWait, phaseWait.aborted || controller.signal.aborted);
      }
      if (!findMatchingOption(phaseWait.select, _parameterId)) {
        return { ok: false, found: false, hostListReady: true };
      }
      phaseWait.select.value = String(_parameterId);
      runtime.skipDiscardConfirmOnce = true;
      runtime.urlShareBootOverlayActive = false;
      didSetSkipFlag = true;
      changeTime = Date.now();
      phaseWait.select.dispatchEvent(new Event("change", { bubbles: true }));
      remainingMs = remainingBudget(startedAt, timeoutMs);
      settle = await _waitForBridgeSetSettlement.armWaiter(
        _KDB, changeTime, remainingMs, controller.signal
      );
      if (settle && settle.aborted) {
        return { aborted: true };
      }
      if (settle && settle.restoreResult) {
        return {
          ok: settle.restoreResult.ok === true,
          found: true,
          hostListReady: true,
          restoreResult: settle.restoreResult
        };
      }
      console.warn("[writebackBridge.selectParameterSetById]", _errorCodes.makeDiagnostic(
        _errorCodes.codes.WRITEBACK_URL_PARAMETER_SET_WAIT_TIMEOUT, "bridge",
        "matching parameter-set option existed but no matching SET settled in time",
        { parameterId: String(_parameterId) }
      ));
      return { ok: false, found: true, hostListReady: true, timedOut: true };
    } catch (error) {
      console.error("[writebackBridge.selectParameterSetById] failed", error);
      throw error;
    } finally {
      if (didSetSkipFlag === true && runtime) {
        runtime.skipDiscardConfirmOnce = false;
      }
    }
  }

  return selectParameterSetById;
});
