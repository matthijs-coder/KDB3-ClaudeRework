/*
 * Published reads and constants of widgetVis (`state.widgets.vis`).
 *
 *   ACTION_TYPES                        -> the widgetVis action type strings (same object as state.js ACTION_TYPES)
 *   readVisRecord(_KDB, id)             -> the stored record itself (read-only by convention) | undefined
 *   readVisMaximized(_KDB, id)          -> boolean
 *   readVisPropBucketKey(_KDB, type)    -> Cognos visualization bucket key of a vis type (config.visualizations bindingSpecs)
 */
define(["./state.js", "./visTypes.js"], function (_state, _visTypes) {
  "use strict";

  // Returns the stored record itself: callers must treat it as read-only.
  function readVisRecord(_KDB, _widgetId) {
    var state = _KDB && _KDB.state && _KDB.state.widgets && _KDB.state.widgets.vis;
    if (!state || !_widgetId || !state.byId[_widgetId]) {
      return undefined;
    }
    return state.byId[_widgetId];
  }

  function readVisMaximized(_KDB, _widgetId) {
    var record = readVisRecord(_KDB, _widgetId);
    return !!record && record.maximized === true;
  }

  function readVisPropBucketKey(_KDB, _visualizationType) {
    return _visTypes.resolveVisPropBucketKey(_visualizationType, _KDB);
  }

  return {
    ACTION_TYPES: _state.ACTION_TYPES,
    readVisRecord: readVisRecord,
    readVisMaximized: readVisMaximized,
    readVisPropBucketKey: readVisPropBucketKey
  };
});
