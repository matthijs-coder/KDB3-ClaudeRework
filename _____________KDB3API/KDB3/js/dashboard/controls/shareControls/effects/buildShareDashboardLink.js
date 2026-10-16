define([
  "../config/shareLinkHashKeys.js",
  "../config/shareReadOnlyToken.js"
], function (_shareLinkHashKeys, _shareReadOnlyToken) {
  "use strict";

  function readNonEmptyLabel(_label, _emptyParameterLabel) {
    if (_label == null) return _emptyParameterLabel;
    var text = String(_label);
    return text.length > 0 ? text : _emptyParameterLabel;
  }

  function buildShareDashboardLink(_input) {
    var input = _input || {};
    var params = new URLSearchParams();
    var keys = _shareLinkHashKeys || {};
    params.set("perspective", keys.perspective);
    params.set("action", keys.action);
    params.set("mode", keys.mode);
    params.set("id", input.boardId);
    params.set("objRef", input.boardId);
    if (input.id != null) params.set("parameterId", String(input.id));
    params.set("parameterLabel", readNonEmptyLabel(input.label, input.emptyParameterLabel));
    if (input.isKdbReadOnly === true) {
      params.set(_shareReadOnlyToken.TOKEN_KEY, _shareReadOnlyToken.TOKEN_VALUE);
    }
    return String(input.biBase || "") + "#" + params.toString();
  }

  return buildShareDashboardLink;
});
