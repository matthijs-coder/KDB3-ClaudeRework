define([
  "./v3Defaults.js",
  "./errorCodes.js",
  "./normalize/normalizeCoreFields.js",
  "./normalize/normalizeFilters.js",
  "./normalize/normalizeTabsWidgets.js",
], function (_v3Defaults, _errorCodes, _core, _normalizeFilt, _tabsWidgets) {
  "use strict";

  // normalizeV3 per contracts/writeback.md §2.4 / §4.7: composes the
  // per-section normalizers under schema/normalize/. Owns default omission,
  // sentinel conversion and field ordering. It never mutates its input and
  // never mutates _KDB state.
  //
  // It does NOT silently repair invalid structures: unknown keys and wrong
  // types are preserved (canonicalized where safe) so that validateV3 can
  // reject them with precise diagnostics.
  //
  // context (optional): { diagnostics: [] } collector for normalize notices.
  function normalizeV3(input, context) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw _errorCodes.createWritebackError(
        _errorCodes.codes.WRITEBACK_SCHEMA_NORMALIZE_FAILED,
        "validate",
        "normalizeV3 expects a plain v3 object",
        { receivedType: Array.isArray(input) ? "array" : typeof input }
      );
    }
    const diagnostics = context && Array.isArray(context.diagnostics) ? context.diagnostics : null;
    const output = {};

    if (input.v !== undefined) {
      output.v = input.v;
    }
    if (typeof input.pkg === "string") {
      const pkg = input.pkg.trim();
      if (pkg !== "") {
        output.pkg = pkg;
      }
    } else if (input.pkg !== undefined && input.pkg !== null) {
      output.pkg = input.pkg; // wrong type preserved for validateV3
    }

    assignWhenPresent(output, "canv", _core.normalizeCanv(input.canv));
    assignWhenPresent(output, "sett", _core.normalizeSett(input.sett));
    assignWhenPresent(output, "head", _core.normalizeHeaderLike(input.head, ["on", "subOn"]));
    assignWhenPresent(output, "foot", _core.normalizeHeaderLike(input.foot, ["on"]));
    assignWhenPresent(output, "filt", _normalizeFilt(input.filt, diagnostics));
    assignWhenPresent(output, "tabs", _tabsWidgets.normalizeTabs(input.tabs));
    assignWhenPresent(output, "wgts", _tabsWidgets.normalizeWgts(input.wgts));

    // Preserve unknown top-level keys so validateV3 rejects them explicitly.
    Object.keys(input).forEach(function (key) {
      if (_v3Defaults.TOP_LEVEL_FIELD_ORDER.indexOf(key) === -1) {
        output[key] = input[key];
      }
    });

    return orderTopLevel(output);
  }

  function assignWhenPresent(output, key, value) {
    if (value !== null) {
      output[key] = value;
    }
  }

  function orderTopLevel(unordered) {
    const ordered = {};
    _v3Defaults.TOP_LEVEL_FIELD_ORDER.forEach(function (key) {
      if (unordered[key] !== undefined) {
        ordered[key] = unordered[key];
      }
    });
    Object.keys(unordered).forEach(function (key) {
      if (ordered[key] === undefined && unordered[key] !== undefined) {
        ordered[key] = unordered[key];
      }
    });
    return ordered;
  }

  return normalizeV3;
});
