define([
  "./actions/handleParameterSetBinding.js",
  "./actions/handleParameterSetCancelBindings.js"
], function (_handleParameterSetBinding, _handleParameterSetCancelBindings) {
  "use strict";

  return {
    handleParameterSetBinding: _handleParameterSetBinding,
    handleParameterSetCancelBindings: _handleParameterSetCancelBindings
  };
});
