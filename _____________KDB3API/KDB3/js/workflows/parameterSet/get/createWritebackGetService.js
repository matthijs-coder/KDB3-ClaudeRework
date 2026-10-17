define([
  "../schema/normalizeV3.js",
  "../schema/validateV3.js",
  "../../../core/config/writebackErrorCodes.js",
  "../schema/v3Defaults.js",
  "../../../core/config/mapping/kidIndex.js",
  "./runWritebackGetCollectors.js",
  "./persist/persistLanding.js",
  "./persist/persistLoadingOverlay.js",
  "../../../core/utils/kit/errors.js"
], function (
  _normalizeV3,
  _validateV3,
  _errorCodes,
  _v3Defaults,
  _parameterMapping,
  _runCollectors,
  _persistLanding,
  _persistLoading,
  _kitErrors
) {
  "use strict";

  // writebackGet per contracts/writeback.md §2.1 and persist-landing A′.
  // Pipeline: collect -> normalizeV3 -> validateV3 -> persist land (bridge) -> V3.
  function createWritebackGetService(_deps) {
    const _KDB = _deps._KDB;
    const guard = _kitErrors.createDisposedGuard("writebackGet");

    async function collect(_options) {
      if (guard.blocked("collect")) {
        throw _errorCodes.createWritebackError(
          _errorCodes.codes.WRITEBACK_RESTORE_CANCELLED,
          "get",
          "writebackGet service is disposed"
        );
      }
      _persistLanding.cancelWritebackGetPersistLanding(_KDB);
      _persistLoading.finish(_KDB);
      const diagnostics = [];
      const pkg = _parameterMapping.resolveRuntimePackageKey(_KDB);
      if (pkg === null) {
        _runCollectors.notifySaveFailed(_KDB, "Die Parameter-Konfiguration (Package) konnte nicht ermittelt werden.");
        throw _errorCodes.createWritebackError(
          _errorCodes.codes.WRITEBACK_MAPPING_CONFIG_MISSING,
          "get",
          "runtime package key could not be resolved from parameter mapping",
          { expectedSource: "core/config/mapping/parameterMap.js via kidIndex.js" }
        );
      }
      const rawFrame = { v: _v3Defaults.SCHEMA_VERSION, pkg: pkg };
      await _runCollectors.runWritebackGetCollectors(_KDB, rawFrame, diagnostics);
      const normalized = _normalizeV3(rawFrame, { diagnostics: diagnostics });
      const validation = _validateV3(normalized);
      if (!validation.ok) {
        _runCollectors.notifySaveFailed(_KDB, "Die gesammelten Dashboard-Daten sind ungültig.");
        throw _errorCodes.createWritebackError(
          _errorCodes.codes.WRITEBACK_INVALID_V3_PAYLOAD,
          "get",
          "writebackGet produced an invalid v3 payload",
          { diagnostics: validation.diagnostics }
        );
      }
      logDiagnostics(diagnostics.concat(validation.diagnostics));
      if (_options && _options.source === "bridge") {
        try {
          _persistLoading.start(_KDB);
          await _persistLanding.applyWritebackGetPersistLanding(_KDB);
        } catch (persistError) {
          console.error("[writebackGet.persistLanding] failed", persistError);
        }
        _persistLoading.finish(_KDB);
      }
      return normalized;
    }

    function destroy() {
      guard.dispose();
      _persistLanding.cancelWritebackGetPersistLanding(_KDB);
      _persistLoading.finish(_KDB);
    }

    return { collect: collect, destroy: destroy };
  }

  function logDiagnostics(diagnostics) {
    if (diagnostics.length > 0) {
      console.warn("[writebackGet.collect] diagnostics", diagnostics);
    }
  }

  return createWritebackGetService;
});
