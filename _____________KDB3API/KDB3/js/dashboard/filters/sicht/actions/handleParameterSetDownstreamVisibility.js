define([
  "../effects/notifySpecialSingleSelect.js",
  "./parameterSetShared.js",
  "../state/selectors.js"
], function (_notifySpecialSingleSelect, _shared, _selectors) {
  "use strict";

  // Writeback step 20 (§6.3 amendment 2026-07-12): refresh downstream Sicht
  // gating before owner restores continue. dstlWillFollow steers the
  // Dienststelle leg: when true, step 21 (dienststelle restore) realigns
  // Dienststelle itself and a dienststelle/sichtChanged pass here would
  // double-run restore effects; when false, no Dienststelle restore follows,
  // so the full (history-suppressed) notification must go out from here.
  async function handleParameterSetDownstreamVisibility(_KDB, _deps, _action) {
    var payload = (_action && _action.payload) || {};
    var runtime = _deps.runtime;
    var runClaim = _shared.claimRunId(runtime, payload.runId);
    try {
      var selection;
      var diagnostics = [];
      var specialResult;
      var dienststelleResult;
      var runStatus;
      if (runClaim) {
        return runClaim;
      }
      selection = _selectors.readConfirmedSichtSelection(_KDB);
      if (!selection || !selection.displayValue) {
        return _shared.failResult(
          "WRITEBACK_SICHT_RESTORE_FAILED",
          "downstream visibility requires an active Sicht selection"
        );
      }
      specialResult = await _notifySpecialSingleSelect(_KDB, selection);
      if (specialResult && specialResult.ok === false) {
        diagnostics.push(_shared.diagnostic(
          specialResult.code,
          specialResult.message
        ));
      }
      if (payload.dstlWillFollow !== true) {
        dienststelleResult = await notifyWritebackDienststelle(_KDB, selection);
        if (dienststelleResult.ok === false) {
          diagnostics.push(_shared.diagnostic(
            dienststelleResult.code,
            dienststelleResult.message
          ));
        }
      } else {
        diagnostics.push(_shared.diagnostic(
          "WRITEBACK_SICHT_DOWNSTREAM_DSTL_DELEGATED",
          "dienststelle realignment is delegated to the following dienststelle restore step"
        ));
      }
      runStatus = _shared.ensureCurrentRun(runtime, payload.runId);
      if (runStatus) {
        return runStatus;
      }
      return _shared.ack(
        true,
        diagnostics,
        diagnostics.some(function (_item) {
          return _item.code !== "WRITEBACK_SICHT_DOWNSTREAM_DSTL_DELEGATED";
        })
      );
    } catch (error) {
      console.error("[sicht.handleParameterSetDownstreamVisibility] failed", error);
      return _shared.failResult(
        "WRITEBACK_SICHT_RESTORE_FAILED",
        String(error && error.message ? error.message : error)
      );
    }
  }

  // Full downstream pass for restores without filt.dstl: dienststelle must
  // realign (reconcile/defaults) to the restored Sicht. isHistoryReplay
  // suppresses history steps on the dienststelle side (skipHistory semantics).
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

  return handleParameterSetDownstreamVisibility;
});
