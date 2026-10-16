/*
 * Published reads of the widgetText state (`state.widgets.text`); every return value is a copy.
 *
 *   readWidgetTextState(_KDB)     -> clone of the whole subtree | undefined
 *   readTextById(_KDB)            -> clone of the `byId` map, `{}` when missing
 *   readTextRecord(_KDB, id)      -> clone of one widget record | undefined
 *   readTextContent(_KDB, id)     -> the stored text | undefined
 *   readTextPending(_KDB, id)     -> clone of the pending edit | undefined
 *   ACTION_TYPES                  -> the widgetText action type strings (same object as config/actionTypes.js)
 *
 * Writeback collectors and widgetBase `serializeWidgetFrame` read `(api.widgetText.getState() || {}).byId[widgetId]`
 * today: `readTextRecord` is that read for one widget without cloning the whole subtree per widget, `readTextById`
 * is the bulk form. After destroy the subtree is reset, so both return the same empty results as getState() does.
 */
define(["../../../core/utils/kit/data.js", "./config/actionTypes.js"], function (_data, _actionTypes) {
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

  function readTextById(_KDB) {
    var state = readTextRoot(_KDB);
    return _data.cloneJson(state && state.byId ? state.byId : {});
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
    ACTION_TYPES: _actionTypes,
    readWidgetTextState: readWidgetTextState,
    readTextById: readTextById,
    readTextRecord: readTextRecord,
    readTextContent: readTextContent,
    readTextPending: readTextPending
  };
});
