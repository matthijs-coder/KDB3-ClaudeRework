/*
 * Filter owner kit: the controller skeleton the filter owners share (singleSelect, sicht, specialSingleSelect,
 * dienststelle, nativeMultiSelect). It owns the lifecycle order and the error boundaries; everything that differs
 * per owner (routing, teardown, disposed results, failure reporting) comes in through `spec`.
 *
 * prepareOwnerNamespaces(_KDB, name, { createInitialState, domSelectors })
 *     Creates _KDB.state.filters / _KDB.runtime / _KDB.api, the initial state when missing and, when domSelectors is
 *     given, _KDB.elements.selectors[name].
 * createStateWriter(_KDB, name, reducer)
 *     reduce(action): _KDB.state.filters[name] = reducer(current, action); a no-op without _KDB.state.filters.
 * createOwnerController(spec) -> { mount, destroy, dispatch, getState }
 *     spec._KDB, spec.name, spec.guard (kit createDisposedGuard), spec.reduce        required
 *     spec.mount(options)          body of mount; mount returns true unless it throws
 *     spec.teardown()              owner cleanup; runs after guard.dispose(), before the replay stamp is cleared
 *     spec.route(action)           body of dispatch; its return value is the dispatch result
 *     spec.readState()             public getState; default: JSON copy of _KDB.state.filters[name]
 *     spec.destroyAction           action type reduced last in destroy (omit to skip)
 *     spec.clearsReplayContribution  true: _KDB.runtime[name].historyReplayHandlerContribution = null in destroy
 *     spec.disposedResults         { actionType: function (action) -> result } answered after destroy
 *     spec.warnOnDisposedResult    default true: warn once ("called after destroy") even when a result is returned;
 *                                  false: warn only for action types without a disposed result
 *     spec.logFailure(phase, error, action)  default console.error("[<name>.<phase>] failed", error)
 *     spec.onMountError / onDispatchError(error, action) / onDestroyError   failure reporting; dispatch returns the
 *                                  result of onDispatchError (default undefined)
 */
define([
  "../../../core/utils/kit/data.js"
], function (_kitData) {
  "use strict";

  function hasOwn(_table, _key) {
    return !!_table && Object.prototype.hasOwnProperty.call(_table, _key);
  }

  function prepareOwnerNamespaces(_KDB, _name, _options) {
    var options = _options || {};
    _KDB.state = _KDB.state || {};
    _KDB.state.filters = _KDB.state.filters || {};
    _KDB.runtime = _KDB.runtime || {};
    _KDB.api = _KDB.api || {};
    if (options.domSelectors !== undefined) {
      _KDB.elements = _KDB.elements || {};
      _KDB.elements.selectors = _KDB.elements.selectors || {};
      _KDB.elements.selectors[_name] = options.domSelectors;
    }
    if (!_KDB.state.filters[_name] && typeof options.createInitialState === "function") {
      _KDB.state.filters[_name] = options.createInitialState();
    }
  }

  function createStateWriter(_KDB, _name, _reducer) {
    return function reduceOwnerState(_action) {
      var filtersState = _KDB.state && _KDB.state.filters;
      if (filtersState) {
        filtersState[_name] = _reducer(filtersState[_name], _action);
      }
    };
  }

  function createOwnerController(_spec) {
    var spec = _spec;
    var guard = spec.guard;

    function logFailure(_phase, _error, _action) {
      if (typeof spec.logFailure === "function") {
        spec.logFailure(_phase, _error, _action);
        return;
      }
      console.error("[" + spec.name + "." + _phase + "] failed", _error);
    }

    function clearReplayContribution() {
      var runtime = spec._KDB.runtime && spec._KDB.runtime[spec.name];
      if (spec.clearsReplayContribution === true && runtime) {
        runtime.historyReplayHandlerContribution = null;
      }
    }

    function mount(_options) {
      if (guard.blocked("mount")) {
        return false;
      }
      try {
        spec.mount(_options);
        return true;
      } catch (error) {
        logFailure("mount", error);
        if (typeof spec.onMountError === "function") {
          spec.onMountError(error);
        }
        return false;
      }
    }

    function destroy() {
      if (guard.isDisposed()) {
        return;
      }
      guard.dispose();
      try {
        spec.teardown();
        clearReplayContribution();
        if (spec.destroyAction) {
          spec.reduce({ type: spec.destroyAction, payload: {} });
        }
      } catch (error) {
        logFailure("destroy", error);
        if (typeof spec.onDestroyError === "function") {
          spec.onDestroyError(error);
        }
      }
    }

    function dispatchDisposed(_action) {
      var makeResult = hasOwn(spec.disposedResults, _action.type) ? spec.disposedResults[_action.type] : null;
      if (spec.warnOnDisposedResult !== false) {
        guard.blocked("dispatch");
        return makeResult ? makeResult(_action) : undefined;
      }
      if (makeResult) {
        return makeResult(_action);
      }
      guard.blocked("dispatch");
      return undefined;
    }

    function dispatch(_action) {
      var action = _action || {};
      if (guard.isDisposed()) {
        return dispatchDisposed(action);
      }
      try {
        return spec.route(action);
      } catch (error) {
        logFailure("dispatch", error, action);
        return typeof spec.onDispatchError === "function" ? spec.onDispatchError(error, action) : undefined;
      }
    }

    function getState() {
      var filtersState;
      if (guard.isDisposed()) {
        return undefined;
      }
      if (typeof spec.readState === "function") {
        return spec.readState();
      }
      filtersState = spec._KDB.state && spec._KDB.state.filters;
      return _kitData.cloneJson((filtersState && filtersState[spec.name]) || undefined);
    }

    return { mount: mount, destroy: destroy, dispatch: dispatch, getState: getState };
  }

  return {
    prepareOwnerNamespaces: prepareOwnerNamespaces,
    createStateWriter: createStateWriter,
    createOwnerController: createOwnerController
  };
});
