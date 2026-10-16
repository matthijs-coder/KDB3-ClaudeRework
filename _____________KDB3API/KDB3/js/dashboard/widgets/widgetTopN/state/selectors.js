define(["./cloneSerializable.js"], function (_cloneSerializable) {
  "use strict";

  function readWidgetTopNState(_KDB) {
    return _cloneSerializable(readTopNState(_KDB));
  }

  function readTopNResolution(_KDB, _ownerVisId) {
    var state = readTopNState(_KDB);
    if (!state || !_ownerVisId || !state.byOwner[_ownerVisId]) {
      return undefined;
    }
    return _cloneSerializable(state.byOwner[_ownerVisId]);
  }

  function readTopNHelperWidgetId(_KDB, _ownerVisId) {
    var resolution = readTopNResolution(_KDB, _ownerVisId);
    return resolution && resolution.helperWidgetId ? resolution.helperWidgetId : null;
  }

  function readTopNStatus(_KDB, _ownerVisId) {
    var resolution = readTopNResolution(_KDB, _ownerVisId);
    return resolution ? resolution.resolutionStatus : undefined;
  }

  function readTopNState(_KDB) {
    return _KDB && _KDB.state && _KDB.state.widgets ? _KDB.state.widgets.topN : undefined;
  }

  return {
    readWidgetTopNState: readWidgetTopNState,
    readTopNResolution: readTopNResolution,
    readTopNHelperWidgetId: readTopNHelperWidgetId,
    readTopNStatus: readTopNStatus
  };
});
