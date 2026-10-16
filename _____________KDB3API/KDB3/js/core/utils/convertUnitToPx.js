define([], function () {
  "use strict";

  function convertUnitToPx(_value) {
    return convertUnitToPxNumber(_value);
  }

  const MM_TO_PX = 3.7795275591;
  const CM_TO_PX = 37.795275591;
  const DIMENSION_PATTERN = /^(\d+(?:\.\d+)?)(px|cm|mm)$/i;

  function convertUnitToPxNumber(_value) {
    if (typeof _value === "number" && isFinite(_value)) {
      return Math.round(_value);
    }
    if (typeof _value !== "string") {
      return null;
    }
    const trimmed = _value.trim();
    const dimMatch = trimmed.match(DIMENSION_PATTERN);
    if (dimMatch) {
      const numberValue = parseFloat(dimMatch[1]);
      const unit = dimMatch[2].toLowerCase();
      if (unit === "px") {
        return Math.round(numberValue);
      }
      if (unit === "cm") {
        return Math.round(numberValue * CM_TO_PX);
      }
      if (unit === "mm") {
        return Math.round(numberValue * MM_TO_PX);
      }
    }
    const asInt = parseInt(trimmed, 10);
    const tailUnit = trimmed.slice(-2).toLowerCase();
    if (tailUnit === "in" && isFinite(asInt)) {
      return Math.round(asInt * 96);
    }
    if (tailUnit === "pt" && isFinite(asInt)) {
      return Math.round(asInt * 1.3333);
    }
    console.warn("[convertUnitToPx]", "unknown unit in:", _value);
    return null;
  }

  return convertUnitToPx;
});
