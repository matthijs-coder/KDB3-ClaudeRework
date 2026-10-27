define([
  "./config/selectors.js",
  "./effects/dispatchWidgetSettingsIntent.js",
  "./state.js",
  "./intent/descriptor.js",
  "./intent/finalize.js",
  "./intent/topNGrouping.js",
  "./view/dropdownOptionSelection.js",
  "./view/resolveWidgetPlacementContext.js",
  "../../../core/config/visualizations/visTypeRules.js",
  "../../../core/utils/kit/history.js"
], function (
  _selectors,
  _dispatchIntent,
  _state,
  _descriptor,
  _finalize,
  _topNGrouping,
  _dropdownOptionSelection,
  _placementContext,
  _visTypeRules,
  _kitHistory
) {
  "use strict";

  const STEP_KEY = "widgetSettings_optionSelect";
  const FAILED_STATUSES = ["error", "timeout", "aborted"];

  function createWidgetSettingsHistoryReplayHandler(_KDB) {
    void _KDB;
    return _kitHistory.createReplayHandler({
      widgetSettings_optionSelect: function (_KDBArg, targetValue, step) {
        return applyOptionHistoryReplay(_KDBArg, { targetValue: targetValue || null, step: step });
      }
    });
  }

  function applyOptionHistoryReplay(_KDB, _payload) {
    try {
      const payload = _payload || {};
      const step = payload.step || {};
      const targetValue = payload.targetValue || null;
      if (step.key !== STEP_KEY || !targetValue) {
        return false;
      }
      const widgetId = String(targetValue.widgetId || "");
      const kind = String(targetValue.kind || "");
      if (!widgetId || !kind) {
        return false;
      }
      const panel = _placementContext.resolvePanel(_KDB, widgetId);
      if (!panel) {
        console.warn("[widgetSettings.historyReplay] panel not found", { widgetId: widgetId, kind: kind });
        return false;
      }
      const dropdown = findDropdownByKind(panel, kind);
      if (!dropdown) {
        console.warn("[widgetSettings.historyReplay] dropdown not found", { widgetId: widgetId, kind: kind });
        return false;
      }
      const option = findOptionInDropdown(dropdown, targetValue);
      if (!option) {
        console.warn("[widgetSettings.historyReplay] option not found", {
          widgetId: widgetId,
          kind: kind,
          optionKey: targetValue.optionKey,
          optionValue: targetValue.optionValue
        });
        return false;
      }
      _dropdownOptionSelection.markSelectedOption(option);
      return Promise.resolve(_dispatchIntent.dropdownOption(_KDB, panel, option, {
        isHistoryReplay: true,
        restoreControls: targetValue.restoreControls
      })).then(function (result) {
        if (targetValue.restoreControls) {
          return _finalize.isVisApplyConfirmed(result) === true;
        }
        return isReplaySuccess(result);
      });
    } catch (err) {
      console.error("[widgetSettings.applyWidgetSettingsOptionHistoryReplay] failed", err);
      return Promise.resolve(false);
    }
  }

  function isReplaySuccess(_dispatchResult) {
    return _dispatchResult === true || !!(_dispatchResult && _dispatchResult.ok === true);
  }

  function findDropdownByKind(_panel, _kind) {
    const kind = String(_kind || "");
    if (!_panel || !kind || typeof _panel.querySelector !== "function") {
      return null;
    }
    const dropdowns = _panel.querySelectorAll(_selectors.dropdownSelector);
    for (let index = 0; index < dropdowns.length; index += 1) {
      if ((dropdowns[index].getAttribute(_selectors.dropdownKindAttr) || "") === kind) {
        return dropdowns[index];
      }
    }
    const optionRow = _panel.querySelector(_selectors.dropdownOptionSelector + _selectors.byAttr(_selectors.dropdownKindAttr, kind));
    if (optionRow && typeof optionRow.closest === "function") {
      return optionRow.closest(_selectors.dropdownSelector);
    }
    return null;
  }

  function findOptionInDropdown(_dropdown, _frame) {
    const frame = _frame || {};
    const optionKey = String(frame.optionKey || "");
    const optionValue = String(frame.optionValue || "");
    if (optionKey) {
      const byKey = _dropdown.querySelector(_selectors.byAttr(_selectors.optionKeyAttr, optionKey));
      if (byKey) {
        return byKey;
      }
    }
    if (optionValue) {
      return _dropdown.querySelector(_selectors.byAttr(_selectors.optionValueAttr, optionValue));
    }
    return null;
  }

  function warnHistoryServiceMissingOnce(_KDB) {
    const rt = _KDB.runtime && _KDB.runtime.widgetSettings;
    if (!rt || rt.historyServiceMissingWarned === true) {
      return;
    }
    rt.historyServiceMissingWarned = true;
    console.warn("[widgetSettings] _KDB.services.history is not available; option history commits are skipped.");
  }

  function pushWidgetSettingsHistoryStep(_KDB, _oldFrame, _newFrame, _options) {
    const options = _options || {};
    if (options.isHistoryReplay === true || !_oldFrame || !_newFrame) {
      return false;
    }
    const history = _KDB.services && _KDB.services.history;
    if (!history) {
      warnHistoryServiceMissingOnce(_KDB);
      return false;
    }
    return _kitHistory.pushHistoryStep(_KDB, {
      key: STEP_KEY,
      timestamp: Date.now(),
      old: _state.cloneOrKeep(_oldFrame),
      new: _state.cloneOrKeep(_newFrame)
    });
  }

  // History waits for the apply result, so a failed or aborted apply leaves no entry. This is deliberately
  // looser than isVisApplyConfirmed: design skips (ok:true + skipped, e.g. the display-only title dropdown)
  // are real user choices and stay in history; only proven failure (ok !== true, stale, error/timeout/aborted)
  // blocks the push. Results without an ok field are pushed on intent, as before.
  function isConfirmedForHistory(result) {
    if (result == null || typeof result !== "object" || !("ok" in result)) {
      return true;
    }
    if (result.ok !== true || result.stale === true) {
      return false;
    }
    return FAILED_STATUSES.indexOf(result.status) < 0;
  }

  function pushHistoryAfterConfirmedApply(_KDB, _intentResult, _oldFrame, _newFrame, _when) {
    return Promise.resolve(_intentResult).then(function (result) {
      if (!isConfirmedForHistory(result)) {
        console.warn("[widgetSettings.pushHistoryAfterConfirmedApply] apply not confirmed; history step skipped", result);
        return false;
      }
      if (typeof _when === "function" && _when(result) !== true) {
        return false;
      }
      return pushWidgetSettingsHistoryStep(_KDB, _oldFrame, _newFrame, { isHistoryReplay: false });
    }).catch(function (error) {
      console.error("[widgetSettings.pushHistoryAfterConfirmedApply] apply rejected; history step skipped", error);
      return false;
    });
  }

  // Mutate only the old vis frame: undo of a switch onto a type without dimension (Prognose)
  // must re-bind the committed dimension/TopN, so they are frozen here before the Ohne clear.
  function maybeAttachRestoreControls(_KDB, oldFrame, option) {
    if (!oldFrame || !option || typeof option.getAttribute !== "function") {
      return;
    }
    if (String(option.getAttribute(_selectors.dropdownKindAttr) || "") !== "visualization") {
      return;
    }
    const visType = option.getAttribute(_selectors.optionValueAttr) || option.getAttribute(_selectors.optionKeyAttr) || "";
    if (_visTypeRules.supportsDimension(visType)) {
      return;
    }
    const record = _state.ensureWidgetSettingsByWidget(_KDB, oldFrame.widgetId);
    if (_topNGrouping.isAbsentSentinel(record.dimension) && _topNGrouping.isAbsentSentinel(record.topNChoice)) {
      return;
    }
    oldFrame.restoreControls = {
      dimension: record.dimension,
      topNChoice: record.topNChoice
    };
  }

  function buildDropdownSelectionFrame(_panel, _dropdown) {
    try {
      const selectedOption = _dropdownOptionSelection.readSelectedOption(_dropdown);
      if (selectedOption) {
        return _descriptor.fromOption(_panel, selectedOption);
      }
      const context = {
        widgetId: String(_panel.getAttribute(_selectors.panelRootAttr) || ""),
        widgetType: _panel.getAttribute(_selectors.panelWidgetTypeAttr) === "text" ? "text" : "live"
      };
      const kind = _dropdown ? (_dropdown.getAttribute(_selectors.dropdownKindAttr) || "") : "";
      return _descriptor.fromParts(context, kind, "", "");
    } catch (err) {
      console.error("[widgetSettings.buildDropdownSelectionFrame] failed", err);
      return null;
    }
  }

  function whenCoupledTopNCommitted(_result) {
    return !!(_result && _result.coupledTopNCommitted === true);
  }

  function whenDimensionHistoryStep(_result) {
    if (_result && _result.coupledTopNAttempted === true) {
      return _result.coupledTopNCommitted === true;
    }
    return true;
  }

  function framesAreEqual(_left, _right) {
    try {
      return JSON.stringify(_left) === JSON.stringify(_right);
    } catch (err) {
      console.error("[widgetSettings.framesAreEqual] failed", err);
      return _left === _right;
    }
  }

  function registerTopNHistory(_KDB, _panel, _intentResult) {
    const dropdown = _panel && typeof _panel.querySelector === "function"
      ? _panel.querySelector(_selectors.dropdownSelector + _selectors.byAttr(_selectors.dropdownKindAttr, "topN"))
      : null;
    const noneOption = dropdown ? dropdown.querySelector(_selectors.byAttr(_selectors.optionKeyAttr, "none")) : null;
    if (!noneOption) {
      console.warn("[widgetSettings.queueCoupledTopNClearHistory] TopN Ohne row missing");
      return;
    }
    const oldFrame = buildDropdownSelectionFrame(_panel, dropdown);
    const newFrame = _descriptor.fromOption(_panel, noneOption);
    if (oldFrame && newFrame) {
      pushHistoryAfterConfirmedApply(_KDB, _intentResult, oldFrame, newFrame, whenCoupledTopNCommitted);
    }
  }

  // A dimension change may clear TopN as well; both steps are queued behind the same apply result.
  // Returns false when the dropdown is not the dimension dropdown, so the caller pushes the plain step.
  function queueCoupledTopNClearHistory(_KDB, _panel, _dropdown, _intentResult, _dimensionOldFrame, _dimensionNewFrame) {
    if (!(_dropdown && _dropdown.getAttribute(_selectors.dropdownKindAttr) === "dimension")) {
      return false;
    }
    if (framesAreEqual(_dimensionOldFrame, _dimensionNewFrame)) {
      return true;
    }
    registerTopNHistory(_KDB, _panel, _intentResult);
    pushHistoryAfterConfirmedApply(_KDB, _intentResult, _dimensionOldFrame, _dimensionNewFrame, whenDimensionHistoryStep);
    return true;
  }

  return {
    createWidgetSettingsHistoryReplayHandler: createWidgetSettingsHistoryReplayHandler,
    pushWidgetSettingsHistoryStep: pushWidgetSettingsHistoryStep,
    pushHistoryAfterConfirmedApply: pushHistoryAfterConfirmedApply,
    maybeAttachRestoreControls: maybeAttachRestoreControls,
    buildDropdownSelectionFrame: buildDropdownSelectionFrame,
    queueCoupledTopNClearHistory: queueCoupledTopNClearHistory
  };
});
