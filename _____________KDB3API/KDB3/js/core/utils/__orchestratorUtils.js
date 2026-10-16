define([
  "./convertUnitToPx.js",
  "./getKennzahlenSource.js",
  "./getTableConfigObject.js",
  "./readCurrentTab.js",
  "./rewriteUniqueNameSourceToken.js",
  "./sleep.js",
  "./throttle.js",
  "./waitFor.js",
  "./waitForElObserver.js",
  "./readableTextColorForHex.js"
], function (
  _convertUnitToPx,
  _getKennzahlenSource,
  _getTableConfigObject,
  _readCurrentTab,
  _rewriteUniqueNameSourceToken,
  _sleep,
  _throttle,
  _waitFor,
  _waitForElObserver,
  _readableTextColorForHex
) {
  "use strict";

  function __orchestrator(_KDB) {
    try {
      _KDB.utils = _KDB.utils || {};
      _KDB.utils.convertUnitToPx = _convertUnitToPx;
      _KDB.utils.getKennzahlenSource = _getKennzahlenSource;
      _KDB.utils.getTableConfigObject = _getTableConfigObject;
      _KDB.utils.readCurrentTab = _readCurrentTab;
      _KDB.utils.rewriteUniqueNameSourceToken = _rewriteUniqueNameSourceToken.rewriteUniqueNameSourceToken;
      _KDB.utils.rewriteValueObjSourceToken = _rewriteUniqueNameSourceToken.rewriteValueObjSourceToken;
      _KDB.utils.rewriteValueArrSourceToken = _rewriteUniqueNameSourceToken.rewriteValueArrSourceToken;
      _KDB.utils.sleep = _sleep;
      _KDB.utils.throttle = _throttle;
      _KDB.utils.waitFor = _waitFor;
      _KDB.utils.waitForElObserver = _waitForElObserver;
      _KDB.utils.readableTextColorForHex = _readableTextColorForHex;
      return _KDB.utils;
    } catch (error) {
      console.error("[KDB][__orchestratorUtils] failed", error);
      throw error;
    }
  }

  return __orchestrator;
});
