define([
  "../v3Defaults.js",
  "../errorCodes.js",
  "./validatePrimitives.js",
], function (_v3Defaults, _errorCodes, _primitives) {
  "use strict";

  const pushInvalid = _primitives.pushInvalid;

  // Top-level frame (§2.4/§4): v, pkg, unknown fields.
  function validateFrame(v3, diagnostics) {
    if (v3.v !== _v3Defaults.SCHEMA_VERSION) {
      diagnostics.push(_errorCodes.makeDiagnostic(
        _errorCodes.codes.WRITEBACK_UNSUPPORTED_SCHEMA_VERSION,
        "validate",
        "v3 payload requires v === 3",
        { received: v3.v === undefined ? null : v3.v }
      ));
    }
    if (typeof v3.pkg !== "string" || v3.pkg.trim() === "") {
      pushInvalid(diagnostics, "pkg is required and must be a non-empty semantic package key", { received: v3.pkg === undefined ? null : v3.pkg });
    }
    Object.keys(v3).forEach(function (key) {
      if (_v3Defaults.TOP_LEVEL_FIELD_ORDER.indexOf(key) === -1) {
        pushInvalid(diagnostics, "unknown top-level field", { field: key });
      }
    });
  }

  // §4.1: canv is { w, h } in px; both keys required when canv is present.
  function validateCanv(canv, diagnostics) {
    if (canv === undefined) {
      return;
    }
    if (!canv || typeof canv !== "object" || Array.isArray(canv)) {
      pushInvalid(diagnostics, "canv must be a plain object { w, h }", { received: canv });
      return;
    }
    ["w", "h"].forEach(function (key) {
      if (typeof canv[key] !== "number" || !isFinite(canv[key])) {
        pushInvalid(diagnostics, "canv." + key + " must be a finite number", { received: canv[key] === undefined ? null : canv[key] });
      }
    });
    Object.keys(canv).forEach(function (key) {
      if (key !== "w" && key !== "h") {
        pushInvalid(diagnostics, "unknown canv field", { field: "canv." + key });
      }
    });
  }

  // §4.1.1: unknown sett keys are invalid.
  function validateSett(sett, diagnostics) {
    if (sett === undefined) {
      return;
    }
    if (!sett || typeof sett !== "object" || Array.isArray(sett)) {
      pushInvalid(diagnostics, "sett must be a plain object", { received: sett });
      return;
    }
    Object.keys(sett).forEach(function (groupKey) {
      const catalogGroup = _v3Defaults.SETT_KEY_CATALOG[groupKey];
      if (!catalogGroup) {
        pushInvalid(diagnostics, "unknown sett group", { field: "sett." + groupKey });
        return;
      }
      validateSettGroup(sett[groupKey], catalogGroup, "sett." + groupKey, diagnostics);
    });
  }

  function validateSettGroup(group, catalogGroup, path, diagnostics) {
    if (!group || typeof group !== "object" || Array.isArray(group)) {
      pushInvalid(diagnostics, "sett group must be a plain object", { field: path, received: group });
      return;
    }
    Object.keys(group).forEach(function (key) {
      const spec = catalogGroup[key];
      const value = group[key];
      if (!spec) {
        pushInvalid(diagnostics, "unknown sett key", { field: path + "." + key });
        return;
      }
      if (spec.ownerStatePath === undefined) {
        // nested group (sett.newwg.vis / sett.newwg.txt)
        validateSettGroup(value, spec, path + "." + key, diagnostics);
        return;
      }
      if (spec.type === "number" && (typeof value !== "number" || !isFinite(value))) {
        pushInvalid(diagnostics, "sett key must be a finite number", { field: path + "." + key, received: value });
      } else if (spec.type === "flag01" && value !== 0 && value !== 1) {
        pushInvalid(diagnostics, "sett flag must be 0 or 1", { field: path + "." + key, received: value });
      } else if (spec.type === "colour" && typeof value !== "string") {
        pushInvalid(diagnostics, "sett colour must be a string/token", { field: path + "." + key, received: value });
      }
    });
  }

  return Object.freeze({
    validateFrame: validateFrame,
    validateCanv: validateCanv,
    validateSett: validateSett,
  });
});
