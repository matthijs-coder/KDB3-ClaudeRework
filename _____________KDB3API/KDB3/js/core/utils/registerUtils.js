define([
  "./convertUnitToPx.js",
  "./getTableConfigObject.js",
  "./readCurrentTab.js",
  "./waitFor.js",
  "./waitForElObserver.js",
  "./readableTextColorForHex.js"
], function (
  _convertUnitToPx,
  _getTableConfigObject,
  _readCurrentTab,
  _waitFor,
  _waitForElObserver,
  _readableTextColorForHex
) {
  "use strict";

  function __orchestrator(_KDB) {
    _KDB.utils = _KDB.utils || {};
    _KDB.utils.convertUnitToPx = _convertUnitToPx;
    _KDB.utils.getTableConfigObject = _getTableConfigObject;
    _KDB.utils.readCurrentTab = _readCurrentTab;
    _KDB.utils.waitFor = _waitFor;
    _KDB.utils.waitForElObserver = _waitForElObserver;
    _KDB.utils.readableTextColorForHex = _readableTextColorForHex;
    return _KDB.utils;
  }

  return __orchestrator;
});
