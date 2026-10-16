define([
  "./commitSelectionState.js",
  "./notifyOwnerAfterCommit.js",
  "./pushSingleSelectHistory.js",
  "./lookupLiveFilterState.js",
  "../config.js",
  "../../../widgets/widgetVis/actions/runTopNFilterConfirmWave.js"
], function (
  _commitSelectionState,
  _notifyOwnerAfterCommit,
  _pushSingleSelectHistory,
  _lookupLiveFilterState,
  _config,
  _runTopNFilterConfirmWave
) {
  "use strict";

  async function __controller(_KDB, _handoff, _filterState, _previous, _next) {
    try {
      var notifyResult = await _notifyOwnerAfterCommit.notifyOwnerCommit(_KDB, _handoff, _next);
      if (!notifyResult.ok) {
        var notifyError = new Error(notifyResult.message || "owner notification failed");
        notifyError.code = notifyResult.code || _config.errorCodes.OWNER_SELECTION_INVALID;
        throw notifyError;
      }
      // Re-lookup after the owner-sync await (specialSingleSelect can wait on
      // the host). applyConfirmedState must hit the live instance, not the
      // object captured before that wait (contract section 11, M4).
      _commitSelectionState.applyConfirmedState(
        _lookupLiveFilterState(_KDB, _handoff, _filterState),
        _KDB.state.filters.singleSelect,
        _next
      );
      _pushSingleSelectHistory.pushGenericHistory(_KDB, _handoff, _previous, _next);
      startTopNWave(_KDB, _handoff);
      return true;
    } catch (error) {
      console.error("[singleSelect.finalizeConfirmedCommit] failed", {
        filterInstanceId: _handoff && _handoff.filterInstanceId
      }, error);
      throw error;
    }
  }

  function startTopNWave(_KDB, _handoff) {
    var handoff = _handoff || {};
    if (handoff.filterType === "sicht") {
      return;
    }
    if (handoff.filterScope !== "global" && !handoff.tabId) {
      return;
    }
    try {
      Promise.resolve(_runTopNFilterConfirmWave(_KDB, {
        scopeType: handoff.filterScope === "global" ? "global" : "pageContext",
        tabId: handoff.tabId || null,
        isJahr: false,
        filterType: handoff.filterType
      })).then(null, logTopNWave);
    } catch (err) {
      logTopNWave(err);
    }
  }

  function logTopNWave(_err) {
    console.error("[singleSelect.finalizeConfirmedCommit] topN wave failed", _err);
  }

  return __controller;
});
