define([
  "../../../utils/kit/async.js",
  "./hostParameterSetSelect.js",
  "./parameterSetSelectConstants.js"
], function (_kitAsync, _hostParameterSetSelect, _constants) {
  "use strict";

  var SLOT_ID = "kdb-control-save-load-slot";
  var SLOT_POLL_MS = 500;
  var LOG = "[writebackBridge.ensureNewDashboardOption]";

  function readSlot() {
    return typeof document !== "undefined" ? document.getElementById(SLOT_ID) : null;
  }

  function disconnectObservers(_state) {
    if (_state.selectObserver) _state.selectObserver.disconnect();
    if (_state.slotObserver) _state.slotObserver.disconnect();
    _state.selectObserver = null;
    _state.slotObserver = null;
  }

  function cleanupState(_state) {
    var select, node;
    try {
      if (_state.changeHandler) document.removeEventListener("change", _state.changeHandler, true);
      disconnectObservers(_state);
      select = _hostParameterSetSelect.readSelectNode();
      if (select && select.value === _constants.NEW_DASHBOARD_VALUE) select.value = "-";
      node = select && select.querySelector("option[value='" + _constants.NEW_DASHBOARD_VALUE + "']");
      if (node && node.parentNode) node.parentNode.removeChild(node);
    } catch (error) { console.error(LOG + " failed", error); }
  }

  function findSentinelOption(_select) {
    var index;
    for (index = 0; _select.options && index < _select.options.length; index += 1) {
      if (_select.options[index].value === _constants.NEW_DASHBOARD_VALUE) return _select.options[index];
    }
    return null;
  }

  function prependSentinel(_state, _select) {
    var previousValue, existing, option, runtime;
    runtime = _state.KDB && _state.KDB.runtime && _state.KDB.runtime.writeback;
    if (runtime && runtime.urlShareBootOverlayActive === true) return;
    previousValue = _select.value;
    existing = findSentinelOption(_select);
    if (existing && _select.firstChild === existing) return;
    _state.inserting = true;
    try {
      option = existing;
      if (!option) {
        option = document.createElement("option");
        option.value = _constants.NEW_DASHBOARD_VALUE;
        option.text = _constants.NEW_DASHBOARD_LABEL;
      }
      _select.insertBefore(option, _select.firstChild);
      if (previousValue !== _constants.NEW_DASHBOARD_VALUE) _select.value = previousValue;
    } finally {
      _state.inserting = false;
    }
  }

  function bindSelectObserver(_state, _select) {
    disconnectObservers(_state);
    _state.selectObserver = new MutationObserver(onSelectMutation.bind(null, _state));
    _state.selectObserver.observe(_select, { childList: true, subtree: false });
    prependSentinel(_state, _select);
  }

  // The select lives inside the KDB-owned slot; observing only the slot (never document.body) keeps
  // the cost of the subtree observer bounded.
  function bindSlotObserver(_state, _slot) {
    var select;
    disconnectObservers(_state);
    select = _hostParameterSetSelect.readSelectNode();
    if (select) {
      bindSelectObserver(_state, select);
      return;
    }
    _state.slotObserver = new MutationObserver(onSlotMutation.bind(null, _state));
    _state.slotObserver.observe(_slot, { childList: true, subtree: true });
  }

  async function awaitSlotThenBind(_state) {
    var slot, outcome;
    try {
      slot = readSlot();
      if (!slot) {
        if (_state.slotPolling) return;
        _state.slotPolling = true;
        outcome = await _kitAsync.pollUntil({
          check: readSlot,
          intervalMs: SLOT_POLL_MS,
          timeoutMs: Infinity,
          signal: _state.signal
        });
        _state.slotPolling = false;
        if (!outcome.ok || _state.signal.aborted) return;
        slot = outcome.value;
      }
      bindSlotObserver(_state, slot);
    } catch (error) {
      _state.slotPolling = false;
      console.error(LOG + " failed", error);
    }
  }

  function onSelectMutation(_state) {
    var select;
    try {
      if (_state.inserting) return;
      select = _hostParameterSetSelect.readSelectNode();
      if (!select) {
        disconnectObservers(_state);
        awaitSlotThenBind(_state);
        return;
      }
      prependSentinel(_state, select);
    } catch (error) { console.error(LOG + " failed", error); }
  }

  function onSlotMutation(_state) {
    var select;
    try {
      select = _hostParameterSetSelect.readSelectNode();
      if (select) bindSelectObserver(_state, select);
    } catch (error) { console.error(LOG + " failed", error); }
  }

  function leaveSentinelSelected(_select) {
    var index, optionValue, candidates;
    candidates = ["-", ""];
    for (index = 0; index < candidates.length; index += 1) {
      _select.value = candidates[index];
      if (_select.value !== _constants.NEW_DASHBOARD_VALUE) return;
    }
    _select.selectedIndex = -1;
    if (_select.value !== _constants.NEW_DASHBOARD_VALUE) return;
    for (index = 0; _select.options && index < _select.options.length; index += 1) {
      optionValue = _select.options[index].value;
      if (optionValue !== _constants.NEW_DASHBOARD_VALUE) {
        _select.selectedIndex = index;
        return;
      }
    }
  }

  function releaseSentinelSelection(_select, _result) {
    try {
      if (!_select || (_result && _result.outcome === "cancelled")) return;
      leaveSentinelSelected(_select);
    } catch (error) { console.error(LOG + " failed", error); }
  }

  function onChange(_state, _event) {
    var select;
    try {
      select = _event && _event.target;
      if (!select || select.id !== _constants.SELECT_ID) return;
      if (select.value !== _constants.NEW_DASHBOARD_VALUE) return;
      _event.stopImmediatePropagation();
      Promise.resolve(_state.bridgeSet(null, "newDashboard")).then(
        releaseSentinelSelection.bind(null, select),
        releaseSentinelSelection.bind(null, select)
      );
    } catch (error) { console.error(LOG + " failed", error); }
  }

  // Idempotent: puts the "new dashboard" sentinel option first in the host select and keeps it there.
  function ensureNewDashboardOption(_KDB, _bridgeSet) {
    var runtime, controller, state, select;
    runtime = _KDB && _KDB.runtime && _KDB.runtime.writeback;
    if (!runtime || !runtime.abortControllers) return;
    if (runtime.abortControllers.newDashboardOption) return;
    controller = new AbortController();
    runtime.abortControllers.newDashboardOption = controller;
    state = {
      KDB: _KDB, bridgeSet: _bridgeSet, signal: controller.signal, inserting: false, slotPolling: false,
      selectObserver: null, slotObserver: null, changeHandler: null
    };
    state.changeHandler = onChange.bind(null, state);
    controller.signal.addEventListener("abort", cleanupState.bind(null, state));
    document.addEventListener("change", state.changeHandler, true);
    select = _hostParameterSetSelect.readSelectNode();
    if (select) bindSelectObserver(state, select);
    else awaitSlotThenBind(state);
  }

  return ensureNewDashboardOption;
});
