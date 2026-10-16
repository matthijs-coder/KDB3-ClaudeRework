define(["../config/defaults.js", "../slots.js"], function (_defaults, _slots) {
  "use strict";

  function cloneByIndex(_byIndex) {
    const clone = {};
    Object.keys(_byIndex || {}).forEach(function (key) { clone[key] = cloneTab(_byIndex[key]); });
    return clone;
  }

  function cloneTab(_tab) {
    return copyObject(_tab || {}, { button: copyObject(_tab && _tab.button, {}), edit: copyObject(_tab && _tab.edit, {}) });
  }

  function cloneHelperTab(_helperTab) {
    return copyObject({ index: _defaults.HELPER_TAB_INDEX, tabId: null, pageId: null, lifecycle: "idle", errorCode: null, errorMessage: null }, _helperTab || {});
  }

  function buildVisibleOrder(_byIndex, _order) {
    return (_order || []).filter(function (index) { const tab = _byIndex[String(index)]; return _slots.isDashboardTab(tab) && tab.visible === true; });
  }

  function phaseToLifecycle(_phase) {
    if (_phase === "pending") { return "loading"; }
    if (_phase === "confirmed") { return "ready"; }
    if (_phase === "failed") { return "error"; }
    return "idle";
  }

  function normalizeLineIndex(_value) {
    return typeof _value === "number" && _value >= 0 && _value <= 4 && _value === Math.floor(_value) ? _value : null;
  }

  function valueOrNull(_value) {
    return typeof _value === "number" && _value === Math.floor(_value) ? _value : null;
  }

  function copyObject(_base, _patch) {
    return Object.assign({}, _base || {}, _patch || {});
  }

  function copyRoot(_state, _patch) {
    return Object.assign({}, _state, _patch);
  }

  return {
    cloneByIndex: cloneByIndex,
    cloneTab: cloneTab,
    cloneHelperTab: cloneHelperTab,
    buildVisibleOrder: buildVisibleOrder,
    isDashboardTab: _slots.isDashboardTab,
    isRenamableUserTab: _slots.isRenamableUserTab,
    isVisibleUserTab: _slots.isVisibleUserTab,
    findTabById: _slots.findTabById,
    phaseToLifecycle: phaseToLifecycle,
    normalizeLineIndex: normalizeLineIndex,
    valueOrNull: valueOrNull,
    copyObject: copyObject,
    copyRoot: copyRoot
  };
});
