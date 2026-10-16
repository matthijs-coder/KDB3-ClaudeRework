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

  async function replaceOnHost(_ctx, _command, _values, _options) {
    var resolved;
    var filtersApi;
    if (_ctx.isDisposed()) {
      return _buildFilterOutcome.buildDisposed();
    }
    if (isAborted(_options)) {
      return _buildFilterOutcome.buildAborted("aborted");
    }
    resolved = _resolveFilterItemHandle(_ctx, _command.ref);
    if (!resolved.ok) {
      return _buildFilterOutcome.buildFailed(resolved.errorCode, resolved.diagnostics);
    }
    filtersApi = _resolveFiltersHostApi(_ctx._KDB);
    if (!filtersApi || typeof filtersApi.replaceFilterContext !== "function") {
      return _buildFilterOutcome.buildFailed(_filterErrorCodes.HOST_CAPABILITY_MISSING, []);
    }
    await Promise.resolve(filtersApi.replaceFilterContext(resolved.entry.handle, _values));
    _invalidateFilterIndexEntry(_ctx, resolved.entry.descriptor);
    if (_ctx.isDisposed() || isAborted(_options)) {
      return _buildFilterOutcome.buildAborted("aborted-after-effect");
    }
    return _buildFilterOutcome.buildOk();
  }

  // Host form "replace": values [] is a replace-with-empty, which is what the
  // owners use as their clear. The clearValues form is a separate operation.
  async function __controller(_ctx, _command, _options) {
    var command = _command || {};
    var values = Array.isArray(command.values) ? command.values : [];
    if (_ctx.isDisposed()) {
      return _buildFilterOutcome.buildDisposed();
    }
    if (isAborted(_options)) {
      return _buildFilterOutcome.buildAborted("aborted");
    }
    try {
      return await _serializeFilterWrite(
        _ctx,
        keySourceFromRef(command.ref),
        replaceOnHost.bind(null, _ctx, command, values, _options)
      );
    } catch (error) {
      console.error("[cognosHost.filters.writeFilter] host write failed", { ref: command.ref }, error);
      return _buildFilterOutcome.buildFailed(_filterErrorCodes.WRITE_FAILED, [
        _buildFilterOutcome.buildDiagnostic(_filterErrorCodes.WRITE_FAILED, error && error.message)
      ]);
    }
  }

  return __controller;
});
