define([
  "../../widgetSettings/config/selectors.js"
], function (_selectors) {
  function dispatchWidgetSettingsPlaceControls(_KDB, _request) {
    try {
      const api = _KDB && _KDB.api && _KDB.api.widgetSettings;
      const request = _request || {};
      const widgetId = request.widgetId;
      if (!api || typeof api.dispatch !== "function" || !widgetId) {
        return Promise.resolve(false);
      }
      const kind = request.kind;
      const widgetType = kind === "text" ? "text" : "live";
      const shellEl = request.shellEl;
      const payload = {
        widgetId: widgetId,
        widgetEl: shellEl,
        shellRoot: shellEl,
        widgetType: widgetType,
        kind: kind,
        layout: request.layout || null,
        dropRequest: request.dropRequest || null,
        kennzahlenTable: readKennzahlenTable(shellEl)
      };
      if (request.isHistoryReplay === true) {
        payload.isHistoryReplay = true;
      }
      if (request.source) {
        payload.source = request.source;
      }
      const action = {
        type: "widgetSettings/placeControls",
        widgetId: widgetId,
        payload: payload
      };
      return normalizeDispatchResult(api.dispatch(action), widgetId);
    } catch (err) {
      console.error("[widgetBase.dispatchWidgetSettingsPlaceControls] failed", err);
      return Promise.resolve(false);
    }
  }

  function normalizeDispatchResult(result, widgetId) {
    if (result && typeof result.then === "function") {
      return result.then(function (resolved) {
        return resolved && resolved.ok === true;
      }).catch(function (err) {
        console.error("[widgetBase.dispatchWidgetSettingsPlaceControls] failed", { widgetId: widgetId }, err);
        return false;
      });
    }
    return Promise.resolve(result && result.ok === true);
  }

  function readKennzahlenTable(shellEl) {
    try {
      if (!shellEl || !shellEl.getAttribute) {
        return "";
      }
      return shellEl.getAttribute(_selectors.kennzahlenTableAttr) || shellEl.getAttribute(_selectors.kennzahlenTableAttrAlt) || "";
    } catch (err) {
      console.error("[widgetBase.readKennzahlenTable] failed", err);
      return "";
    }
  }

  return dispatchWidgetSettingsPlaceControls;
});
