define([], function () {
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

  return {
    readVisRecord: readVisRecord,
    readVisMaximized: readVisMaximized
  };
});
