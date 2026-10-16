define([
  "../../outcome.js",
  "../../errorCodes.js",
  "../../hostAccess.js",
  "../../runtime.js",
  "./filterIndex.js"
], function (_outcome, _errorCodes, _hostAccess, _runtime, _filterIndex) {
  "use strict";

  // Write ops of the filters facet. writeFilter is the host form "replace" (values [] is a
  // replace-with-empty, which the owners use as their clear); clearFilter is the separate host
  // form "clearValues". Choosing between them stays owner policy.
  var CODES = _errorCodes.filters;

  // Conflicting host writes on the same filter key are chained (second line of defence against
  // interleaved writes). The handle is resolved inside the chained work, so a waiter never reuses
  // a stale handle.
  function buildWriteKey(_ref) {
    var ref = _ref || {};
    var scope = { scopeType: "ref", scopeId: String(ref.scopeId || "") };
    return _filterIndex.buildIdKey(scope, ref.itemId) || _filterIndex.buildNameKey(scope, ref.itemName) || "";
  }

  function ignorePreviousFailure() {
    return null;
  }

  function runWork(_work) {
    return _work();
  }

  async function serializeFilterWrite(_ctx, _ref, _work) {
    var slot = _runtime.ensureRuntime(_ctx._KDB).pendingPromises.filterWritesByKey;
    var key = buildWriteKey(_ref);
    var ours;
    if (!key) {
      return _work();
    }
    ours = Promise.resolve(slot[key]).catch(ignorePreviousFailure).then(runWork.bind(null, _work));
    slot[key] = ours;
    try {
      return await ours;
    } finally {
      if (slot[key] === ours) {
        delete slot[key];
      }
    }
  }

  // Calls filtersApi[method](handle, ...extraArgs) for the resolved filter handle.
  async function applyOnHost(_ctx, _ref, _options, _method, _extraArgs) {
    var resolved;
    var filtersApi;
    if (_ctx.isDisposed()) {
      return _outcome.buildDisposed();
    }
    if (_hostAccess.isAborted(_options)) {
      return _outcome.buildAborted("aborted");
    }
    resolved = _filterIndex.resolveFilterItemHandle(_ctx, _ref);
    if (!resolved.ok) {
      return _outcome.buildFailed(resolved.errorCode, resolved.diagnostics);
    }
    filtersApi = _filterIndex.resolveFilterMethodApi(_ctx._KDB, _method);
    if (!filtersApi) {
      return _outcome.buildFailed(CODES.HOST_CAPABILITY_MISSING, []);
    }
    await Promise.resolve(filtersApi[_method].apply(filtersApi, [resolved.entry.handle].concat(_extraArgs)));
    _filterIndex.invalidateFilterIndexEntry(_ctx, resolved.entry.descriptor);
    if (_ctx.isDisposed() || _hostAccess.isAborted(_options)) {
      return _outcome.buildAborted("aborted-after-effect");
    }
    return _outcome.buildOk();
  }

  async function runWrite(_ctx, _opName, _ref, _options, _method, _extraArgs) {
    if (_ctx.isDisposed()) {
      return _outcome.buildDisposed();
    }
    if (_hostAccess.isAborted(_options)) {
      return _outcome.buildAborted("aborted");
    }
    try {
      return await serializeFilterWrite(_ctx, _ref, applyOnHost.bind(null, _ctx, _ref, _options, _method, _extraArgs));
    } catch (error) {
      console.error("[cognosHost.filters." + _opName + "] host write failed", { ref: _ref }, error);
      return _outcome.buildFailed(CODES.WRITE_FAILED, [_outcome.buildDiagnostic(CODES.WRITE_FAILED, error && error.message)]);
    }
  }

  function writeFilter(_ctx, _command, _options) {
    var command = _command || {};
    var values = Array.isArray(command.values) ? command.values : [];
    return runWrite(_ctx, "writeFilter", command.ref, _options, "replaceFilterContext", [values]);
  }

  function clearFilter(_ctx, _ref, _options) {
    return runWrite(_ctx, "clearFilter", _ref, _options, "clearPageContextFilter", []);
  }

  return {
    writeFilter: writeFilter,
    clearFilter: clearFilter
  };
});
