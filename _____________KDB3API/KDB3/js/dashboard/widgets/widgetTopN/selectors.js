define(["../../../core/utils/kit/data.js"], function (_data) {
  "use strict";

  function readTopNState(_KDB) {
    return _KDB && _KDB.state && _KDB.state.widgets ? _KDB.state.widgets.topN : undefined;
  }

  function readWidgetTopNState(_KDB) {
    return _data.cloneJson(readTopNState(_KDB));
  }

  function readOwnerClaim(_KDB, _ownerVisId) {
    var state = readTopNState(_KDB);
    var record = state && state.byOwner ? state.byOwner[_ownerVisId] : null;
    return {
      helperWidgetId: record && record.helperWidgetId || null,
      claimToken: record && record.claimToken || null
    };
  }

  function isHelperClaimedByOtherOwner(_KDB, _ownerVisId, _helperWidgetId) {
    var state = readTopNState(_KDB);
    var byOwner = state && state.byOwner ? state.byOwner : {};
    return Object.keys(byOwner).some(function (otherOwnerId) {
      var record = byOwner[otherOwnerId];
      return otherOwnerId !== _ownerVisId && !!record && record.helperWidgetId === _helperWidgetId && !!record.claimToken;
    });
  }

  return {
    readWidgetTopNState: readWidgetTopNState,
    readOwnerClaim: readOwnerClaim,
    isHelperClaimedByOtherOwner: isHelperClaimedByOtherOwner
  };
});
