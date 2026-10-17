define([
  "../v3Defaults.js",
], function (_v3Defaults) {
  "use strict";

  // Normalization for canv, sett and the head/foot chrome nodes (§4.1/§4.2/§4.7).
  // Wrong types are preserved so validateV3 can reject them with diagnostics.

  function normalizeCanv(canv) {
    if (canv === undefined || canv === null) {
      return null;
    }
    if (!canv || typeof canv !== "object" || Array.isArray(canv)) {
      return canv; // wrong type preserved for validateV3
    }
    const normalized = {};
    Object.keys(canv).forEach(function (key) {
      if (!_v3Defaults.isOmissionSentinel(canv[key])) {
        normalized[key] = canv[key];
      }
    });
    return Object.keys(normalized).length === 0 ? null : normalized;
  }

  function normalizeSett(sett) {
    if (!sett || typeof sett !== "object" || Array.isArray(sett)) {
      return sett === undefined || sett === null ? null : sett;
    }
    const normalized = {};
    Object.keys(sett).forEach(function (groupKey) {
      const group = normalizeSettGroup(sett[groupKey]);
      if (group !== null) {
        normalized[groupKey] = group;
      }
    });
    return Object.keys(normalized).length === 0 ? null : normalized;
  }

  function normalizeSettGroup(group) {
    if (!group || typeof group !== "object" || Array.isArray(group)) {
      return group === undefined || group === null ? null : group;
    }
    const normalized = {};
    Object.keys(group).forEach(function (key) {
      const value = group[key];
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        const nested = normalizeSettGroup(value);
        if (nested !== null) {
          normalized[key] = nested;
        }
        return;
      }
      if (_v3Defaults.isOmissionSentinel(value)) {
        return;
      }
      normalized[key] = value === true ? 1 : value === false ? 0 : value;
    });
    return Object.keys(normalized).length === 0 ? null : normalized;
  }

  // head / foot normalization (§4.2 / §4.7): booleans -> 0/1, sentinel fields
  // omitted, empty object -> omit. Unknown keys are preserved for validateV3.
  function normalizeHeaderLike(section, flagKeys) {
    if (!section || typeof section !== "object" || Array.isArray(section)) {
      return section === undefined || section === null ? null : section;
    }
    const normalized = {};
    Object.keys(section).forEach(function (key) {
      let value = section[key];
      if (_v3Defaults.isOmissionSentinel(value)) {
        return;
      }
      if (flagKeys.indexOf(key) !== -1) {
        value = value === true ? 1 : value === false ? 0 : value;
      }
      normalized[key] = value;
    });
    return Object.keys(normalized).length === 0 ? null : normalized;
  }

  return Object.freeze({
    normalizeCanv: normalizeCanv,
    normalizeSett: normalizeSett,
    normalizeHeaderLike: normalizeHeaderLike,
  });
});
