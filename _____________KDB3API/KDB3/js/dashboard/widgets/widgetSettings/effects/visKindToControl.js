define([
  "../config/intentDispatchMap.js"
], function (_intentDispatchMap) {
  "use strict";

  const KIND_TO_CONTROL = {
    dimension: "dimension",
    visualization: "visType",
    topN: "topNChoice",
    showValues: "showValues",
    grouping: "grouping",
    iterator: "iterator",
    zoom: "zoom",
    valueCaption: "valueCaption"
  };

  function isWidgetVisKind(_kind) {
    const normalized = _intentDispatchMap.normalizeKind(_kind);
    return normalized === "dimension" || normalized === "visualization" || normalized === "topN" || normalized === "showValues" || normalized === "grouping" || normalized === "iterator" || normalized === "zoom" || normalized === "valueCaption";
  }

  function kindToControl(_kind) {
    const normalized = _intentDispatchMap.normalizeKind(_kind);
    return KIND_TO_CONTROL[normalized] || null;
  }

  return {
    isWidgetVisKind: isWidgetVisKind,
    kindToControl: kindToControl
  };
});
