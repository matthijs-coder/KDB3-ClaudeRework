define([], function () {
  "use strict";

  // waitFor: "widgetsRendered" support for tabs traverse: after a tab has
  // been activated, ask the widgets-owned readiness API to render that tab's
  // canvas widgets and wait (bounded) for completion. Non-fatal by design —
  // legacy parity (traverseTabsSafely): render failures degrade, they never
  // abort the traversal.
  async function awaitTabWidgetsRendered(_KDB, _tab) {
    var tabId = _tab && _tab.tabId ? _tab.tabId : null;
    var api = _KDB && _KDB.api ? _KDB.api.widgetBase : null;
    if (!tabId || !api || typeof api.dispatch !== "function") {
      return { ok: false, skipped: true };
    }
    try {
      var result = await api.dispatch({
        type: "widgetBase/renderTabWidgetsRequested",
        payload: { tabId: tabId, reason: "tabsTraverse" }
      });
      if (!result || result.ok !== true) {
        console.warn("[tabs.awaitTabWidgetsRendered] degraded render wait", tabId, result);
      }
      return result || { ok: false };
    } catch (err) {
      console.warn("[tabs.awaitTabWidgetsRendered] render wait failed", tabId, err);
      return { ok: false };
    }
  }

  return awaitTabWidgetsRendered;
});
