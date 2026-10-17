define([
  "../../../../core/config/mapping/kidIndex.js",
  "./remapV2KidTokens.js",
  "./mapV2CanvasSettings.js",
  "./mapV2Chrome.js",
  "./mapV2Filters.js",
  "./mapV2Widgets.js",
  "../../schema/errorCodes.js",
  "../../schema/v3Defaults.js",
], function (
  _parameterMapping,
  _remapV2KidTokens,
  _mapV2CanvasSettings,
  _mapV2Chrome,
  _mapV2Filters,
  _mapV2Widgets,
  _errorCodes,
  _v3Defaults
) {
  "use strict";

  function parseV2Payload(_raw) {
    let candidate = _raw;
    if (typeof candidate === "string") {
      candidate = JSON.parse(candidate);
    }
    if (Array.isArray(candidate)) {
      if (candidate.length !== 1) {
        throw _errorCodes.createWritebackError(
          _errorCodes.codes.WRITEBACK_UNSUPPORTED_LEGACY_FORMAT,
          "map",
          "v2 payload must be a single object or single-element array"
        );
      }
      candidate = candidate[0];
    }
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      throw _errorCodes.createWritebackError(
        _errorCodes.codes.WRITEBACK_UNSUPPORTED_LEGACY_FORMAT,
        "map",
        "v2 payload must be a plain object"
      );
    }
    return candidate;
  }

  function assignSection(_target, _key, _value) {
    if (_value !== null && _value !== undefined) {
      _target[_key] = _value;
    }
  }

  function mapV2ToV3(_KDB, _raw, _diagnostics) {
    try {
      const missingKeys = _parameterMapping.findMissingRequiredKeys();
      if (missingKeys.length > 0) {
        throw _errorCodes.createWritebackError(
          _errorCodes.codes.WRITEBACK_MAPPING_CONFIG_MISSING,
          "map",
          "parameter mapping is missing required keys for v2 map",
          { missingKeys: missingKeys }
        );
      }
      const pkg = _parameterMapping.resolveRuntimePackageKey(_KDB);
      if (!pkg) {
        throw _errorCodes.createWritebackError(
          _errorCodes.codes.WRITEBACK_MAPPING_CONFIG_MISSING,
          "map",
          "runtime package key could not be resolved from parameter mapping"
        );
      }
      const parsed = parseV2Payload(_raw);
      const payload = _remapV2KidTokens(_KDB, parsed, _diagnostics);
      const v3 = { v: _v3Defaults.SCHEMA_VERSION, pkg: pkg };
      const chrome = _mapV2CanvasSettings(payload);
      assignSection(v3, "canv", chrome.canv);
      assignSection(v3, "sett", chrome.sett);
      const headerFooter = _mapV2Chrome.mapV2HeaderFooter(payload);
      assignSection(v3, "head", headerFooter.head);
      assignSection(v3, "foot", headerFooter.foot);
      assignSection(v3, "tabs", _mapV2Chrome.mapV2Tabs(payload.tabs));
      assignSection(v3, "filt", _mapV2Filters(_KDB, payload, _diagnostics));
      assignSection(v3, "wgts", _mapV2Widgets(payload, _diagnostics));
      return v3;
    } catch (error) {
      if (error && error.name === "WritebackError") {
        throw error;
      }
      throw _errorCodes.createWritebackError(
        _errorCodes.codes.WRITEBACK_UNSUPPORTED_LEGACY_FORMAT,
        "map",
        "v2 map failed",
        { error: error && error.message ? error.message : String(error) }
      );
    }
  }

  return mapV2ToV3;
});
