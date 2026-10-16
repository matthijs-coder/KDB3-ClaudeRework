define([], function () {
  "use strict";

  // Owner in-flight registry (design doc section 3.6 point 1), same shape as
  // runtime.history.replay: set before the async host window, cleared in finally.

  function ensureMap(_runtime) {
    _runtime.inFlight = _runtime.inFlight || {};
    return _runtime.inFlight;
  }

  function begin(_runtime, _instanceId) {
    if (!_runtime || !_instanceId) {
      return;
    }
    ensureMap(_runtime)[String(_instanceId)] = {
      key: String(_instanceId),
      startedAt: Date.now()
    };
  }

  function end(_runtime, _instanceId) {
    if (!_runtime || !_instanceId || !_runtime.inFlight) {
      return;
    }
    delete _runtime.inFlight[String(_instanceId)];
  }

  function isActive(_runtime, _instanceId) {
    return !!(
      _runtime &&
      _runtime.inFlight &&
      _instanceId &&
      _runtime.inFlight[String(_instanceId)]
    );
  }

  function adopt(_runtime, _instancesById) {
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

  return {
    begin: begin,
    end: end,
    isActive: isActive,
    adopt: adopt
  };
});
