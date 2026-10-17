define([
  "./errorCodes.js",
  "./validate/validatePrimitives.js",
  "./validate/validateCoreFields.js",
  "./validate/validateChrome.js",
  "./validate/validateFilters.js",
  "./validate/validateTabsWidgets.js",
], function (_errorCodes, _primitives, _core, _chrome, _filters, _tabsWidgets) {
  "use strict";

  // validateV3 per contracts/writeback.md §2.4 / §4: composes the per-section
  // validators under schema/validate/. Returns { ok, diagnostics }; it never
  // throws on payload problems and never mutates its input. Expects normalizeV3
  // output but is defensive about raw input.
  function validateV3(v3) {
    const diagnostics = [];

    if (!v3 || typeof v3 !== "object" || Array.isArray(v3)) {
      _primitives.pushInvalid(diagnostics, "payload must be a plain object", { receivedType: Array.isArray(v3) ? "array" : typeof v3 });
      return result(diagnostics);
    }

    _core.validateFrame(v3, diagnostics);
    _core.validateCanv(v3.canv, diagnostics);
    _core.validateSett(v3.sett, diagnostics);
    _chrome.validateHead(v3.head, diagnostics);
    _chrome.validateFoot(v3.foot, diagnostics);
    _filters.validateFilt(v3.filt, diagnostics);
    _tabsWidgets.validateTabs(v3.tabs, diagnostics);
    _tabsWidgets.validateWgts(v3.wgts, v3.tabs, diagnostics);

    return result(diagnostics);
  }

  // WRITEBACK_WIDGET_KIND_UNSUPPORTED and WRITEBACK_HEADER_FIELD_UNSUPPORTED are
  // diagnostic-tolerant per §4.5.1/§4.6: the payload stays valid, restore skips
  // the affected object and the RestoreResult becomes "degraded" at best.
  function result(diagnostics) {
    const blocking = diagnostics.filter(function (diagnostic) {
      return diagnostic.code === _errorCodes.codes.WRITEBACK_INVALID_V3_PAYLOAD
        || diagnostic.code === _errorCodes.codes.WRITEBACK_UNSUPPORTED_SCHEMA_VERSION;
    });
    return { ok: blocking.length === 0, diagnostics: diagnostics };
  }

  return validateV3;
});
