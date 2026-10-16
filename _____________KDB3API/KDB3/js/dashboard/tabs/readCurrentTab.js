define([
  "../../core/utils/readCurrentTab.js",
  "./chrome.js"
], function (_readCurrentTabUtil, _chrome) {
  "use strict";

  // api.tabs.readCurrentTab(root) -> { index, id }: the selected tab from the Cognos chrome and the tabs facet.
  const NO_TAB = Object.freeze({ index: -1, id: null });

  function createReader(_runtime) {
    return function readCurrentTab(_root) {
      return _readCurrentTabUtil({
        tabsFacet: _runtime.tabsFacet,
        chromeReaders: { readSelectedTabIndex: _chrome.readSelectedTabIndexFromChrome }
      }, _root);
    };
  }

  // Compatibility for callers of _KDB.utils.readCurrentTab (filterDock identity) until they move to api.tabs:
  // while tabs is mounted the util answers through the tabs reader; destroy puts the saved util back, unless
  // another owner replaced it in the meantime.
  function bindUtilsCompat(_KDB, _runtime, _reader) {
    const utils = _KDB.utils;
    if (!utils || typeof utils.readCurrentTab !== "function") { return; }
    if (!_runtime.readCurrentTabUnbound) { _runtime.readCurrentTabUnbound = utils.readCurrentTab; }
    utils.readCurrentTab = function boundReadCurrentTab(_root) { return _reader(_root); };
    _runtime.readCurrentTabBound = utils.readCurrentTab;
  }

  function restoreUtilsCompat(_KDB, _runtime) {
    const utils = _KDB.utils;
    if (utils && _runtime.readCurrentTabUnbound && utils.readCurrentTab === _runtime.readCurrentTabBound) {
      utils.readCurrentTab = _runtime.readCurrentTabUnbound;
    }
    _runtime.readCurrentTabUnbound = null;
    _runtime.readCurrentTabBound = null;
  }

  return { NO_TAB: NO_TAB, createReader: createReader, bindUtilsCompat: bindUtilsCompat, restoreUtilsCompat: restoreUtilsCompat };
});
