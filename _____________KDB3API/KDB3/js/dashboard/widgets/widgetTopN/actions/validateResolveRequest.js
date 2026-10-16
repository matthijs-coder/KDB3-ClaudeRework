define(["./validateOwnerVisId.js"], function (_validateOwnerVisId) {
  "use strict";

  function validateResolveRequest(_action) {
    var payload = _action && _action.payload ? _action.payload : {};
    var ownerVisId = _validateOwnerVisId.readOwnerVisId(_action);
    if (!ownerVisId || _validateOwnerVisId.hasOwnerIdConflict(_action)) {
      return _validateOwnerVisId.ownerIdConflictResult();
    }
    if (!payload || payload.topNChoice === undefined) {
      return { ok: false, ownerVisId: ownerVisId, status: "error", errorCode: "WIDGET_TOPN_INVALID_REQUEST" };
    }
    if (!isDefaultTopN(payload.topNChoice) && (!payload.dataConfig || !payload.config)) {
      return { ok: false, ownerVisId: ownerVisId, status: "error", errorCode: "WIDGET_TOPN_INVALID_REQUEST" };
    }
    return {
      ok: true,
      ownerVisId: ownerVisId,
      topNChoice: payload.topNChoice,
      jahrFilterValue: payload.jahrFilterValue || payload.yearFilterValue || null,
      monatFilterValue: payload.monatFilterValue || null,
      dataConfig: payload.dataConfig || {},
      hierarchySnapshot: payload.hierarchySnapshot || null,
      config: payload.config || {},
      source: payload.source || null,
      tabId: payload.tabId || null
    };
  }

  function isDefaultTopN(value) {
    var text = value === null || value === undefined ? "" : String(value).trim().toLowerCase();
    return text === "" || text === "default" || text === "none" || text === "0";
  }

  function readTopNOptions(config) {
    return config && config.topNOptions ? config.topNOptions : {};
  }

  function shouldSkipPostResolutionCleanup(config) {
    var options = readTopNOptions(config);
    return !!(
      config && config.preserveHelperBindingForInspection === true ||
      options.skipPostResolutionHelperCleanup === true ||
      options.preserveHelperBindingForInspection === true
    );
  }

  return {
    validateResolveRequest: validateResolveRequest,
    isDefaultTopN: isDefaultTopN,
    readTopNOptions: readTopNOptions,
    shouldSkipPostResolutionCleanup: shouldSkipPostResolutionCleanup
  };
});
