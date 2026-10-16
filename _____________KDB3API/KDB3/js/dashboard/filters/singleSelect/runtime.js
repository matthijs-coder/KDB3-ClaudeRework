define(["../../../core/utils/kit/runtime.js"], function (_kitRuntime) {
  "use strict";

  function ensureSingleSelectRuntime(_KDB) {
    return _kitRuntime.ensureRuntime(_KDB, "singleSelect", {
      inFlight: {},
      delegatedOperationIds: {},
      tabMutationSnapshots: {},
      inventoryOwnerNotifications: {}
    });
  }

  function resetSingleSelectRuntime(_runtime) {
    var errors = _kitRuntime.disposeRuntimeBuckets(_runtime);
    if (errors.length > 0) {
      console.error("[singleSelect.resetRuntime] releasing runtime entries failed", errors);
    }
    _runtime.inFlight = {};
    _runtime.filtersFacet = null;
    _runtime.delegatedOperationIds = {};
    _runtime.tabMutationSnapshots = {};
    _runtime.inventoryOwnerNotifications = {};
    delete _runtime.reconcileRunId;
    delete _runtime.parameterSetRunId;
    delete _runtime.tabMutationRunId;
    delete _runtime.tabMutationOperationId;
  }

  // Injected by the orchestrator onto runtime.filtersFacet. Deep files must not
  // look up _KDB.services.cognosHost themselves (contract §7).
  function readFiltersFacet(_KDB, _runtime) {
    if (_runtime && _runtime.filtersFacet) {
      return _runtime.filtersFacet;
    }
    var rt = _KDB && _KDB.runtime ? _KDB.runtime.singleSelect : null;
    return rt && rt.filtersFacet ? rt.filtersFacet : null;
  }

  // Owner in-flight registry (design doc section 3.6 point 1), same shape as
  // runtime.history.replay: set before the async host window, cleared in finally.
  function ensureInFlightMap(_runtime) {
    _runtime.inFlight = _runtime.inFlight || {};
    return _runtime.inFlight;
  }

  function beginInFlight(_runtime, _instanceId) {
    if (!_runtime || !_instanceId) {
      return;
    }
    ensureInFlightMap(_runtime)[String(_instanceId)] = {
      key: String(_instanceId),
      startedAt: Date.now()
    };
  }

  function endInFlight(_runtime, _instanceId) {
    if (!_runtime || !_instanceId || !_runtime.inFlight) {
      return;
    }
    delete _runtime.inFlight[String(_instanceId)];
  }

  function isInFlightActive(_runtime, _instanceId) {
    return !!(
      _runtime &&
      _runtime.inFlight &&
      _instanceId &&
      _runtime.inFlight[String(_instanceId)]
    );
  }

  function adoptInFlight(_runtime, _instancesById) {
    if (!_runtime || !_runtime.inFlight || !_instancesById) {
      return;
    }
    Object.keys(_runtime.inFlight).forEach(function (_id) {
      var rec = _instancesById[_id];
      if (rec && rec.selectionOwner === "singleSelect") {
        rec.isCommitInProgress = true;
      }
    });
  }

  function bumpInteractionSequence(_filterState) {
    var next = (_filterState.appliedInteractionSeq || 0) + 1;
    _filterState.appliedInteractionSeq = next;
    return next;
  }

  function markInteractionApplied(_filterState, _sequence) {
    if (!_filterState || !_sequence) {
      return;
    }
    _filterState.appliedInteractionSeq = Math.max(_filterState.appliedInteractionSeq || 0, _sequence);
  }

  function isStaleInteraction(_filterState, _sequence) {
    if (!_filterState || !_sequence) {
      return false;
    }
    return _sequence < (_filterState.appliedInteractionSeq || 0);
  }

  return {
    ensureSingleSelectRuntime: ensureSingleSelectRuntime,
    resetSingleSelectRuntime: resetSingleSelectRuntime,
    readFiltersFacet: readFiltersFacet,
    inFlight: {
      begin: beginInFlight,
      end: endInFlight,
      isActive: isInFlightActive,
      adopt: adoptInFlight
    },
    bumpInteractionSequence: bumpInteractionSequence,
    markInteractionApplied: markInteractionApplied,
    isStaleInteraction: isStaleInteraction
  };
});
