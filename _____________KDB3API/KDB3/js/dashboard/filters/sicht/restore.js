define([
  "./config.js",
  "./state/selectors.js",
  "./availability.js",
  "./operations.js",
  "./delegation.js",
  "./commit.js",
  "../_core/parameterSetRun.js"
], function (_config, _selectors, _availability, _operations, _delegation, _commit, _parameterSetRun) {
  "use strict";

  var INVALID_PAYLOAD = "WRITEBACK_INVALID_V3_PAYLOAD";
  var RESTORE_FAILED = "WRITEBACK_SICHT_RESTORE_FAILED";

  async function clearParameterSet(_KDB, _deps, _action) {
    var payload = (_action && _action.payload) || {};
    var runtime = _deps.runtime;
    var runClaim = claimRunId(runtime, payload.runId);
    var diagnostics = [];
    var filterInstanceId;
    var result;
    var runStatus;
    var currentGeneration;
    var liveInstanceCount;
    var hasGeneration = payload.inventoryGeneration != null;
    var failed = false;
    if (runClaim) {
      return runClaim;
    }
    try {
      if (hasGeneration && (typeof payload.inventoryGeneration !== "number" ||
        !isFinite(payload.inventoryGeneration))) {
        return failResult(
          INVALID_PAYLOAD,
          "payload.inventoryGeneration must be numeric when provided"
        );
      }
      filterInstanceId = _delegation.resolveDelegatedSichtInstanceId(_KDB);
      if (!filterInstanceId) {
        liveInstanceCount = _delegation.readLiveSichtInstances(_KDB).length;
        if (liveInstanceCount === 0) {
          diagnostics.push(diagnostic(
            "WRITEBACK_SICHT_CLEAR_NO_LIVE_INSTANCE",
            "no live Sicht instance exists; clear is already satisfied"
          ));
          runStatus = ensureCurrentRun(runtime, payload.runId);
          return runStatus || ack(true, diagnostics, true);
        }
        return failResult(
          RESTORE_FAILED,
          liveInstanceCount > 1
            ? "multiple live global Sicht instances make clear ambiguous"
            : "live global Sicht instance could not be resolved"
        );
      }
      currentGeneration = _delegation.readSingleSelectInventoryGeneration(_KDB);
      if (hasGeneration && (currentGeneration == null ||
        Number(payload.inventoryGeneration) !== Number(currentGeneration))) {
        return failResult(
          "WRITEBACK_RESTORE_CANCELLED",
          "stale inventoryGeneration for sicht clear"
        );
      }
      if (!hasGeneration) {
        diagnostics.push(diagnostic(
          "WRITEBACK_SICHT_INVENTORY_GENERATION_COMPATIBILITY",
          "inventoryGeneration missing; current singleSelect inventory was resolved safely",
          { currentGeneration: currentGeneration }
        ));
      }
      var delegatedPayload = {
        filterInstanceId: filterInstanceId,
        operationId: _operations.buildSichtOperationId("clear"),
        operationKind: "clear",
        selection: { displayValue: _config.ALLE_LABEL, useValue: "" },
        source: "parameterRestore"
      };
      if (currentGeneration != null) {
        delegatedPayload.inventoryGeneration = hasGeneration
          ? payload.inventoryGeneration : currentGeneration;
      }
      result = await _delegation.dispatchSingleSelectOwnerSelection(_KDB, delegatedPayload);
      if (!result || result.ok !== true) {
        failed = true;
        diagnostics.push(diagnostic(
          RESTORE_FAILED,
          "sicht clear failed while delegating to singleSelect",
          { diagnostics: result && result.diagnostics }
        ));
      }
      runStatus = ensureCurrentRun(runtime, payload.runId);
      if (runStatus) {
        return runStatus;
      }
      if (failed && payload.status !== "newDashboard") {
        return ack(false, diagnostics);
      }
      return ack(true, diagnostics, !hasGeneration || failed);
    } catch (error) {
      console.error("[sicht.clearParameterSet] failed", error);
      return failResult(
        RESTORE_FAILED,
        String(error && error.message ? error.message : error)
      );
    }
  }

  // The filter write is delegated to the canonical singleSelect instance instead of a
  // direct Cognos write, gated by the writeback-owned inventoryGeneration.
  async function restoreParameterSet(_KDB, _deps, _action) {
    var payload = (_action && _action.payload) || {};
    var runtime = _deps.runtime;
    var runClaim = claimRunId(runtime, payload.runId);
    var normalizedUse = payload.sicht != null ? String(payload.sicht).trim() : "";
    var currentGeneration;
    var byOption;
    var option;
    var selection;
    var filterInstanceId;
    var result;
    var runStatus;
    var diagnostics = [];
    var hasGeneration = payload.inventoryGeneration != null;
    if (runClaim) {
      return runClaim;
    }
    try {
      if (!normalizedUse) {
        return failResult(INVALID_PAYLOAD, "sicht/parameterSetRestoreRequested requires payload.sicht (use value)");
      }
      if (hasGeneration && (typeof payload.inventoryGeneration !== "number" ||
        !isFinite(payload.inventoryGeneration))) {
        return failResult(
          INVALID_PAYLOAD,
          "payload.inventoryGeneration must be numeric when provided"
        );
      }
      currentGeneration = _delegation.readSingleSelectInventoryGeneration(_KDB);
      if (hasGeneration && (currentGeneration == null ||
        Number(payload.inventoryGeneration) !== Number(currentGeneration))) {
        return failResult("WRITEBACK_RESTORE_CANCELLED", "stale inventoryGeneration for sicht restore", {
          inventoryGeneration: payload.inventoryGeneration,
          currentGeneration: currentGeneration
        });
      }
      if (!hasGeneration) {
        diagnostics.push(diagnostic(
          "WRITEBACK_SICHT_INVENTORY_GENERATION_COMPATIBILITY",
          "inventoryGeneration missing; current singleSelect inventory was resolved safely",
          { currentGeneration: currentGeneration }
        ));
      }
      byOption = _availability.evaluateAndStoreSichtOptions(_KDB, _deps.dispatchInternal);
      option = _selectors.findOptionByUse(byOption, normalizedUse);
      selection = option
        ? { displayValue: String(option.displayValue || ""), useValue: String(option.useValue || "") }
        : null;
      if (!selection || !selection.displayValue || !selection.useValue) {
        return failResult(
          INVALID_PAYLOAD,
          "unsupported Sicht use value \"" + normalizedUse + "\"",
          { sicht: normalizedUse }
        );
      }
      filterInstanceId = _delegation.resolveDelegatedSichtInstanceId(_KDB);
      if (!filterInstanceId) {
        return failResult(RESTORE_FAILED, "no unique live global Sicht instance available for restore");
      }
      var delegatedPayload = {
        filterInstanceId: filterInstanceId,
        operationId: _operations.buildSichtOperationId("restore"),
        selection: selection,
        source: "parameterRestore"
      };
      if (currentGeneration != null) {
        delegatedPayload.inventoryGeneration = hasGeneration
          ? payload.inventoryGeneration : currentGeneration;
      }
      result = await _delegation.dispatchSingleSelectOwnerSelection(_KDB, delegatedPayload);
      runStatus = ensureCurrentRun(runtime, payload.runId);
      if (runStatus) {
        return runStatus;
      }
      if (!result || result.ok !== true) {
        return failResult(
          RESTORE_FAILED,
          "sicht restore failed while delegating to singleSelect",
          { diagnostics: result && result.diagnostics }
        );
      }
      diagnostics = diagnostics.concat(result.diagnostics || []);
      return ack(
        true,
        diagnostics,
        !hasGeneration || result.degraded === true
      );
    } catch (error) {
      console.error("[sicht.restoreParameterSet] failed", error);
      return failResult(
        RESTORE_FAILED,
        String(error && error.message ? error.message : error)
      );
    }
  }

  // Writeback step 20: refresh downstream Sicht gating before owner restores continue.
  // dstlWillFollow steers the Dienststelle leg: when true, step 21 (dienststelle restore)
  // realigns Dienststelle itself and a dienststelle/sichtChanged pass here would double-run
  // restore effects; when false, no Dienststelle restore follows, so the full
  // (history-suppressed) notification must go out from here.
  async function applyDownstreamVisibility(_KDB, _deps, _action) {
    var payload = (_action && _action.payload) || {};
    var runtime = _deps.runtime;
    var runClaim = claimRunId(runtime, payload.runId);
    var selection;
    var diagnostics = [];
    var specialResult;
    var dienststelleResult;
    var runStatus;
    if (runClaim) {
      return runClaim;
    }
    try {
      selection = _selectors.readConfirmedSichtSelection(_KDB);
      if (!selection || !selection.displayValue) {
        return failResult(
          RESTORE_FAILED,
          "downstream visibility requires an active Sicht selection"
        );
      }
      specialResult = await _commit.notifySpecialSingleSelect(_KDB, selection);
      if (specialResult && specialResult.ok === false) {
        diagnostics.push(diagnostic(
          specialResult.code,
          specialResult.message
        ));
      }
      if (payload.dstlWillFollow !== true) {
        dienststelleResult = await notifyWritebackDienststelle(_KDB, selection);
        if (dienststelleResult.ok === false) {
          diagnostics.push(diagnostic(
            dienststelleResult.code,
            dienststelleResult.message
          ));
        }
      } else {
        diagnostics.push(diagnostic(
          "WRITEBACK_SICHT_DOWNSTREAM_DSTL_DELEGATED",
          "dienststelle realignment is delegated to the following dienststelle restore step"
        ));
      }
      runStatus = ensureCurrentRun(runtime, payload.runId);
      if (runStatus) {
        return runStatus;
      }
      return ack(
        true,
        diagnostics,
        diagnostics.some(function (_item) {
          return _item.code !== "WRITEBACK_SICHT_DOWNSTREAM_DSTL_DELEGATED";
        })
      );
    } catch (error) {
      console.error("[sicht.applyDownstreamVisibility] failed", error);
      return failResult(
        RESTORE_FAILED,
        String(error && error.message ? error.message : error)
      );
    }
  }

  // Full downstream pass for restores without filt.dstl: dienststelle must realign
  // (reconcile/defaults) to the restored Sicht. isHistoryReplay suppresses history
  // steps on the dienststelle side (skipHistory semantics).
  async function notifyWritebackDienststelle(_KDB, _selection) {
    try {
      var api = _KDB && _KDB.api ? _KDB.api.dienststelle : null;
      if (!api || typeof api.dispatch !== "function") {
        return { ok: true, skipped: true };
      }
      await Promise.resolve(api.dispatch({
        type: "dienststelle/sichtChanged",
        payload: {
          activeSichtValue: _selection.displayValue,
          selection: {
            displayValue: _selection.displayValue,
            useValue: _selection.useValue
          },
          source: "writebackSet",
          isHistoryReplay: true,
          observedAt: Date.now()
        }
      }));
      return { ok: true };
    } catch (error) {
      console.error("[sicht.notifyWritebackDienststelle] failed", error);
      return {
        ok: false,
        code: "WRITEBACK_SICHT_DOWNSTREAM_DSTL_FAILED",
        message: String(error && error.message ? error.message : error)
      };
    }
  }

  function ack(ok, diagnostics, degraded) {
    return {
      ok: ok === true,
      degraded: degraded === true,
      diagnostics: Array.isArray(diagnostics) ? diagnostics : []
    };
  }

  function diagnostic(code, message, details) {
    var item = { code: code, message: message };
    if (details && typeof details === "object") {
      Object.keys(details).forEach(function (key) {
        item[key] = details[key];
      });
    }
    return item;
  }

  function cancelResult(runId, message) {
    return ack(false, [diagnostic("WRITEBACK_RESTORE_CANCELLED", message, { runId: runId })]);
  }

  function failResult(code, message, details) {
    return ack(false, [diagnostic(code, message, details)]);
  }

  function claimRunId(runtime, runId) {
    var rejection = _parameterSetRun.claimParameterSetRun(runtime, runId, {
      invalidMessage: "parameterSet action requires numeric runId"
    });
    return rejection ? cancelResult(rejection.runId, rejection.message) : null;
  }

  function ensureCurrentRun(runtime, runId) {
    if (runtime.parameterSetRunId !== runId) {
      return cancelResult(
        runId,
        "parameterSet run " + runId + " superseded by " + runtime.parameterSetRunId
      );
    }
    return null;
  }

  return {
    clearParameterSet: clearParameterSet,
    restoreParameterSet: restoreParameterSet,
    applyDownstreamVisibility: applyDownstreamVisibility,
    ack: ack,
    diagnostic: diagnostic
  };
});
