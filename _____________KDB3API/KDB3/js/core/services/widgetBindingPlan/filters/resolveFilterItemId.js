define([], function () {
  "use strict";

  function __controller(_key, _parameterMappingObj) {
    var key = typeof _key === "string" ? _key.trim() : "";
    if (!key) {
      return { ok: false, errorCode: "WIDGET_BINDING_PLAN_FILTER_PARAM_MAP", legacyError: "missingParameterMapping", key: key };
    }
    if (key.charAt(0) === "[") {
      return { ok: true, itemId: key };
    }
    var parameterMappingObj = _parameterMappingObj && typeof _parameterMappingObj === "object" ? _parameterMappingObj : {};
    var mapKey = key + "_widget_localfilter_KID";
    var itemId = parameterMappingObj[mapKey];
    if (typeof itemId === "string" && itemId.trim()) {
      return { ok: true, itemId: itemId.trim(), mapKey: mapKey };
    }
    return {
      ok: false,
      errorCode: "WIDGET_BINDING_PLAN_FILTER_PARAM_MAP",
      legacyError: "missingParameterMapping",
      key: key,
      mapKey: mapKey,
    };
  }

  return __controller;
});
