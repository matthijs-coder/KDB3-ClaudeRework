define([], function () {
  "use strict";

  function readOwnerVisId(_action) {
    var payload = _action && _action.payload ? _action.payload : {};
    return _action && _action.widgetId || payload.ownerVisId || null;
  }

  function hasOwnerIdConflict(_action) {
    var payload = _action && _action.payload ? _action.payload : {};
    var envelopeId = _action && _action.widgetId;
    return !!(envelopeId && payload.ownerVisId && payload.ownerVisId !== envelopeId);
  }

  function ownerIdConflictResult() {
    return { ok: false, status: "error", errorCode: "WIDGET_TOPN_OWNER_ID_CONFLICT" };
  }

  return {
    readOwnerVisId: readOwnerVisId,
    hasOwnerIdConflict: hasOwnerIdConflict,
    ownerIdConflictResult: ownerIdConflictResult
  };
});
