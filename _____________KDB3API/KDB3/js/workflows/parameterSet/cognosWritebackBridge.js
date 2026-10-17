define([
  "../../core/utils/kit/errors.js",
  "../../core/config/writebackErrorCodes.js",
  "./set/state/ensureWritebackRuntime.js",
  "./bridge/hostGlobals.js",
  "./bridge/bridgeResult.js",
  "./bridge/hostParameterSetSelect.js",
  "./bridge/selectParameterSetById.js",
  "./bridge/runBridgeSetRestore.js"
], function (
  _kitErrors,
  _errorCodes,
  _ensureWritebackRuntime,
  _hostGlobals,
  _bridgeResult,
  _hostParameterSetSelect,
  _selectParameterSetById,
  _runBridgeSetRestore
) {
  "use strict";

  // Thin Cognos bridge (writeback.md §3). SET path: runBridgeSetRestore. GET stringifies asynchronously;
  // SET failures are logged and resolved as a failed envelope, never thrown. Installed by default unless
  // options.installCognosBridge === false.
  function createCognosWritebackBridge(deps) {
    // Nulled in destroy() so the host anchors on window.top do not keep a destroyed KDB alive.
    let _KDB = deps._KDB;
    let _installed = false;
    const guard = _kitErrors.createDisposedGuard("writebackBridge");
    const hostGlobals = _hostGlobals.createHostGlobals(bridgeGet, bridgeSet, function () { return _KDB; });

    function isGone() {
      return !_KDB || _KDB._isDisposed === true;
    }

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
        topWindow = _hostGlobals.readTopWindow();
      } catch (error) {
        logBridgeDiagnostic("install", "bridge install failed: window.top is not accessible", { error: String(error && error.message ? error.message : error) });
        return false;
      }
      if (hostGlobals.install(topWindow)) {
        console.warn("[writebackBridge.install] overwriting existing WBParameter*Function globals (kept for uninstall restore)");
      }
      _installed = true;
      _ensureWritebackRuntime(_KDB).ownedBridgeSet = bridgeSet;
      return true;
    }

    function uninstall() {
      if (!_installed) {
        return false;
      }
      try {
        const runtime = _KDB && _KDB.runtime && _KDB.runtime.writeback;
        const controller = runtime && runtime.abortControllers && runtime.abortControllers.newDashboardOption;
        hostGlobals.uninstall(_hostGlobals.readTopWindow());
        if (controller && typeof controller.abort === "function") controller.abort();
        if (runtime && runtime.abortControllers) delete runtime.abortControllers.newDashboardOption;
        if (runtime) delete runtime.ownedBridgeSet;
      } catch (error) {
        logBridgeDiagnostic("uninstall", "bridge uninstall failed", { error: String(error && error.message ? error.message : error) });
        return false;
      }
      _installed = false;
      return true;
    }

    function isInstalled() {
      return _installed;
    }

    // A cached host function can be called after KDB.destroy(), which nulls _KDB.services.
    function assertBridgeUsable(phase) {
      const services = isGone() ? null : _KDB.services;
      if (services && services.writebackGet && services.writebackSet && services.writebackMap) {
        return;
      }
      throw _errorCodes.createWritebackError(
        _errorCodes.codes.WRITEBACK_RESTORE_CANCELLED, phase,
        "writeback bridge is unavailable: the KDB instance is disposed", {}, 0
      );
    }

    // Every host call logs a console.debug (DevTools level "Verbose") with its call stack so unknown callers
    // can be traced. Approved by the user (2026-08-19). Deliberately no rejection: the Cognos report is the
    // legitimate caller and a heuristic block could break the save/restore flow.
    function logBridgeCall(phase, details) {
      try {
        const info = {
          at: new Date().toISOString(),
          installed: _installed,
          disposed: isGone(),
          stack: String(new Error().stack || "").split("\n").slice(2, 8).join("\n")
        };
        if (details) { info.details = details; }
        console.debug("[writebackBridge." + phase + "] host call", info);
      } catch (ignoreDiagnosticError) { /* diagnostics must never break a host call */ }
    }

    // window.top.WBParameterGetFunction() -> Promise<string>; GET callers parse the value and must see a failure.
    async function bridgeGet() {
      logBridgeCall("get");
      try {
        assertBridgeUsable("get");
        const v3 = await _KDB.services.writebackGet.collect({ source: "bridge" });
        return JSON.stringify(v3);
      } catch (error) {
        return rejectLogged("get", error);
      }
    }

    // window.top.WBParameterSetFunction(raw, status) -> Promise<RestoreResult | failed envelope>; never rejects.
    async function bridgeSet(_raw, _status) {
      const status = _bridgeResult.normalizeStatus(_status);
      logBridgeCall("set", { status: status });
      try {
        assertBridgeUsable("set");
        return await _runBridgeSetRestore(_KDB, _raw, _status);
      } catch (error) {
        logBridgeError("set", error);
        return _bridgeResult.failureResult(status, [_bridgeResult.toBridgeDiagnostic(error)]);
      }
    }

    function logBridgeError(phase, error) {
      console.error("[writebackBridge." + phase + "]", error && error.diagnostic ? error.diagnostic : error);
    }

    function rejectLogged(phase, error) {
      logBridgeError(phase, error);
      return Promise.reject(error);
    }

    function logBridgeDiagnostic(phase, message, details) {
      console.error("[writebackBridge." + phase + "]", { code: "WRITEBACK_BRIDGE_UNAVAILABLE", phase: "bridge", runId: 0, message: message, details: details });
    }

    function destroy() {
      uninstall();
      _KDB = null;
      guard.dispose();
    }

    function readSelectedParameterSet() {
      if (guard.blocked("readSelectedParameterSet") || isGone()) return undefined;
      try {
        return _hostParameterSetSelect.readSelectedParameterSet();
      } catch (error) {
        console.error("[writebackBridge.readSelectedParameterSet] failed", error);
        return { id: null, label: null };
      }
    }

    function selectParameterSetById(parameterId, options) {
      if (guard.blocked("selectParameterSetById") || isGone()) {
        return Promise.resolve({ ok: false, found: false, aborted: true });
      }
      return _selectParameterSetById(_KDB, parameterId, options);
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
