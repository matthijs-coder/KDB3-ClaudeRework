define([
  "./filterBodyHelpers.js",
  "./operatorFilterBodies.js",
], function (_filterBodyHelpers, _operatorFilterBodies) {
  "use strict";

  function __controller(_descriptor, _cognosBinding) {
    try {
      var parsed = _filterBodyHelpers.parseFilterDescriptor(_descriptor);
      var buildKeepexclude = _cognosBinding && _cognosBinding.buildKeepexcludeConditionsFilterObj;

      if (!parsed.itemId) {
        return _filterBodyHelpers.missingFilterItemIdError();
      }

      if (parsed.mode === "exclude") {
        return _operatorFilterBodies.buildExcludeBody(parsed, buildKeepexclude);
      }
      if (parsed.mode === "contains" || parsed.mode === "beginswith") {
        return _operatorFilterBodies.buildContainsOrBeginsWithBody(parsed, buildKeepexclude, parsed.mode);
      }
      if (parsed.mode === "includeexcludeor") {
        return _operatorFilterBodies.buildIncludeExcludeOrBody(parsed, buildKeepexclude);
      }

      return null;
    } catch (err) {
      console.error("[widgetBindingApply.buildOperatorFilterBody] failed", { mode: _descriptor && _descriptor.mode }, err);
      throw err;
    }
  }

  return __controller;
});
