define([
  "../schema/normalizeV3.js",
  "../schema/validateV3.js",
  "../schema/errorCodes.js",
  "../schema/v3Defaults.js",
  "../../../config/mapping/kidIndex.js",
  "./runWritebackGetCollectors.js",
  "./applyWritebackGetPersistLanding.js",
  "./effects/applyWritebackGetPersistLoading.js"
], function (
  _normalizeV3,
  _validateV3,
  _errorCodes,
  _v3Defaults,
  _parameterMapping,
  _runCollectors,
  _persistLanding,
  _persistLoading
) {
  "use strict";

  // writebackGet per contracts/writeback.md §2.1 and persist-landing A′.
  // Pipeline: collect -> normalizeV3 -> validateV3 -> persist land (bridge) -> V3.
  function createWritebackGetService(_deps) {
    const _KDB = _deps._KDB;
    let _isDisposed = false;

    async function collect(_options) {
      try {
        if (_isDisposed) {
          console.warn("[writebackGet.collect] called after destroy");
          throw _errorCodes.createWritebackError(
            _errorCodes.codes.WRITEBACK_RESTORE_CANCELLED,
            "get",
            "writebackGet service is disposed"
          );
        }
        _persistLanding.cancelWritebackGetPersistLanding(_KDB);
        _persistLoading.finish(_KDB);
        const diagnostics = [];
        const pkg = resolveRuntimePackageKey(_KDB);
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
            _persistLoading.finish(_KDB);
          } catch (persistError) {
            console.error("[writebackGet.persistLanding] failed", persistError);
            _persistLoading.finish(_KDB);
          }
        }
        return normalized;
      } catch (err) {
        console.error("[writebackGet.collect] failed", { disposed: _isDisposed, source: _options && _options.source }, err);
        throw err;
      }
    }

    function destroy() {
      _isDisposed = true;
      try {
        _persistLanding.cancelWritebackGetPersistLanding(_KDB);
        _persistLoading.finish(_KDB);
      } catch (error) {
        console.warn("[writebackGet.destroy] persist cancel failed", error);
      }
    }

    return { collect: collect, destroy: destroy };
  }

  function resolveRuntimePackageKey(_KDB) {
    try {
      return _parameterMapping.resolveRuntimePackageKey(_KDB);
    } catch (error) {
      console.error("[writebackGet.resolveRuntimePackageKey] failed", error);
      return null;
    }
  }

  function logDiagnostics(diagnostics) {
    if (diagnostics.length > 0) {
      console.warn("[writebackGet.collect] diagnostics", diagnostics);
    }
  }

  return createWritebackGetService;
});
