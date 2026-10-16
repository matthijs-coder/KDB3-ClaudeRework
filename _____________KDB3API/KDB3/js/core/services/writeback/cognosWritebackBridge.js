define([
  "./schema/errorCodes.js",
  "./bridge/readSelectedParameterSet.js",
  "./bridge/selectParameterSetById.js",
  "./bridge/runBridgeSetRestore.js"
], function (
  _errorCodes,
  _readSelectedParameterSet,
  _selectParameterSetById,
  _runBridgeSetRestore
) {
  "use strict";

  // Thin Cognos bridge (writeback.md §3). SET path: runBridgeSetRestore.
  // GET stringify async; SET failures logged, never thrown. Default-installed
  // unless options.installCognosBridge === false.
  function createCognosWritebackBridge(deps) {
    const _KDB = deps._KDB;
    let _installed = false;
    let _previousGet;
    let _previousSet;

    function install() {
      if (_installed) {
        return true;
      }
      const services = _KDB && _KDB.services ? _KDB.services : {};
      if (!services.writebackGet || !services.writebackSet || !services.writebackMap) {
        logBridgeDiagnostic("install", "bridge install refused: writeback services are not registered", {});
        return false;
      }
      let topWindow;
      try {
        topWindow = window.top;
        void topWindow.document; // cross-origin access check
      } catch (error) {
        logBridgeDiagnostic("install", "bridge install failed: window.top is not accessible", { error: String(error && error.message ? error.message : error) });
        return false;
      }
      const existingGet = topWindow.WBParameterGetFunction;
      const existingSet = topWindow.WBParameterSetFunction;
      const foreignGet = typeof existingGet === "function" && existingGet.__kdbWritebackBridge !== true;
      const foreignSet = typeof existingSet === "function" && existingSet.__kdbWritebackBridge !== true;
      if (foreignGet || foreignSet) {
        console.warn("[writebackBridge.install] overwriting existing WBParameter*Function globals (kept for uninstall restore)");
      }
      _previousGet = existingGet;
      _previousSet = existingSet;
      bridgeGet.__kdbWritebackBridge = true;
      bridgeSet.__kdbWritebackBridge = true;
      bridgeGet.__kdbOwner = _KDB;
      bridgeSet.__kdbOwner = _KDB;
      // Echt-vreemde previous door boot-generaties heen doorgeven (dubbel-boot):
      // een stale KDB-anker wordt bij uninstall nooit teruggezet, zijn vreemde
      // previous wel (zie resolveRestorablePrevious).
      bridgeGet.__kdbForeignPrevious = foreignGet ? existingGet : existingGet && existingGet.__kdbForeignPrevious;
      bridgeSet.__kdbForeignPrevious = foreignSet ? existingSet : existingSet && existingSet.__kdbForeignPrevious;
      topWindow.WBParameterGetFunction = bridgeGet;
      topWindow.WBParameterSetFunction = bridgeSet;
      _installed = true;
      _KDB.runtime = _KDB.runtime || {};
      if (!_KDB.runtime.writeback || typeof _KDB.runtime.writeback !== "object") {
        _KDB.runtime.writeback = {};
      }
      _KDB.runtime.writeback.ownedBridgeSet = bridgeSet;
      return true;
    }

    function resolveRestorablePrevious(previousFn) {
      if (typeof previousFn !== "function" || previousFn.__kdbWritebackBridge !== true) {
        return previousFn;
      }
      const previousOwner = previousFn.__kdbOwner;
      if (previousOwner && previousOwner._isDisposed !== true) {
        // KDB-anker van een nog levende boot (omgekeerde destroy-volgorde): terugzetten.
        return previousFn;
      }
      // Disposed KDB-anker nooit terugzetten; wel diens vreemde previous.
      return previousFn.__kdbForeignPrevious;
    }

    function restoreGlobal(topWindow, name, ownedFn, previousFn) {
      // Eigenaarschapscheck (dubbel-boot): anker van een nieuwere boot niet aanraken.
      if (topWindow[name] !== ownedFn) { return; }
      const previous = resolveRestorablePrevious(previousFn);
      topWindow[name] = previous;
      if (previous === undefined) {
        delete topWindow[name];
      }
    }

    function uninstall() {
      if (!_installed) {
        return false;
      }
      try {
        const topWindow = window.top;
        const runtime = _KDB && _KDB.runtime && _KDB.runtime.writeback;
        const controller = runtime && runtime.abortControllers && runtime.abortControllers.newDashboardOption;
        restoreGlobal(topWindow, "WBParameterGetFunction", bridgeGet, _previousGet);
        restoreGlobal(topWindow, "WBParameterSetFunction", bridgeSet, _previousSet);
        if (controller && typeof controller.abort === "function") controller.abort();
        if (runtime && runtime.abortControllers) delete runtime.abortControllers.newDashboardOption;
        if (runtime) delete runtime.ownedBridgeSet;
      } catch (error) {
        logBridgeDiagnostic("uninstall", "bridge uninstall failed", { error: String(error && error.message ? error.message : error) });
        return false;
      }
      _previousGet = undefined;
      _previousSet = undefined;
      _installed = false;
      return true;
    }

    function isInstalled() {
      return _installed;
    }

    // Guard tegen aanroepen van een gecachte bridge-functie ná KDB.destroy():
    // destroy nult _KDB.services; zonder guard zou dat een kale TypeError geven.
    function assertBridgeUsable(phase) {
      const services = _KDB && _KDB._isDisposed !== true ? _KDB.services : null;
      if (services && services.writebackGet && services.writebackSet && services.writebackMap) {
        return;
      }
      throw _errorCodes.createWritebackError(
        _errorCodes.codes.WRITEBACK_RESTORE_CANCELLED, phase,
        "writeback bridge is unavailable: the KDB instance is disposed", {}, 0
      );
    }

    // A4-diagnostiek (user-akkoord 2026-08-19): elke host-aanroep logt een
    // console.debug (zichtbaar op DevTools-niveau "Verbose") met call-stack,
    // zodat vreemde callers herleidbaar zijn. Bewust géén weigering: het
    // Cognos-rapport is de legitieme caller en een heuristische block zou de
    // save/restore-flow kunnen breken.
    function logBridgeCall(phase, details) {
      try {
        const info = {
          at: new Date().toISOString(),
          installed: _installed,
          disposed: !!(_KDB && _KDB._isDisposed),
          stack: String(new Error().stack || "").split("\n").slice(2, 8).join("\n")
        };
        if (details) { info.details = details; }
        console.debug("[writebackBridge." + phase + "] host call", info);
      } catch (ignoreDiagnosticError) { /* noop */ }
    }

    // window.top.WBParameterGetFunction() -> Promise<string>
    async function bridgeGet() {
      logBridgeCall("get");
      try {
        assertBridgeUsable("get");
        const v3 = await _KDB.services.writebackGet.collect({ source: "bridge" });
        return JSON.stringify(v3);
      } catch (error) {
        logBridgeError("get", error);
        throw error; // GET callers parse the return value and must see the failure
      }
    }

    // window.top.WBParameterSetFunction(raw, status) -> Promise<RestoreResult | { ok: false, ... }>
    async function bridgeSet(_raw, _status) {
      const status = _status === undefined || _status === null ? "notDefaultParamSet" : String(_status);
      logBridgeCall("set", { status: status });
      try {
        assertBridgeUsable("set");
        return await _runBridgeSetRestore(_KDB, _raw, _status);
      } catch (error) {
        logBridgeError("set", error);
        return {
          ok: false,
          status: status,
          runId: 0,
          outcome: "failed",
          diagnostics: [toBridgeDiagnostic(error)],
          phases: []
        };
      }
    }

    function toBridgeDiagnostic(error) {
      if (error && error.diagnostic) {
        return error.diagnostic;
      }
      return _errorCodes.makeDiagnostic(
        _errorCodes.codes.WRITEBACK_INVALID_V3_PAYLOAD, "bridge",
        String(error && error.message ? error.message : error), {}, 0
      );
    }

    function logBridgeError(phase, error) {
      console.error("[writebackBridge." + phase + "]", error && error.diagnostic ? error.diagnostic : error);
    }

    function logBridgeDiagnostic(phase, message, details) {
      console.error("[writebackBridge." + phase + "]", { code: "WRITEBACK_BRIDGE_UNAVAILABLE", phase: "bridge", runId: 0, message: message, details: details });
    }

    function destroy() {
      uninstall();
    }

    function readSelectedParameterSet() {
      try {
        if (_KDB && _KDB._isDisposed === true) return undefined;
        return _readSelectedParameterSet();
      } catch (error) {
        console.error("[writebackBridge.readSelectedParameterSet] failed", error);
        throw error;
      }
    }

    function selectParameterSetById(parameterId, options) {
      try {
        if (_KDB && _KDB._isDisposed === true) {
          return Promise.resolve({ ok: false, found: false, aborted: true });
        }
        return _selectParameterSetById(_KDB, parameterId, options);
      } catch (error) {
        console.error("[writebackBridge.selectParameterSetById] failed", error);
        throw error;
      }
    }

    return {
      install: install,
      uninstall: uninstall,
      isInstalled: isInstalled,
      destroy: destroy,
      readSelectedParameterSet: readSelectedParameterSet,
      selectParameterSetById: selectParameterSetById
    };
  }

  return createCognosWritebackBridge;
});
