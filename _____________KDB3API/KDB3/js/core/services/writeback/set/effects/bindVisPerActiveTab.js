define([
  "../../schema/errorCodes.js",
  "../config/restoreConstants.js",
  "./publishRestoreTabCaption.js",
], function (_errorCodes, _constants, _publishRestoreTabCaption) {
  "use strict";

  async function bindVisPerActiveTab(_KDB, _run, _widgetCorrelation) {
    const allowDegraded = _run.options.allowDegradedWidgetBinding === true;
    const groups = groupVisByTab(_widgetCorrelation);
    if (groups.length === 0) {
      await _run.dispatchOwnerPhase({
        phaseName: "widgetVisBinding", owner: "widgetVis",
        type: "widgetVis/parameterSetBindingRequested",
        payload: { widgetCorrelation: _widgetCorrelation },
        required: !allowDegraded, degradedAllowed: allowDegraded,
        failureCode: _errorCodes.codes.WRITEBACK_WIDGET_BINDING_DEGRADED,
      });
      return;
    }

    let didAnyBindFail = false;
    for (const group of groups) {
      await _run.dispatchOwnerPhase({
        phaseName: "tabActivateForWidgets", owner: "tabs",
        type: "tabs/parameterSetActivateTabRequested",
        payload: {
          tabIdx: group.tabIdx,
          includeHiddenDashboardTabs: true,
          restoreActiveTab: false,
          forceShow: true,
        },
        required: true,
        failureCode: _errorCodes.codes.WRITEBACK_TABS_TARGET_MISSING,
      });
      _publishRestoreTabCaption(_KDB, _run, { tabIdx: group.tabIdx });
      const bind = await _run.dispatchOwnerPhase({
        phaseName: "widgetVisBinding", owner: "widgetVis",
        type: "widgetVis/parameterSetBindingRequested",
        payload: { widgetCorrelation: group.entries },
        required: false, degradedAllowed: allowDegraded,
        failureCode: _errorCodes.codes.WRITEBACK_WIDGET_BINDING_DEGRADED,
      });
      if (!bind || bind.ok !== true) { didAnyBindFail = true; }
    }
    // required:false does not set abortedByOwner inside dispatchOwnerPhase.
    if (didAnyBindFail) {
      _run.abortedByOwner = true;
      throw _constants.ABORT;
    }
  }

  function groupVisByTab(_correlation) {
    if (!_correlation || typeof _correlation !== "object") { return []; }
    const keys = Object.keys(_correlation).sort(compareNumericKeys);
    const groups = [];
    for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
      const key = keys[keyIndex];
      const entry = _correlation[key];
      if (entry && entry.kind === "vis" && entry.widgetId && typeof entry.tabIdx === "number") {
        let group = null;
        for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
          if (groups[groupIndex].tabIdx === entry.tabIdx) {
            group = groups[groupIndex];
            break;
          }
        }
        if (!group) {
          group = { tabIdx: entry.tabIdx, entries: {} };
          groups.push(group);
        }
        group.entries[key] = entry;
      }
    }
    return groups;
  }

  function compareNumericKeys(a, b) {
    return Number(a) - Number(b);
  }

  return bindVisPerActiveTab;
});
