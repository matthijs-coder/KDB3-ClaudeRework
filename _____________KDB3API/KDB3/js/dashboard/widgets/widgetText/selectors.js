define(["../../../core/utils/kit/data.js"], function (_data) {
  "use strict";

  function readTextRoot(_KDB) {
    return _KDB && _KDB.state && _KDB.state.widgets ? _KDB.state.widgets.text : undefined;
  }

  function readTextEntry(_KDB, _widgetId) {
    var state = readTextRoot(_KDB);
    return state && _widgetId && state.byId ? state.byId[_widgetId] : undefined;
  }

  function readWidgetTextState(_KDB) {
    return _data.cloneJson(readTextRoot(_KDB));
  }

  function readTextRecord(_KDB, _widgetId) {
    return _data.cloneJson(readTextEntry(_KDB, _widgetId));
  }

  function readTextContent(_KDB, _widgetId) {
    var record = readTextEntry(_KDB, _widgetId);
    return record && record.content ? record.content.text : undefined;
  }

  function readTextPending(_KDB, _widgetId) {
    var record = readTextEntry(_KDB, _widgetId);
    return record ? _data.cloneJson(record.pending) : undefined;
  }

  return {
    readWidgetTextState: readWidgetTextState,
    readTextRecord: readTextRecord,
    readTextContent: readTextContent,
    readTextPending: readTextPending
  };
});
