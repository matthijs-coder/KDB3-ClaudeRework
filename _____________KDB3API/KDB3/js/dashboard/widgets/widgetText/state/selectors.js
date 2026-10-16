define(["./cloneSerializable.js"], function (_cloneSerializable) {
  function readTextRoot(_KDB) {
    return _KDB && _KDB.state && _KDB.state.widgets ? _KDB.state.widgets.text : undefined;
  }

  function readWidgetTextState(_KDB) {
    return _cloneSerializable(readTextRoot(_KDB));
  }

  function readTextRecord(_KDB, _widgetId) {
    var state = readTextRoot(_KDB);
    if (!state || !_widgetId || !state.byId[_widgetId]) {
      return undefined;
    }
    return _cloneSerializable(state.byId[_widgetId]);
  }

  function readTextContent(_KDB, _widgetId) {
    var record = readTextRecord(_KDB, _widgetId);
    return record && record.content ? record.content.text : undefined;
  }

  function readTextPending(_KDB, _widgetId) {
    var state = readTextRoot(_KDB);
    if (!state || !_widgetId || !state.byId[_widgetId]) {
      return undefined;
    }
    return _cloneSerializable(state.byId[_widgetId].pending);
  }

  return {
    readWidgetTextState: readWidgetTextState,
    readTextRecord: readTextRecord,
    readTextContent: readTextContent,
    readTextPending: readTextPending
  };
});
