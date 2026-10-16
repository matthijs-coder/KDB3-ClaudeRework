define([
  "./filterBodyHelpers.js",
], function (_filterBodyHelpers) {
  "use strict";

  function __controller(_descriptor, _cognosBinding) {
    try {
      var parsed = _filterBodyHelpers.parseFilterDescriptor(_descriptor);
      var hasKeepexcludeBuilder =
        _cognosBinding && typeof _cognosBinding.buildKeepexcludeConditionsFilterObj === "function";
      var reverseBody;

      if (parsed.mode === "forceempty") {
        if (!parsed.itemId || parsed.values.length === 0) {
          return {
            ok: false,
            errorCode: "WIDGET_BINDING_APPLY_FORCE_EMPTY_FILTER_INVALID",
            errorMessage: "forceEmpty descriptor requires itemId and values.",
          };
        }
        return { ok: true, body: { values: parsed.values.slice() } };
      }

      if (parsed.mode === "hierarchykeepexclude") {
        if (!parsed.itemId || parsed.values.length === 0) {
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
            values: parsed.values.slice(),
            overrideHierarchyDefaultSelection: parsed.options.overrideHierarchyDefaultSelection !== false,
            action: parsed.options.action || "keepexclude",
          },
        };
      }

      if (!parsed.itemId) {
        return _filterBodyHelpers.missingFilterItemIdError();
      }

      if (parsed.mode === "include") {
        if (!parsed.values.length) {
          return { ok: true, body: null };
        }
        return { ok: true, body: { values: parsed.values.slice() } };
      }

      if (parsed.mode === "reverse") {
        if (!parsed.values.length) {
          return { ok: true, body: null };
        }
        reverseBody = { values: parsed.values.slice(), reverse: true };
        if (!hasKeepexcludeBuilder) {
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

      return null;
    } catch (err) {
      console.error("[widgetBindingApply.buildSimpleFilterBody] failed", { mode: _descriptor && _descriptor.mode }, err);
      throw err;
    }
  }

  return __controller;
});
