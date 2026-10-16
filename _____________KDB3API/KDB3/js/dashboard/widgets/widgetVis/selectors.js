define(["./state.js"], function (_state) {
  "use strict";

  function readWidgetVisState(_KDB) {
    return _state.cloneState(_KDB && _KDB.state && _KDB.state.widgets ? _KDB.state.widgets.vis : undefined);
  }

  function readVisRecord(_KDB, _widgetId) {
    var state = _KDB && _KDB.state && _KDB.state.widgets && _KDB.state.widgets.vis;
    if (!state || !_widgetId || !state.byId[_widgetId]) {
      return undefined;
    }
    return _state.cloneState(state.byId[_widgetId]);
  }

  function readVisDerived(_KDB, _widgetId) {
    var record = readVisRecord(_KDB, _widgetId);
    return record ? record.derived : undefined;
  }

  function readVisPending(_KDB, _widgetId) {
    var record = readVisRecord(_KDB, _widgetId);
    return record ? record.pending : undefined;
  }

  function readVisMaximized(_KDB, _widgetId) {
    var record = readVisRecord(_KDB, _widgetId);
    if (!record) {
      return false;
    }
    return record.maximized === true;
  }

  return {
    readWidgetVisState: readWidgetVisState,
    readVisRecord: readVisRecord,
    readVisDerived: readVisDerived,
    readVisPending: readVisPending,
    readVisMaximized: readVisMaximized
  };
});
