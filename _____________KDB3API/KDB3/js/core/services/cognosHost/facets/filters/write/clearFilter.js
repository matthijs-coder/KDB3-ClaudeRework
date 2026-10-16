define([
  "../resolveFilterItemHandle.js",
  "../resolveFiltersHostApi.js",
  "../invalidateFilterIndexEntry.js",
  "../buildFilterOutcome.js",
  "../config/filterErrorCodes.js",
  "./serializeFilterWrite.js"
], function (
  _resolveFilterItemHandle,
  _resolveFiltersHostApi,
  _invalidateFilterIndexEntry,
  _buildFilterOutcome,
  _filterErrorCodes,
  _serializeFilterWrite
) {
  "use strict";

  function isAborted(_options) {
    return !!(_options && _options.signal && _options.signal.aborted === true);
  }

  function keySourceFromRef(_ref) {
    var ref = _ref || {};
    return {
      scopeType: "ref",
      scopeId: ref.scopeId,
      itemId: ref.itemId,
      itemName: ref.itemName
    };
  }

  async function clearOnHost(_ctx, _ref, _options) {
    var resolved;
    var filtersApi;
    if (_ctx.isDisposed()) {
      return _buildFilterOutcome.buildDisposed();
    }
    if (isAborted(_options)) {
      return _buildFilterOutcome.buildAborted("aborted");
    }
    resolved = _resolveFilterItemHandle(_ctx, _ref);
    if (!resolved.ok) {
      return _buildFilterOutcome.buildFailed(resolved.errorCode, resolved.diagnostics);
    }
    filtersApi = _resolveFiltersHostApi(_ctx._KDB);
    if (!filtersApi || typeof filtersApi.clearPageContextFilter !== "function") {
      return _buildFilterOutcome.buildFailed(_filterErrorCodes.HOST_CAPABILITY_MISSING, []);
    }
    await Promise.resolve(filtersApi.clearPageContextFilter(resolved.entry.handle));
    _invalidateFilterIndexEntry(_ctx, resolved.entry.descriptor);
    if (_ctx.isDisposed() || isAborted(_options)) {
      return _buildFilterOutcome.buildAborted("aborted-after-effect");
    }
    return _buildFilterOutcome.buildOk();
  }

  // Host form "clearValues". Deliberately a separate operation from a
  // replace-with-empty write: the host treats them differently and the owners
  // use both. Choosing between them stays owner policy.
  async function __controller(_ctx, _ref, _options) {
    if (_ctx.isDisposed()) {
      return _buildFilterOutcome.buildDisposed();
    }
    if (isAborted(_options)) {
      return _buildFilterOutcome.buildAborted("aborted");
    }
    try {
      return await _serializeFilterWrite(
        _ctx,
        keySourceFromRef(_ref),
        clearOnHost.bind(null, _ctx, _ref, _options)
      );
    } catch (error) {
      console.error("[cognosHost.filters.clearFilter] host clear failed", { ref: _ref }, error);
      return _buildFilterOutcome.buildFailed(_filterErrorCodes.WRITE_FAILED, [
        _buildFilterOutcome.buildDiagnostic(_filterErrorCodes.WRITE_FAILED, error && error.message)
      ]);
    }
  }

  return __controller;
});
