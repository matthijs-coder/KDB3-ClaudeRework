define(["../config/defaults.js"], function (_defaults) {
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
    return (_order || []).filter(function (index) { const tab = _byIndex[String(index)]; return isDashboardTab(tab) && tab.visible === true; });
  }

  function isDashboardTab(_tab) {
    if (!_tab) { return false; }
    if (_tab.role) { return _tab.role === "dashboard"; }
    return _tab.isHelper !== true && _tab.index < _defaults.MAX_USER_TABS;
  }

  function isRenamableUserTab(_tab) { return isVisibleUserTab(_tab) && !!_tab.tabId; }
  function isVisibleUserTab(_tab) { return !!_tab && _tab.visible === true && isDashboardTab(_tab); }

  function findTabById(_byIndex, _tabId) {
    const keys = Object.keys(_byIndex || {});
    let index = 0;
    while (index < keys.length) {
      const tab = _byIndex[keys[index]];
      if (tab && tab.tabId === _tabId) { return tab; }
      index += 1;
    }
    return null;
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
    isDashboardTab: isDashboardTab,
    isRenamableUserTab: isRenamableUserTab,
    isVisibleUserTab: isVisibleUserTab,
    findTabById: findTabById,
    phaseToLifecycle: phaseToLifecycle,
    normalizeLineIndex: normalizeLineIndex,
    valueOrNull: valueOrNull,
    copyObject: copyObject,
    copyRoot: copyRoot
  };
});
