define([
  "./guard.js",
  "./transfers.js",
  "../inventory/reconcile.js",
  "../hostFilterIo.js",
  "../config.js",
  "../../_core/tabMutation.js"
], function (_support, _transfers, _reconcileInventory, _hostFilterIo, _config, _tabMutation) {
  "use strict";

  function selectionToHostValues(_selection) {
    if (!_selection || !_selection.useValue) { return []; }
    return [{ d: _selection.displayValue, u: _selection.useValue }];
  }

  function applyOverlay(_root, _targetId, _captured) {
    var target = _root.instancesById && _root.instancesById[_targetId];
    if (!target) { return; }
    target.currentSelection = _support.cloneSelection(_captured.currentSelection);
    target.backupSelection = _support.cloneSelection(_captured.backupSelection);
    target.pendingSelection = _support.cloneSelection(_captured.pendingSelection);
  }

  function captureCommittedSelections(_instances, _targets, _slots, _diagnostics) {
    var captured = [];
    for (var s = 0; s < _slots.length; s += 1) {
      var resolved = _support.resolveScope(_instances, _targets, _slots[s]);
      if (resolved.status !== "ok") {
        _diagnostics.push(_support.diagnostic(_config.errorCodes.SCOPE_TARGET_UNVERIFIED,
          "resync scope unverified for tabIdx " + _slots[s].tabIdx));
        continue;
      }
      var records = _support.instancesInScope(_instances, resolved.scopeId);
      for (var r = 0; r < records.length; r += 1) {
        captured.push({
          scopeId: resolved.scopeId,
          identity: records[r],
          currentSelection: _support.cloneSelection(records[r].currentSelection),
          backupSelection: _support.cloneSelection(records[r].backupSelection),
          pendingSelection: _support.cloneSelection(records[r].pendingSelection)
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
        _diagnostics.push(_support.diagnostic(_config.errorCodes.TAB_MUTATION_APPLY_FAILED,
          "resync target instance " + match.status, entry.identity));
        continue;
      }
      var targetId = match.instance.filterInstanceId;
      var written = await _hostFilterIo.writeInstanceSelection(_KDB, _runtime, targetId,
        selectionToHostValues(entry.currentSelection));
      if (!written.ok) {
        _diagnostics.push(_support.diagnostic(written.errorCode,
          "resync host write verification failed", match.instance));
        continue;
      }
      applyOverlay(root, targetId, entry);
    }
  }

  async function run(_ctx, _payload, _diagnostics) {
    var KDB = _ctx._KDB;
    var runtime = _ctx.runtime;
    var diagnostics = _diagnostics;
    var work = _transfers.buildTabMutationTransfers(_payload.plan);
    var captured = captureCommittedSelections(
      KDB.state.filters.singleSelect.instancesById || {},
      _payload.tabIdxToScopeId || {},
      work.affectedSlots,
      diagnostics
    );
    if (captured.length === 0) { return true; }
    // The cognosSync traverse rebuilds the page controls, so the cached host
    // filter APIs are stale; reconcile refreshes them before the committed
    // selections (captured above, because reconcile adopts host values into
    // currentSelection) are re-pushed and overlaid back into state.
    var reconciled = await _reconcileInventory.reconcileFilterInstances(KDB, runtime,
      { reason: "tabMutation", runId: _payload.runId });
    if (!reconciled.ok || runtime.tabMutationRunId !== _payload.runId) {
      diagnostics.push(_support.diagnostic(_config.errorCodes.TAB_MUTATION_APPLY_FAILED,
        "resync reconcile failed or was superseded"));
      return false;
    }
    // The traverse replaced the filter DOM; drop the cached popup refs so the
    // next popup interaction re-resolves against the live dock.
    if (runtime.domRefs) {
      delete runtime.domRefs.filterEl;
      delete runtime.domRefs.popupMount;
      delete runtime.domRefs.filterKey;
    }
    await pushCapturedSelections(KDB, runtime, captured, diagnostics);
    return true;
  }

  var resync = _tabMutation.createResync(_support.tabMutationBase, { run: run, diagnostic: _support.diagnostic });

  function resyncTabMutationHost(_KDB, _runtime, _payload) {
    return resync({ _KDB: _KDB, runtime: _runtime }, _payload);
  }

  return { resyncTabMutationHost: resyncTabMutationHost };
});
