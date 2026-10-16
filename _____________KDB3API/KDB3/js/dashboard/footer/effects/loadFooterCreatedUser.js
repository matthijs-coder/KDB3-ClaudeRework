define(["./readDashboardFacet.js"], function (_readDashboardFacet) {
  "use strict";

  function dispatchApplyCreatedUser(_KDB, _userName) {
    try {
      _KDB.api.footer.dispatch({
        type: "footer/applyCreatedUser",
        payload: { source: "bootstrap", userName: _userName }
      });
    } catch (err) {
      console.error("[footer.dispatchApplyCreatedUser]", err);
    }
  }

  function loadFooterCreatedUser(_KDB) {
    try {
      var current = _KDB && _KDB.state && _KDB.state.footer && _KDB.state.footer.createdUserName;
      var facet;
      var outcome;
      var userName;
      if (typeof current === "string" && current) return;
      facet = _readDashboardFacet(_KDB);
      if (!facet || typeof facet.getUserName !== "function") {
        dispatchApplyCreatedUser(_KDB, null);
        return;
      }
      outcome = facet.getUserName();
      userName =
        outcome && outcome.ok === true && typeof outcome.data === "string"
          ? String(outcome.data).trim()
          : "";
      if (userName) dispatchApplyCreatedUser(_KDB, userName);
      else dispatchApplyCreatedUser(_KDB, null);
    } catch (err) {
      console.error("[footer.loadFooterCreatedUser]", err);
    }
  }

  return { loadFooterCreatedUser: loadFooterCreatedUser };
});
