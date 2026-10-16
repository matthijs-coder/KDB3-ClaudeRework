define([
  "../config/actionTypes.js",
  "./handleContentCreate.js",
  "./handleCommitTextEdit.js",
  "./handleApplyFontSize.js",
  "./handleApplyRestyle.js",
  "./handleApplyTitle.js",
  "./handleApplyReadableTextColor.js",
  "./handleCleanupContent.js",
  "./handleParameterSetReset.js",
  "./handleParameterSetRestore.js"
], function (
  _actionTypes,
  _handleContentCreate,
  _handleCommitTextEdit,
  _handleApplyFontSize,
  _handleApplyRestyle,
  _handleApplyTitle,
  _handleApplyReadableTextColor,
  _handleCleanupContent,
  _handleParameterSetReset,
  _handleParameterSetRestore
) {
  var ROUTE_MAP = {};
  ROUTE_MAP[_actionTypes.CONTENT_CREATE] = _handleContentCreate;
  ROUTE_MAP[_actionTypes.COMMIT_TEXT_EDIT] = _handleCommitTextEdit;
  ROUTE_MAP[_actionTypes.APPLY_FONT_SIZE] = _handleApplyFontSize;
  ROUTE_MAP[_actionTypes.APPLY_RESTYLE] = _handleApplyRestyle;
  ROUTE_MAP[_actionTypes.APPLY_TITLE] = _handleApplyTitle;
  ROUTE_MAP[_actionTypes.APPLY_READABLE_TEXT_COLOR] = _handleApplyReadableTextColor;
  ROUTE_MAP[_actionTypes.CLEANUP_CONTENT] = _handleCleanupContent;
  ROUTE_MAP[_actionTypes.PARAMETER_SET_RESET] = _handleParameterSetReset;
  ROUTE_MAP[_actionTypes.PARAMETER_SET_RESTORE] = _handleParameterSetRestore;

  function routeAction(_context, _action) {
    var handler = ROUTE_MAP[_action.type];
    if (!handler) {
      return Promise.resolve({
        ok: false,
        widgetId: _action.widgetId,
        errorCode: "WIDGET_TEXT_UNKNOWN_ACTION"
      });
    }
    return handler(_context, _action);
  }

  return {
    routeAction: routeAction
  };
});
