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
 */
define(["../../../core/utils/kit/data.js"], function (_data) {
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
    readWidgetSettings: readWidgetSettings
  };
});
