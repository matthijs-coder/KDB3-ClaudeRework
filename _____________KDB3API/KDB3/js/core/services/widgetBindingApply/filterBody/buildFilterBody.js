define([
  "./operatorBodies.js",
], function (_operatorBodies) {
  "use strict";

  var SIMPLE_MODES = { forceempty: true, hierarchykeepexclude: true, include: true, reverse: true };

  function parseFilterDescriptor(_descriptor) {
    var descriptor = _descriptor || {};
    return {
      mode: _operatorBodies.toTrimmedString(descriptor.mode).toLowerCase(),
      itemId: _operatorBodies.toTrimmedString(descriptor.itemId),
      options: descriptor.options && typeof descriptor.options === "object" ? descriptor.options : {},
      values: _operatorBodies.toValueArray(descriptor.values),
    };
  }

  function missingFilterItemIdError() {
    return {
      ok: false,
      errorCode: "WIDGET_BINDING_APPLY_LOCAL_FILTER_FAILED",
      errorMessage: "Filter descriptor missing itemId.",
    };
  }

  function buildForceEmptyBody(_parsed) {
    if (!_parsed.itemId || _parsed.values.length === 0) {
      return {
        ok: false,
        errorCode: "WIDGET_BINDING_APPLY_FORCE_EMPTY_FILTER_INVALID",
        errorMessage: "forceEmpty descriptor requires itemId and values.",
      };
    }
    return { ok: true, body: { values: _parsed.values.slice() } };
  }

  function buildHierarchyKeepexcludeBody(_parsed) {
    if (!_parsed.itemId || _parsed.values.length === 0) {
      return {
        ok: false,
        errorCode: "WIDGET_BINDING_APPLY_LOCAL_FILTER_FAILED",
        errorMessage: "hierarchyKeepexclude requires itemId and values.",
      };
    }
    return {
      ok: true,
      body: {
        exclude: false,
        values: _parsed.values.slice(),
        overrideHierarchyDefaultSelection: _parsed.options.overrideHierarchyDefaultSelection !== false,
        action: _parsed.options.action || "keepexclude",
      },
    };
  }

  function buildReverseBody(_parsed, _buildKeepexclude) {
    var reverseBody = { values: _parsed.values.slice(), reverse: true };
    if (typeof _buildKeepexclude !== "function") {
      return {
        ok: true,
        body: reverseBody,
        warning: {
          code: "WIDGET_BINDING_APPLY_REVERSE_FILTER_BODY_COMPAT",
          message: "reverse filter applied without keepexclude wrapper.",
        },
      };
    }
    return { ok: true, body: reverseBody };
  }

  function buildSimpleFilterBody(_parsed, _buildKeepexclude) {
    if (_parsed.mode === "forceempty") {
      return buildForceEmptyBody(_parsed);
    }
    if (_parsed.mode === "hierarchykeepexclude") {
      return buildHierarchyKeepexcludeBody(_parsed);
    }
    if (!_parsed.itemId) {
      return missingFilterItemIdError();
    }
    if (!_parsed.values.length) {
      return { ok: true, body: null };
    }
    if (_parsed.mode === "include") {
      return { ok: true, body: { values: _parsed.values.slice() } };
    }
    return buildReverseBody(_parsed, _buildKeepexclude);
  }

  // Outcome: { ok: true, body (null = nothing to apply), warning? } or { ok: false, errorCode, errorMessage }.
  function buildFilterBody(_descriptor, _buildKeepexclude) {
    var parsed = parseFilterDescriptor(_descriptor);
    var outcome = SIMPLE_MODES[parsed.mode]
      ? buildSimpleFilterBody(parsed, _buildKeepexclude)
      : _operatorBodies.buildOperatorFilterBody(parsed, _buildKeepexclude, missingFilterItemIdError);
    if (outcome) {
      return outcome;
    }
    return {
      ok: false,
      errorCode: "WIDGET_BINDING_APPLY_UNKNOWN_FILTER_MODE",
      errorMessage: "Unknown filter mode: " + parsed.mode,
    };
  }

  return buildFilterBody;
});
