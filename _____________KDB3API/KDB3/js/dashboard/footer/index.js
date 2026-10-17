define([
  "./config.js",
  "./state.js",
  "./state/selectors.js",
  "./view.js",
  "./effects.js",
  "./mountTarget.js",
  "./history.js",
  "./restore.js",
  "../header/events/eventNames.js",
  "../tabs/events/eventNames.js",
  "../../core/utils/kit/runtime.js",
  "../../core/utils/kit/errors.js",
  "../../core/utils/kit/history.js"
], function (
  _config,
  _state,
  _selectors,
  _view,
  _effects,
  _mountTarget,
  _history,
  _restore,
  _headerEvents,
  _tabsEvents,
  _rt,
  _errors,
  _historyKit
) {
  "use strict";

  var REPLAY_KEYS = ["footer_chromeChange"];

  // Lifecycle terms: idle, mounted, disposed. `status` (`idle`|`active`|`removed`) is domain chrome presence.

  function isValidSource(_source) {
    return typeof _source === "string" && _config.VALID_SOURCES[_source] === 1;
  }

  function isActivation(_type, _state) {
    return (_type === "footer/toggle" || _type === "footer/show") && _state.status !== "active";
  }

  function createFooterController(_KDB) {
    var guard = _errors.createDisposedGuard("footer");
    var rt = _rt.ensureRuntime(_KDB, "footer");

    function isDisposed() {
      return guard.isDisposed();
    }

    function runEffectsAfterMountTarget() {
      _effects.runFooterEffects(_KDB, null, _KDB.state.footer);
    }

    function commitAction(_action) {
      var current = _KDB.state.footer;
      if (isActivation(_action.type, current) && _selectors.readHeaderStatus(_KDB) !== "active") return false;
      var next = _state.reduceFooter(current, _action);
      if (next === current) return false;
      _KDB.state.footer = next;
      if (next.status === "active" && !_mountTarget.ensureFooterMountTarget(_KDB)) {
        _mountTarget.waitForFooterMountTarget(_KDB, isDisposed, runEffectsAfterMountTarget);
      }
      _effects.runFooterEffects(_KDB, _action, current);
      _history.pushFooterHistoryStep(_KDB, _action, current, next, _action.options || null);
      return true;
    }

    function dispatch(_action) {
      if (guard.isDisposed() || !_action) return false;
      try {
        if (_action.type === "footer/parameterSetRestoreRequested") {
          return _restore.restoreFooterParameterSet(_KDB, commitAction, _action);
        }
        var payload = _action.payload || {};
        if (!isValidSource(payload.source)) return false;
        return commitAction(_action);
      } catch (err) {
        console.error("[footer.dispatch] " + _action.type + " failed", err);
        return false;
      }
    }

    function getState() {
      return _KDB.state.footer;
    }

    // Header changes reach the footer only through this event: hide with the header, resync the title on commits.
    function onHeaderConfirmed(_payload) {
      if (guard.isDisposed() || !_payload || _KDB.state.footer.status !== "active") return;
      if (_payload.status === "active") _view.syncFooterView(_KDB);
      else dispatch({ type: "footer/hide", payload: { source: "bootstrap" } });
    }

    function onTabsChanged() {
      if (guard.isDisposed()) return;
      _effects.runFooterEffects(_KDB, { type: "__tabsSync", payload: { source: "bootstrap" } }, _KDB.state.footer);
    }

    function subscribeToEvents() {
      var previous = rt.abortControllers.subscriptions;
      if (previous) previous.abort();
      var scope = new AbortController();
      rt.abortControllers.subscriptions = scope;
      _KDB.events.subscribe(_headerEvents.HEADER_CONFIRMED_CHANGED, onHeaderConfirmed, { signal: scope.signal });
      _KDB.events.subscribe(_tabsEvents.CHANGED, onTabsChanged, { signal: scope.signal });
    }

    function mount(_options) {
      if (guard.blocked("mount")) return;
      if (!_KDB.services || !_KDB.services.history) {
        console.warn("[footer.mount] _KDB.services.history is not available; footer history commits are skipped.");
      }
      try {
        if (_mountTarget.ensureFooterMountTarget(_KDB, _options)) _mountTarget.abortFooterMountTargetWait(_KDB);
        else if (_KDB.state.footer.status === "active") {
          _mountTarget.waitForFooterMountTarget(_KDB, isDisposed, runEffectsAfterMountTarget);
        }
        rt.historyReplayHandlerContribution = _history.createFooterReplayHandler();
        _historyKit.registerReplayKeys(_KDB, REPLAY_KEYS, rt.historyReplayHandlerContribution);
        subscribeToEvents();
        _effects.runFooterEffects(_KDB, { type: "__mountSync", payload: { source: "bootstrap" } }, _KDB.state.footer);
      } catch (err) {
        console.error("[footer.mount]", err);
      }
    }

    function destroy() {
      if (guard.isDisposed()) return;
      guard.dispose();
      try {
        _view.removeFooterChrome(_KDB);
        var errors = _rt.disposeRuntimeBuckets(rt);
        if (errors.length) console.error("[footer.destroy] cleanup errors", errors);
        rt.historyReplayHandlerContribution = null;
      } catch (err) {
        console.error("[footer.destroy]", err);
      }
    }

    return { mount: mount, destroy: destroy, dispatch: dispatch, getState: getState };
  }

  function registerFooter(_KDB) {
    _KDB.state.footer = _KDB.state.footer || _state.createInitialFooterState();
    var rt = _rt.ensureRuntime(_KDB, "footer");
    var cognosHost = _KDB.services && _KDB.services.cognosHost;
    rt.dashboardFacet = rt.dashboardFacet || (cognosHost && cognosHost.dashboard) || null;
    _KDB.api.footer = createFooterController(_KDB);
  }

  return registerFooter;
});
