define(["./outcome.js", "./hostAccess.js"], function (_outcome, _hostAccess) {
  "use strict";

  // Skeleton shared by the facet operations that call one host theme method: disposed -> aborted ->
  // INVALID_ID -> host lookup -> call -> Outcome. A facet op supplies a spec:
  //   { codes, theme, method, label, info, call(api), errorCode? (sync), okData? / onError? (write) }
  // `call` runs the host call (keep `this`: invoke api[method] itself) and returns the result, or
  // hostFail(code) for a failure it detects midway (nested host object missing).

  function HostFailure(_outcomeValue) {
    this.outcome = _outcomeValue;
  }

  function hostFail(_errorCode) {
    return new HostFailure(_outcome.buildFailed(_errorCode, []));
  }

  function guardRead(_ctx, _valid, _codes) {
    if (_ctx.isDisposed()) {
      return _outcome.buildDisposed();
    }
    if (!_valid) {
      return _outcome.buildFailed(_codes.INVALID_ID, []);
    }
    return null;
  }

  function guardWrite(_ctx, _options, _valid, _codes) {
    if (_ctx.isDisposed()) {
      return _outcome.buildDisposed();
    }
    if (_hostAccess.isAborted(_options)) {
      return _outcome.buildAborted("aborted");
    }
    if (!_valid) {
      return _outcome.buildFailed(_codes.INVALID_ID, []);
    }
    return null;
  }

  function failedOutcome(_spec, _errorCode, _error) {
    console.error("[cognosHost." + _spec.label + "] failed", _spec.info, _error);
    return _outcome.buildFailed(_errorCode, [_outcome.buildDiagnostic(_errorCode, _error && _error.message)]);
  }

  // Synchronous host call; the result becomes the Outcome data. errorCode defaults to READ_FAILED.
  function runSync(_ctx, _spec) {
    var resolved = _hostAccess.resolveHostMethod(_ctx._KDB, _spec.theme, _spec.method, _spec.codes);
    var result;
    if (resolved.failure) {
      return resolved.failure;
    }
    try {
      result = _spec.call(resolved.api);
      return result instanceof HostFailure ? result.outcome : _outcome.buildOk(result);
    } catch (error) {
      return failedOutcome(_spec, _spec.errorCode || _spec.codes.READ_FAILED, error);
    }
  }

  // Awaited host effect with the post-effect abort check; failures are WRITE_FAILED unless onError
  // returns its own Outcome for a recognised error.
  async function runWrite(_ctx, _options, _spec) {
    var resolved = _hostAccess.resolveHostMethod(_ctx._KDB, _spec.theme, _spec.method, _spec.codes);
    var step;
    var custom;
    if (resolved.failure) {
      return resolved.failure;
    }
    try {
      step = _spec.call(resolved.api);
      if (step instanceof HostFailure) {
        return step.outcome;
      }
      await Promise.resolve(step);
      if (_ctx.isDisposed() || _hostAccess.isAborted(_options)) {
        return _outcome.buildAborted("aborted-after-effect");
      }
      return _outcome.buildOk(_spec.okData);
    } catch (error) {
      custom = _spec.onError ? _spec.onError(error) : null;
      if (custom) {
        console.error("[cognosHost." + _spec.label + "] failed", _spec.info, error);
        return custom;
      }
      return failedOutcome(_spec, _spec.codes.WRITE_FAILED, error);
    }
  }

  // guard + run in one call; early exits of a write are still delivered as a promise.
  function readOp(_ctx, _valid, _spec) {
    return guardRead(_ctx, _valid, _spec.codes) || runSync(_ctx, _spec);
  }

  function writeOp(_ctx, _options, _valid, _spec) {
    var early = guardWrite(_ctx, _options, _valid, _spec.codes);
    return early ? Promise.resolve(early) : runWrite(_ctx, _options, _spec);
  }

  return {
    hostFail: hostFail,
    guardWrite: guardWrite,
    runSync: runSync,
    runWrite: runWrite,
    readOp: readOp,
    writeOp: writeOp
  };
});
