define([
  "../config/selectors.js",
  "../effects/buildWidgetSettingsIntentDescriptor.js",
  "../history/pushHistoryAfterConfirmedApply.js",
  "./buildDropdownSelectionFrame.js"
], function (_selectors, _descriptor, _pushHistoryAfterConfirmedApply, _buildSelectionFrame) {
  "use strict";

  function whenCoupledTopNCommitted(_result) {
    try {
      return !!(_result && _result.coupledTopNCommitted === true);
    } catch (err) {
      console.error("[widgetSettings.whenCoupledTopNCommitted] failed", err);
      throw err;
    }
  }

  function whenDimensionHistoryStep(_result) {
    try {
      if (_result && _result.coupledTopNAttempted === true) {
        return _result.coupledTopNCommitted === true;
      }
      return true;
    } catch (err) {
      console.error("[widgetSettings.whenDimensionHistoryStep] failed", err);
      throw err;
    }
  }

  function framesAreEqual(_left, _right) {
    try {
      return JSON.stringify(_left) === JSON.stringify(_right);
    } catch (err) {
      console.error("[widgetSettings.framesAreEqual] failed", err);
      return _left === _right;
    }
  }

  function isDimensionDropdown(_dropdown) {
    try {
      return !!(_dropdown && _dropdown.getAttribute(_selectors.dropdownKindAttr) === "dimension");
    } catch (err) {
      console.error("[widgetSettings.isDimensionDropdown] failed", err);
      throw err;
    }
  }

  function registerTopNHistory(_KDB, _panel, _intentResult) {
    try {
      const dropdown = _panel && typeof _panel.querySelector === "function"
        ? _panel.querySelector(_selectors.dropdownSelector + _selectors.byAttr(_selectors.dropdownKindAttr, "topN"))
        : null;
      const noneOption = dropdown
        ? dropdown.querySelector(_selectors.byAttr(_selectors.optionKeyAttr, "none"))
        : null;
      let oldFrame;
      let newFrame;
      if (!noneOption) {
        console.warn("[widgetSettings.queueCoupledTopNClearHistory] TopN Ohne row missing");
        return;
      }
      oldFrame = _buildSelectionFrame(_panel, dropdown);
      newFrame = _descriptor.fromOption(_panel, noneOption);
      if (!oldFrame || !newFrame) {
        return;
      }
      _pushHistoryAfterConfirmedApply(_KDB, _intentResult, oldFrame, newFrame, whenCoupledTopNCommitted);
    } catch (err) {
      console.error("[widgetSettings.registerTopNHistory] failed", err);
      throw err;
    }
  }

  function __controller(_KDB, _panel, _dropdown, _intentResult, _dimensionOldFrame, _dimensionNewFrame) {
    try {
      if (!isDimensionDropdown(_dropdown)) {
        return false;
      }
      if (framesAreEqual(_dimensionOldFrame, _dimensionNewFrame)) {
        return true;
      }
      registerTopNHistory(_KDB, _panel, _intentResult);
      _pushHistoryAfterConfirmedApply(_KDB, _intentResult, _dimensionOldFrame, _dimensionNewFrame, whenDimensionHistoryStep);
      return true;
    } catch (err) {
      console.error("[widgetSettings.queueCoupledTopNClearHistory] failed", err);
      throw err;
    }
  }

  return __controller;
});
