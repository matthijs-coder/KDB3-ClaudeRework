define([], function () {
  "use strict";

  function normalizeValues(_values) {
    var source = Array.isArray(_values) ? _values : [];
    var result = [];
    for (var index = 0; index < source.length; index += 1) {
      var normalized = normalizeValueEntry(source[index]);
      if (normalized) {
        result.push(normalized);
      }
    }
    return result;
  }

  function normalizeValueEntry(entry) {
    var display;
    var use;
    if (entry == null) {
      return null;
    }
    if (typeof entry !== "object" || Array.isArray(entry)) {
      if (String(entry).trim() === "") {
        return null;
      }
      return { d: entry, u: entry };
    }
    display = firstDefined(entry.d, entry.display, entry.displayValue, entry.label, entry.caption);
    use = firstDefined(entry.u, entry.use, entry.useValue, entry.value, entry.v);
    if (display == null && use == null) {
      return null;
    }
    if (display == null) {
      display = use;
    }
    if (use == null) {
      use = display;
    }
    if (!String(display).trim() && !String(use).trim()) {
      return null;
    }
    return { d: display, u: use };
  }

  function firstDefined() {
    var index = 0;
    while (index < arguments.length) {
      if (arguments[index] !== undefined && arguments[index] !== null) {
        return arguments[index];
      }
      index += 1;
    }
    return null;
  }

  function __controller(_spec, _parsedTopN) {
    var parsedTopN = _parsedTopN || { kind: "default" };
    if (parsedTopN.kind === "default") {
      return { ok: true, descriptor: null };
    }
    if (parsedTopN.kind === "unknown") {
      return {
        ok: false,
        errorCode: "WIDGET_BINDING_PLAN_TOPN_UNKNOWN",
        legacyError: "unknownTopNValue",
      };
    }
    if (_spec && _spec.targetKind === "topNHelper") {
      return { ok: true, descriptor: null, topNResultDeferred: true };
    }

    var helperResult = _spec.helperTableResult;
    if (!helperResult) {
      return {
        ok: false,
        errorCode: "WIDGET_BINDING_PLAN_TOPN_HELPER_MISSING",
        legacyError: "missingTopNHelperResult",
      };
    }
    if (helperResult.ok === false) {
      return {
        ok: false,
        errorCode: "WIDGET_BINDING_PLAN_TOPN_HELPER_FAILED",
        legacyError: helperResult.error || "topNHelperFailed",
      };
    }

    var values = normalizeValues(helperResult.topNResultValues);
    var itemId = helperResult.topNExcludeItemId;
    if (!values.length || !itemId) {
      return {
        ok: false,
        errorCode: "WIDGET_BINDING_PLAN_TOPN_HELPER_MISSING",
        legacyError: "missingTopNHelperResult",
      };
    }

    return {
      ok: true,
      descriptor: {
        kind: "topN",
        mode: "include",
        itemId: String(itemId),
        values: values,
        options: {
          source: "helperTable",
          n: parsedTopN.n,
        },
      },
      topNResultValues: values.slice(),
      topNExcludeItemId: String(itemId),
    };
  }

  return __controller;
});
