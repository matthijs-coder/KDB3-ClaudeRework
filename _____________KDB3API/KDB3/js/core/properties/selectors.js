/*
 * Read facet over the Cognos property panel. Features read through these functions instead of
 * `_KDB.runtime.core.adapters.content`. `_KDB.api.properties` keeps its frozen `{ applyDeveloperMode }` shape.
 *
 *   readPropertyValue(_KDB, propertyId)               -> raw Cognos value | undefined (logs when the content adapter is
 *                                                        missing or getPropertyValue throws)
 *   readToggleProperty(_KDB, propertyId)              -> boolean (true/"true"/"1"/"yes" are true; null, "", "false", "0", "no" false)
 *   readLoadedProperty(_KDB, runtimeKey)              -> value loaded into `_KDB.properties[runtimeKey]` | undefined
 *   isDeveloperModeEnabled(_KDB)                      -> boolean, `_KDB.properties.KDBHideWidgetsToggle === true`
 *   isMultiStelleDefaultEnabled(_KDB)                 -> boolean, `_KDB.properties.KDBMultiStelleDefaultToggle === true`
 *   subscribePropertyChange(_KDB, eventName, handler) -> unsubscribe function | null (null and a console.error when the
 *                                                        content adapter has no on/off)
 *
 * Nothing here throws on a missing runtime, adapter or `_KDB.properties`; the Cognos host call in
 * readPropertyValue degrades to undefined as before. The values are never cached.
 */
define(["./loadProperties.js"], function (_loadProperties) {
  "use strict";

  var HIDE_WIDGETS_TOGGLE_ID = "KDBHideWidgetsToggle";
  var MULTI_STELLE_DEFAULT_TOGGLE_ID = "KDBMultiStelleDefaultToggle";

  function readContent(_KDB) {
    return _KDB && _KDB.runtime && _KDB.runtime.core && _KDB.runtime.core.adapters && _KDB.runtime.core.adapters.content || null;
  }

  function readLoadedProperty(_KDB, _runtimeKey) {
    return _KDB && _KDB.properties ? _KDB.properties[_runtimeKey] : undefined;
  }

  function isDeveloperModeEnabled(_KDB) {
    return readLoadedProperty(_KDB, HIDE_WIDGETS_TOGGLE_ID) === true;
  }

  function isMultiStelleDefaultEnabled(_KDB) {
    return readLoadedProperty(_KDB, MULTI_STELLE_DEFAULT_TOGGLE_ID) === true;
  }

  function subscribePropertyChange(_KDB, _eventName, _handler) {
    var content = readContent(_KDB);
    if (!content || typeof content.on !== "function" || typeof content.off !== "function") {
      console.error("[properties.subscribePropertyChange] content adapter on/off unavailable");
      return null;
    }
    content.on(_eventName, _handler);
    return content.off.bind(content, _eventName, _handler);
  }

  return {
    readPropertyValue: _loadProperties.readPropertyValue,
    readToggleProperty: _loadProperties.readToggleProperty,
    readLoadedProperty: readLoadedProperty,
    isDeveloperModeEnabled: isDeveloperModeEnabled,
    isMultiStelleDefaultEnabled: isMultiStelleDefaultEnabled,
    subscribePropertyChange: subscribePropertyChange
  };
});
