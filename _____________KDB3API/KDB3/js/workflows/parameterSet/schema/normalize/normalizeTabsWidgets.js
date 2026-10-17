define([
  "../v3Defaults.js",
], function (_v3Defaults) {
  "use strict";

  // tabs and wgts object canonicalization (§4.4/§4.5.1/§4.7).
  // Every entry is a plain object; omitted key = owner default. Sentinel
  // values (null/""/"none" and legacy "default") normalize to key omission.

  function normalizeTabs(tabs) {
    if (!Array.isArray(tabs)) {
      return tabs === undefined || tabs === null ? null : tabs;
    }
    if (tabs.length === 0) {
      return null;
    }
    return tabs.map(function (entry) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return entry; // preserved for validateV3
      }
      const normalized = { name: entry.name };
      let hide = entry.hide;
      hide = hide === true ? 1 : hide === false ? 0 : hide;
      if (hide !== undefined && hide !== null && hide !== 0) {
        normalized.hide = hide; // default visible is omitted (§4.4)
      }
      Object.keys(entry).forEach(function (key) {
        if (key !== "name" && key !== "hide") {
          normalized[key] = entry[key];
        }
      });
      return normalized;
    });
  }

  function normalizeWgts(wgts) {
    if (!Array.isArray(wgts)) {
      return wgts === undefined || wgts === null ? null : wgts;
    }
    if (wgts.length === 0) {
      return null;
    }
    return wgts.map(normalizeWidget);
  }

  function normalizeWidget(widget) {
    if (!widget || typeof widget !== "object" || Array.isArray(widget)) {
      return widget; // preserved for validateV3
    }
    const fields = _v3Defaults.WIDGET_FIELDS[widget.kind];
    const normalized = {};
    Object.keys(widget).forEach(function (key) {
      let value = widget[key];
      const spec = fields ? fields[key] : null;
      const isOptional = spec ? spec.required !== true : false;
      if (key === "fsize" && typeof value === "string" && value.toLowerCase() === "automatic") {
        return; // owner default fontSize -> omit (§4.7)
      } else if (isOptional && isOmittableValue(value)) {
        return; // sentinel/legacy-default optional value -> omit (§4.5.1)
      }
      normalized[key] = value;
    });
    return normalized;
  }

  function isOmittableValue(value) {
    if (_v3Defaults.isOmissionSentinel(value)) {
      return true;
    }
    return typeof value === "string" && value.toLowerCase() === "default";
  }

  return Object.freeze({
    normalizeTabs: normalizeTabs,
    normalizeWgts: normalizeWgts,
  });
});
