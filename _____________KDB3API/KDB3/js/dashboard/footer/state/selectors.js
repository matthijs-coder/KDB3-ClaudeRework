define(["../../header/state/selectors.js", "../../tabs/selectors.js"], function (_headerSelectors, _tabsSelectors) {
  "use strict";
  function readFooterStatus(_KDB) {
    var f = _KDB && _KDB.state && _KDB.state.footer;
    return (f && f.status) || "idle";
  }
  return {
    readFooterStatus: readFooterStatus,
    readHeaderStatus: _headerSelectors.readHeaderStatus,
    readHeaderTitleText: _headerSelectors.readHeaderTitleText,
    readActiveTabIndex: _tabsSelectors.readActiveTabIndex,
  };
});
