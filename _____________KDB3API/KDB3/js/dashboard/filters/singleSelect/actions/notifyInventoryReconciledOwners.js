define([
  "../config.js",
  "./awaitOwnerInventoryAck.js",
  "./inventoryOwnerDispatch.js"
], function (_config, _support, _dispatch) {
  "use strict";

  async function notifyOwnerOnce(_KDB, _runtime, _ownerName, _payload, _signal) {
    if (_support.wasOwnerAcknowledged(_runtime, _ownerName, _payload.inventoryGeneration)) {
      return null;
    }
    return {
      owner: _ownerName,
      result: await _dispatch.dispatchOwner(_KDB, _config.errorCodes, _support, _ownerName, _payload, _signal)
    };
  }

  async function notifyInventoryReconciledOwners(_KDB, _runtime, _details) {
    try {
      var details = _details || {};
      var generation = Number(details.inventoryGeneration);
      var reason = details.reason || "unspecified";
      var source = details.source || "singleSelect";
      var timestamp = details.timestamp != null ? Number(details.timestamp) : Date.now();
      var isCurrent = typeof details.isCurrent === "function" ? details.isCurrent : null;
      var signal = details.signal || null;
      var flags = _support.derivePolicyFlags(reason);
      if (!isFinite(generation)) {
        return {
          notified: false,
          diagnostics: [_support.buildOwnerDiagnostic(
            _config.errorCodes.RECONCILE_FAILED,
            "singleSelect",
            details.inventoryGeneration,
            "inventory owner notify skipped because generation is invalid"
          )]
        };
      }
      if (reason === "parameterRestore" || reason === "historyReplay") {
        return { notified: false, diagnostics: [] };
      }
      if (isCurrent && !isCurrent()) {
        return { notified: false, diagnostics: [] };
      }
      var payload = {
        inventoryGeneration: generation,
        source: source,
        reason: reason,
        timestamp: timestamp,
        allowStartupDefault: flags.allowStartupDefault,
        allowSpecialPolicy: flags.allowSpecialPolicy
      };
      var ownerResults = [];
      var sichtResult = await notifyOwnerOnce(_KDB, _runtime, "sicht", payload, signal);
      if (sichtResult) {
        ownerResults.push(sichtResult);
      }
      var specialResult = await notifyOwnerOnce(
        _KDB,
        _runtime,
        "specialSingleSelect",
        payload,
        signal
      );
      if (specialResult) {
        ownerResults.push(specialResult);
      }
      if (isCurrent && !isCurrent()) {
        return { notified: false, diagnostics: [] };
      }
      ownerResults.forEach(function (_entry) {
        if (_entry.result && _entry.result.ok === true &&
          _entry.result.acknowledged === true) {
          _support.markOwnerAcknowledged(_runtime, _entry.owner, generation, _entry.result.ack);
        }
      });
      return {
        notified: ownerResults.length > 0,
        diagnostics: ownerResults
          .map(function (_entry) { return _entry.result; })
          .filter(function (_item) { return !_item.ok && _item.diagnostic; })
          .map(function (_item) { return _item.diagnostic; })
      };
    } catch (error) {
      return {
        notified: false,
        diagnostics: [_support.buildOwnerDiagnostic(
          _config.errorCodes.INVENTORY_OWNER_DISPATCH_FAILED,
          "singleSelect",
          _details && _details.inventoryGeneration,
          "inventory owner notify failed: " +
            String(error && error.message ? error.message : error)
        )]
      };
    }
  }

  return notifyInventoryReconciledOwners;
});
