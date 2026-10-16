define([
  "../config/intentDispatchMap.js"
], function (_intentDispatchMap) {
  function resolveCanonicalVisOptionValue(_planned) {
    const planned = _planned || {};
    const kind = _intentDispatchMap.normalizeKind(planned.kind);
    const raw = planned.optionValue != null && planned.optionValue !== ""
      ? planned.optionValue
      : planned.optionKey;
    const token = String(raw).toLowerCase();
    if (kind === "topN" && planned.optionKey) {
      return planned.optionKey;
    }
    if (kind === "showValues" || kind === "iterator" || kind === "zoom" || kind === "valueCaption") {
      if (token === "on" || token === "true" || token === "iter-on" || token === "zoom-on" || token === "vcap-on") {
        return true;
      }
      if (token === "off" || token === "false" || token === "iter-off" || token === "zoom-off" || token === "vcap-off") {
        return false;
      }
      if (token === "inherit" || token === "iter-inherit" || token === "zoom-inherit" || token === "vcap-inherit") {
        return "inherit";
      }
    }
    return planned.optionValue;
  }

  return resolveCanonicalVisOptionValue;
});
