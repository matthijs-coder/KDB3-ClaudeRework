define([], function () {
  "use strict";

  async function apply(_KDB, _targetValue, _step, _ctx) {
    var step = _step || {};
    var targetValue = _targetValue || {};
    var tabIndex;
    var targetName;
    var tab;
    var liveName;
    var result;
    void _ctx;
    try {
      if (step.key !== "tabs_rename") {
        return false;
      }
      if (!_KDB || !_KDB.api || !_KDB.api.tabs || typeof _KDB.api.tabs.dispatch !== "function") {
        return false;
      }
      tabIndex = targetValue.tabIndex;
      targetName = targetValue.name;
      if (typeof tabIndex !== "number" || !isFinite(tabIndex) || typeof targetName !== "string") {
        return false;
      }
      tab = readTabByIndex(_KDB, tabIndex);
      if (!isRenamableUserTab(tab)) {
        return false;
      }
      if (targetValue.tabId && tab.tabId !== targetValue.tabId) {
        return false;
      }
      liveName = typeof tab.name === "string" ? tab.name : "";
      if (liveName !== targetName && !isLiveNameOpposite(step, targetValue, liveName)) {
        return false;
      }
      result = await _KDB.api.tabs.dispatch({
        type: "tabs/rename",
        payload: {
          tabIndex: tabIndex,
          tabId: targetValue.tabId,
          name: targetName,
          isHistoryReplay: true,
          source: "historyReplay",
          preserveEditSession: true
        }
      });
      if (result === true) {
        return true;
      }
      return liveName === targetName;
    } catch (err) {
      if (err && err.name === "AbortError") {
        return false;
      }
      console.error("[tabs.applyTabsRenameHistoryReplay] failed", err);
      return false;
    }
  }

  function readTabByIndex(_KDBArg, _tabIndex) {
    var tabs = _KDBArg && _KDBArg.state && _KDBArg.state.tabs;
    var byIndex = tabs && tabs.byIndex ? tabs.byIndex : {};
    return byIndex[String(_tabIndex)] || null;
  }

  function isDashboardTab(_tab) {
    return !!_tab && _tab.role === "dashboard";
  }

  function isVisibleUserTab(_tab) {
    return !!_tab && _tab.visible === true && isDashboardTab(_tab);
  }

  function isRenamableUserTab(_tab) {
    return isVisibleUserTab(_tab) && !!_tab.tabId;
  }

  function isLiveNameOpposite(_step, _targetValue, _liveName) {
    var oldName = _step && _step.old && _step.old.name;
    var newName = _step && _step.new && _step.new.name;
    var targetName = _targetValue && _targetValue.name;
    if (targetName === oldName) {
      return _liveName === newName;
    }
    if (targetName === newName) {
      return _liveName === oldName;
    }
    return false;
  }

  return { apply: apply };
});
