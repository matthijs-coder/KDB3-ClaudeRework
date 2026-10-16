/*
 * Published reads of the widgetSettings state (`state.widgets.settings`).
 *
 *   readWidgetSettings(_KDB, widgetId) -> copy of one widget's record | undefined
 *
 * `readWidgetSettings` returns what `api.widgetSettings.getState().byWidget[widgetId]` returns, without cloning the
 * records of the other widgets: callers that read one widget per call (widgetVis snapshot, display options, restore,
 * widgetBase frame serialization) cost O(1) in the widget count instead of O(N). The result is a `cloneJson` copy
 * and not the live record because the owner mutates records in place (`state.js`, `seed.js`, `restore.js`), so the
 * live record can be neither frozen nor handed out. Mutating the copy never reaches the state.
 *
 * `undefined` for a missing or empty id, a missing subtree, and a destroyed module (`destroy()` writes lifecycle
 * "disposed", where `getState()` answers `undefined` too). The lifecycle stays "disposed" until `mount()` writes
 * "ready", so a re-registered module reads again once it is mounted.
 *
 * `api.widgetSettings.getState()` is unchanged (full copy) and stays the read for the bulk case (writeback
 * `collectWidgets` reads the whole `byWidget` map once per save).
 *
 * This file is also the one published facade other widget folders import (widgetVis focus panel and render loading,
 * widgetBase slot stock and effects); they never import widgetSettings `config/`, `view/` or `effects/` files.
 *
 * Constants (stay):
 *   ACTION_TYPES                      -> the widgetSettings action type strings
 *   domSelectors                      -> the settings panel DOM selector registry (class names, attributes, selector builders)
 *   focusOnlyControls                 -> control definitions of the focus-mode only icons (`{ unmaximize: {...} }`)
 *
 * TRANSITIONAL panel kit (not reads; `feature-structure.mdc` allows it only until the focus panel is hosted by
 * widgetSettings and the two intent dispatches and the render loading go through `api.widgetSettings.dispatch`;
 * do not add to this list):
 *   buildSettingsIcon(_KDB, def, table?) -> settings icon element for a control definition
 *   markSelectedOption(optionEl)      -> marks one dropdown option as selected (and clears its siblings)
 *   shouldKeepDropdownsOpen(panel, target, iconSelector) -> pointer target lies inside a dropdown / on its owning icon
 *   resolveWidgetEl(_KDB, widgetId)   -> widget shell element (owner document, else the render root) | null
 *   dispatchDropdownOptionIntent(_KDB, panel, optionEl, { isHistoryReplay }) -> routes a dropdown choice like the settings panel
 *   dispatchIconIntent(_KDB, panel, iconEl, { isHistoryReplay })             -> routes an icon click like the settings panel
 *   startWidgetRenderLoading(_KDB, context)                                 -> starts the per-widget render loading overlay
 */
define([
  "../../../core/utils/kit/data.js",
  "./config/actionTypes.js",
  "./config/selectors.js",
  "./config/controlDefinitions.js",
  "./view/buildSettingsIcon.js",
  "./view/dropdownOptionSelection.js",
  "./view/panelOutsidePointerBehavior.js",
  "./view/resolveWidgetPlacementContext.js",
  "./effects/dispatchWidgetSettingsIntent.js",
  "./effects/startWidgetRenderLoading.js"
], function (
  _data,
  _actionTypes,
  _domSelectors,
  _controlDefinitions,
  _buildSettingsIcon,
  _dropdownOptionSelection,
  _panelOutsidePointerBehavior,
  _placementContext,
  _dispatchIntent,
  _startWidgetRenderLoading
) {
  "use strict";

  function readSettingsRoot(_KDB) {
    var root = _KDB && _KDB.state && _KDB.state.widgets ? _KDB.state.widgets.settings : undefined;
    return root && root.lifecycle !== "disposed" ? root : undefined;
  }

  function readWidgetSettings(_KDB, _widgetId) {
    var root = readSettingsRoot(_KDB);
    var byWidget = root ? root.byWidget : undefined;
    if (!byWidget || !_widgetId || !Object.prototype.hasOwnProperty.call(byWidget, _widgetId)) {
      return undefined;
    }
    return _data.cloneJson(byWidget[_widgetId]);
  }

  return {
    ACTION_TYPES: _actionTypes,
    domSelectors: _domSelectors,
    focusOnlyControls: _controlDefinitions.focusOnly,
    readWidgetSettings: readWidgetSettings,
    buildSettingsIcon: _buildSettingsIcon,
    markSelectedOption: _dropdownOptionSelection.markSelectedOption,
    shouldKeepDropdownsOpen: _panelOutsidePointerBehavior.shouldKeepDropdownsOpen,
    dispatchDropdownOptionIntent: _dispatchIntent.dropdownOption,
    dispatchIconIntent: _dispatchIntent.icon,
    startWidgetRenderLoading: _startWidgetRenderLoading,
    resolveWidgetEl: _placementContext.resolveWidgetEl
  };
});
