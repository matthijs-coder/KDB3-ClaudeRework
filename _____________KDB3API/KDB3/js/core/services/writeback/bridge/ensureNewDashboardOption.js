define(["./parameterSetSelectConstants.js"], function (_constants) {
  "use strict";

  var SLOT_ID = "kdb-control-save-load-slot";
  var LOG = "[writebackBridge.ensureNewDashboardOption]";

  function readSelect() {
    return typeof document !== "undefined" ? document.getElementById(_constants.SELECT_ID) : null;
  }
  function cleanupState(_state) {
    var select, node;
    try {
      if (_state.changeHandler) document.removeEventListener("change", _state.changeHandler, true);
      if (_state.selectObserver) _state.selectObserver.disconnect();
      if (_state.waitObserver) _state.waitObserver.disconnect();
      _state.selectObserver = null;
      _state.waitObserver = null;
      select = readSelect();
      if (select && select.value === _constants.NEW_DASHBOARD_VALUE) select.value = "-";
      node = select && select.querySelector("option[value='" + _constants.NEW_DASHBOARD_VALUE + "']");
      if (node && node.parentNode) node.parentNode.removeChild(node);
    } catch (error) { console.error(LOG + " failed", error); }
  }
  function prependSentinel(_state, _select) {
    var previousValue, existing, option, runtime, index;
    try {
      if (!_select) return;
      runtime = _state.KDB && _state.KDB.runtime && _state.KDB.runtime.writeback;
      if (runtime && runtime.urlShareBootOverlayActive === true) return;
      previousValue = _select.value;
      existing = null;
      for (index = 0; _select.options && index < _select.options.length; index += 1) {
        if (_select.options[index].value === _constants.NEW_DASHBOARD_VALUE) {
          existing = _select.options[index];
          break;
        }
      }
      if (existing && _select.firstChild === existing) return;
      _state.inserting = true;
      option = existing;
      if (!option) {
        option = document.createElement("option");
        option.value = _constants.NEW_DASHBOARD_VALUE;
        option.text = _constants.NEW_DASHBOARD_LABEL;
      }
      _select.insertBefore(option, _select.firstChild);
      if (previousValue !== _constants.NEW_DASHBOARD_VALUE) _select.value = previousValue;
    } catch (error) { console.error(LOG + " failed", error); throw error; } finally { _state.inserting = false; }
  }
  function bindSelectObserver(_state, _select) {
    try {
      if (_state.selectObserver) _state.selectObserver.disconnect();
      if (_state.waitObserver) { _state.waitObserver.disconnect(); _state.waitObserver = null; }
      _state.selectObserver = new MutationObserver(onSelectMutation.bind(null, _state));
      _state.selectObserver.observe(_select, { childList: true, subtree: false });
      prependSentinel(_state, _select);
    } catch (error) { console.error(LOG + " failed", error); throw error; }
  }
  function bindWaitObserver(_state) {
    var root;
    try {
      if (_state.waitObserver) _state.waitObserver.disconnect();
      root = typeof document !== "undefined" ? (document.getElementById(SLOT_ID) || document.body) : null;
      if (!root) return;
      _state.waitObserver = new MutationObserver(onWaitMutation.bind(null, _state));
      _state.waitObserver.observe(root, { childList: true, subtree: true });
    } catch (error) { console.error(LOG + " failed", error); throw error; }
  }
  function onSelectMutation(_state) {
    var select;
    try {
      if (_state.inserting) return;
      select = readSelect();
      if (!select) {
        if (_state.selectObserver) { _state.selectObserver.disconnect(); _state.selectObserver = null; }
        bindWaitObserver(_state);
        return;
      }
      prependSentinel(_state, select);
    } catch (error) { console.error(LOG + " failed", error); }
  }
  function onWaitMutation(_state) {
    var select;
    try {
      select = readSelect();
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
  function ensureNewDashboardOption(_KDB, _bridgeSet) {
    var runtime, controller, state, select;
    try {
      runtime = _KDB && _KDB.runtime && _KDB.runtime.writeback;
      if (!runtime) return;
      if (!runtime.abortControllers || typeof runtime.abortControllers !== "object") {
        runtime.abortControllers = {};
      }
      if (runtime.abortControllers.newDashboardOption) return;
      controller = new AbortController();
      runtime.abortControllers.newDashboardOption = controller;
      state = {
        KDB: _KDB, bridgeSet: _bridgeSet, inserting: false,
        selectObserver: null, waitObserver: null, changeHandler: null
      };
      state.changeHandler = onChange.bind(null, state);
      controller.signal.addEventListener("abort", cleanupState.bind(null, state));
      document.addEventListener("change", state.changeHandler, true);
      select = readSelect();
      if (select) bindSelectObserver(state, select);
      else bindWaitObserver(state);
    } catch (error) { console.error(LOG + " failed", error); throw error; }
  }
  return ensureNewDashboardOption;
});
