define([
  "../schema/detectSourceFormat.js",
  "../schema/normalizeV3.js",
  "../schema/validateV3.js",
  "../schema/errorCodes.js",
  "./adapters/mapV2ToV3.js",
  "../../../utils/kit/errors.js",
], function (_detectSourceFormat, _normalizeV3, _validateV3, _errorCodes, _mapV2ToV3, _kitErrors) {
  "use strict";

  function runTerminalPipeline(_v3, _diagnostics) {
    const normalized = _normalizeV3(_v3, { diagnostics: _diagnostics });
    const validation = _validateV3(normalized);
    if (!validation.ok) {
      throw _errorCodes.createWritebackError(
        _errorCodes.codes.WRITEBACK_INVALID_V3_PAYLOAD,
        "map",
        "mapped payload failed validateV3",
        { diagnostics: validation.diagnostics }
      );
    }
    return normalized;
  }

  function createWritebackMapService(deps) {
    const _KDB = deps._KDB;
    const guard = _kitErrors.createDisposedGuard("writebackMap");

    function toV3(raw, _options) {
      if (guard.blocked("toV3")) {
        throw _errorCodes.createWritebackError(
          _errorCodes.codes.WRITEBACK_RESTORE_CANCELLED,
          "map",
          "writebackMap service is disposed"
        );
      }
      const diagnostics = _options && Array.isArray(_options.diagnostics) ? _options.diagnostics : [];
      let isV3Path = false;
      try {
        const format = _detectSourceFormat(raw);
        if (format === "v3") {
          isV3Path = true;
          const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
          return runTerminalPipeline(parsed, diagnostics);
        }
        if (format === "v2") {
          const mapped = _mapV2ToV3(_KDB, raw, diagnostics);
          return runTerminalPipeline(mapped, diagnostics);
        }
        throw _errorCodes.createWritebackError(
          _errorCodes.codes.WRITEBACK_UNSUPPORTED_LEGACY_FORMAT,
          "map",
          "unsupported or unknown legacy writeback format",
          { detectedFormat: format }
        );
      } catch (error) {
        if (error && (error.name === "WritebackError" || error.diagnostic)) {
          throw error;
        }
        console.error("[writebackMap.toV3] failed", error);
        throw _errorCodes.createWritebackError(
          isV3Path
            ? _errorCodes.codes.WRITEBACK_INVALID_V3_PAYLOAD
            : _errorCodes.codes.WRITEBACK_UNSUPPORTED_LEGACY_FORMAT,
          "map",
          isV3Path ? "v3 payload could not be parsed or mapped" : "unexpected error while mapping v2 payload",
          { error: error && error.message ? error.message : String(error) }
        );
      }
    }

    function destroy() {
      guard.dispose();
    }

    return { toV3: toV3, destroy: destroy };
  }

  return createWritebackMapService;
});
