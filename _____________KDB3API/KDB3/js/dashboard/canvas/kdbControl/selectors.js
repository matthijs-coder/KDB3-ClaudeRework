/*
 * Published read surface of kdbControl for other modules (template root selectors file). The frozen paths
 * `state/selectors.js`, `state/initialState.js` and `config/domSelectors.js` stay importable and unchanged.
 *
 *   readVisualizationDefaults(_KDB)  -> { width, height, backgroundColor } strings ("" when unset): default for new visualizations
 *   readCommentDefaults(_KDB)        -> { width, height, backgroundColor } strings: default for new comment (text) widgets
 *   readDashboardSettings(_KDB)      -> { width, height, backgroundColor, hideWidgetSettingsButtons, isDeveloperMode } (canvas)
 *   readControlPanelSettings(_KDB)   -> { backgroundColor, buttonColor, actionButtonColor, innerBackgroundColor }
 *   readDefaultSettings()            -> fresh `initialState().settings` (owner defaults, e.g. for writeback deltas)
 *   readDomSelectors()               -> the control panel DOM selector strings (config/domSelectors.js)
 *
 * The reads use the same snapshot as `_KDB.api.kdbControl.getState()` (`_KDB.state.kdbControl`, not cloned) and never
 * throw: a missing state yields the empty values of the state selectors.
 *
 * View refresh: `_KDB.api.kdbControl.syncView()` is the one public entry (it runs the bound framework view sync,
 * a no-op before mount and after destroy); callers must not reach through `runtime.kdbControl.frameworkBindContext`.
 */
define([
  "./state/selectors.js",
  "./state/initialState.js",
  "./config/domSelectors.js"
], function (_stateSelectors, _initialState, _domSelectors) {
  "use strict";

  function readState(_KDB) {
    return _KDB && _KDB.state ? _KDB.state.kdbControl : undefined;
  }

  function readVisualizationDefaults(_KDB) {
    return _stateSelectors.readVisualizationDefaults(readState(_KDB));
  }

  function readCommentDefaults(_KDB) {
    return _stateSelectors.readCommentDefaults(readState(_KDB));
  }

  function readDashboardSettings(_KDB) {
    return _stateSelectors.readDashboardSettings(readState(_KDB));
  }

  function readControlPanelSettings(_KDB) {
    return _stateSelectors.readControlPanelSettings(readState(_KDB));
  }

  function readDefaultSettings() {
    return _initialState().settings;
  }

  function readDomSelectors() {
    return _domSelectors;
  }

  return {
    readVisualizationDefaults: readVisualizationDefaults,
    readCommentDefaults: readCommentDefaults,
    readDashboardSettings: readDashboardSettings,
    readControlPanelSettings: readControlPanelSettings,
    readDefaultSettings: readDefaultSettings,
    readDomSelectors: readDomSelectors
  };
});
