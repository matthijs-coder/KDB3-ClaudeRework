define([], function () {
  "use strict";
  function dimensionToCssPx(amount, unit) {
    var u = String(unit || "").toLowerCase();
    if (u === "px") return amount;
    if (u === "mm") return amount * (96 / 25.4);
    if (u === "cm") return amount * 10 * (96 / 25.4);
    return NaN;
  }
  function formatAmount(n) {
    if (!isFinite(n) || n < 0) return null;
    var rounded = Math.round(n * 1e6) / 1e6;
    if (Math.abs(rounded - Math.round(rounded)) < 1e-9) return String(Math.round(rounded));
    var s = String(rounded);
    if (s.indexOf("e") >= 0) return s;
    return s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  }
  function parseDimensionLength(raw) {
    var s0 = raw == null ? "" : String(raw);
    var s = s0.trim();
    if (!s.length) {
      return { ok: false, message: "Dimension is required (empty value is not allowed).", normalized: "" };
    }
    var m = s.match(/^\s*(\d+(?:\.\d+)?)\s*(mm|cm|px)\s*$/i);
    if (!m) {
      if (/^\s*\d/.test(s) && !/\s*(mm|cm|px)\s*$/i.test(s)) {
        return {
          ok: false,
          message: "Invalid dimension: a unit is required. Use mm, cm, or px (e.g. 200mm, 10cm, 800px).",
          normalized: "",
        };
      }
      return {
        ok: false,
        message: "Invalid dimension format. Allowed: <number>mm, <number>cm, or <number>px (spaces trimmed).",
        normalized: "",
      };
    }
    var amount = parseFloat(m[1]);
    var unitRaw = m[2];
    if (!isFinite(amount)) {
      return { ok: false, message: "Invalid dimension: number is not valid.", normalized: "" };
    }
    if (amount < 0) {
      return { ok: false, message: "Invalid dimension: negative values are not allowed.", normalized: "" };
    }
    if (amount === 0) {
      return { ok: false, message: "Invalid dimension: value must be greater than zero.", normalized: "" };
    }
    var unit = String(unitRaw).toLowerCase();
    var fa = formatAmount(amount);
    if (fa == null) {
      return { ok: false, message: "Invalid dimension: number is not valid.", normalized: "" };
    }
    var normalized = fa + unit;
    return { ok: true, normalized: normalized, amount: amount, unit: unit };
  }
  return {
    parseDimensionLength: parseDimensionLength,
    dimensionToCssPx: dimensionToCssPx,
  };
});
