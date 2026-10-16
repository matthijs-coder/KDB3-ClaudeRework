define([
  "./guardTabMutation.js",
  "./buildTabMutationTransfers.js",
  "./applyTabMutationWrites.js",
  "../reconcileFilterInstances.js",
  "../../hostFilterIo.js",
  "../../config.js"
], function (_support, _buildTransfers, _writes, _reconcile, _hostFilterIo, _config) {
  "use strict";

  function selectionToHostValues(_selection) {
    if (!_selection || !_selection.useValue) { return []; }
    return [{ d: _selection.displayValue, u: _selection.useValue }];
  }

  function cloneSelection(_selection) {
    return _selection ? Object.assign({}, _selection) : null;
  }

  function applyOverlay(_root, _targetId, _captured) {
    var target = _root.instancesById && _root.instancesById[_targetId];
    if (!target) { return; }
    target.currentSelection = cloneSelection(_captured.currentSelection);
    target.backupSelection = cloneSelection(_captured.backupSelection);
    target.pendingSelection = cloneSelection(_captured.pendingSelection);
  }

  function captureCommittedSelections(_instances, _targets, _slots, _diagnostics) {
    var captured = [];
    for (var s = 0; s < _slots.length; s += 1) {
      var resolved = _support.resolveScope(_instances, _targets, _slots[s]);
      if (resolved.status !== "ok") {
        _diagnostics.push(_writes.diagnostic(_config.errorCodes.SCOPE_TARGET_UNVERIFIED,
          "resync scope unverified for tabIdx " + _slots[s].tabIdx));
        continue;
      }
      var records = _support.instancesInScope(_instances, resolved.scopeId);
      for (var r = 0; r < records.length; r += 1) {
        captured.push({
          scopeId: resolved.scopeId,
          identity: records[r],
          currentSelection: cloneSelection(records[r].currentSelection),
          backupSelection: cloneSelection(records[r].backupSelection),
          pendingSelection: cloneSelection(records[r].pendingSelection)
        });
      }
    }
    return captured;
  }

  async function pushCapturedSelections(_KDB, _runtime, _captured, _diagnostics) {
    var root = _KDB.state.filters.singleSelect;
    for (var i = 0; i < _captured.length; i += 1) {
      var entry = _captured[i];
      var match = _support.matchTarget(root.instancesById || {}, entry.scopeId, entry.identity);
      if (match.status !== "ok") {
        _diagnostics.push(_writes.diagnostic(_config.errorCodes.TAB_MUTATION_APPLY_FAILED,
          "resync target instance " + match.status, entry.identity));
        continue;
      }
      var targetId = match.instance.filterInstanceId;
      var written = await _hostFilterIo.writeInstanceSelection(_KDB, _runtime, targetId,
        selectionToHostValues(entry.currentSelection));
      if (!written.ok) {
        _diagnostics.push(_writes.diagnostic(written.errorCode,
          "resync host write verification failed", match.instance));
        continue;
      }
      applyOverlay(root, targetId, entry);
    }
  }

  async function resyncTabMutationHost(_KDB, _runtime, _payload) {
    var payload = _payload || {};
    var diagnostics = [];
    try {
      var guard = _support.guardRun(_runtime, payload);
      if (guard) { return { ok: false, diagnostics: guard.diagnostics || [] }; }
      var work = _buildTransfers(payload.plan);
      var captured = captureCommittedSelections(
        _KDB.state.filters.singleSelect.instancesById || {},
        payload.tabIdxToScopeId || {},
        work.affectedSlots,
        diagnostics
      );
      if (captured.length > 0) {
        // The cognosSync traverse rebuilds the page controls, so the cached host
        // filter APIs are stale; reconcile refreshes them before the committed
        // selections (captured above, because reconcile adopts host values into
        // currentSelection) are re-pushed and overlaid back into state.
        var reconciled = await _reconcile(_KDB, _runtime,
          { reason: "tabMutation", runId: payload.runId });
        if (!reconciled.ok || _runtime.tabMutationRunId !== payload.runId) {
          diagnostics.push(_writes.diagnostic(_config.errorCodes.TAB_MUTATION_APPLY_FAILED,
            "resync reconcile failed or was superseded"));
          return { ok: false, operationId: payload.operationId, diagnostics: diagnostics };
        }
        // The traverse replaced the filter DOM; drop the cached popup refs so the
        // next popup interaction re-resolves against the live dock.
        if (_runtime.domRefs) {
          delete _runtime.domRefs.filterEl;
          delete _runtime.domRefs.popupMount;
          delete _runtime.domRefs.filterKey;
        }
        await pushCapturedSelections(_KDB, _runtime, captured, diagnostics);
      }
      return { ok: true, operationId: payload.operationId, diagnostics: diagnostics };
    } catch (error) {
      console.error("[singleSelect.resyncTabMutationHost] failed", { operationId: payload.operationId }, error);
      diagnostics.push(_writes.diagnostic(_config.errorCodes.TAB_MUTATION_APPLY_FAILED,
        String(error && error.message ? error.message : error)));
      return { ok: false, operationId: payload.operationId, diagnostics: diagnostics };
    }
  }

  return resyncTabMutationHost;
});
