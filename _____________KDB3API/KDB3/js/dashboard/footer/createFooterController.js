define([
  "./state/createFooterReducer",
  "./state/initialState",
  "./state/selectors",
  "./effects/__orchestratorFooterEffects",
  "./events/eventNames",
  "./view/footerMountTarget",
  "./history/pushFooterHistoryStep",
  "./history/createFooterHistoryReplayHandler",
  "./actions/handleParameterSetRestore",
], function (
  _createFooterReducer,
  _initialState,
  _selectors,
  _footerEffects,
  _footerEventNames,
  _mountTarget,
  _maybePushHistory,
  _createHandler,
  _handleParameterSetRestore
) {
  "use strict";
  function stageFooterHistoryReplayHandler(_KDB) {
    var rt = _KDB.runtime && _KDB.runtime.footer;
    if (!rt) {
      return null;
    }
    var handler = _createHandler(_KDB);
    rt.historyReplayHandlerContribution = handler;
    return handler;
  }
  var SOURCE = { kdbControl: 1, api: 1, bootstrap: 1 };
  function validSource(s) {
    return typeof s === "string" && SOURCE[s];
  }
  function wouldActivate(type, cur) {
    if (type === "footer/toggle") return cur.status !== "active";
    if (type === "footer/show") return cur.status !== "active";
    return false;
  }
  function createFooterController(_KDB) {
    var reduce = _createFooterReducer();
    var disposed = false;
    function getState() {
      return _KDB.state.footer;
    }
    function readCommitOptions(action) {
      return (action && action.options) || null;
    }
    function runFooterEffectsAfterMountTarget() {
      _footerEffects(_KDB, null, _KDB.state.footer);
    }
    function commitAction(action) {
      var cur = _KDB.state.footer;
      if (wouldActivate(action.type, cur) && _selectors.readHeaderStatus(_KDB) !== "active") return false;
      var next = reduce(cur, action);
      if (next === cur) return false;
      _KDB.state.footer = next;
      if (next.status === "active" && !_mountTarget.ensureFooterMountTarget(_KDB)) {
        _mountTarget.waitForFooterMountTarget(_KDB, function () { return disposed; }, runFooterEffectsAfterMountTarget);
      }
      _footerEffects(_KDB, action, cur);
      _maybePushHistory(_KDB, action, cur, next, readCommitOptions(action));
      return true;
    }
    function dispatch(action) {
      if (disposed || !action) return false;
      if (action.type === "footer/parameterSetRestoreRequested") {
        return _handleParameterSetRestore(_KDB, { applyAction: commitAction }, action);
      }
      var p = action.payload || {};
      if (!validSource(p.source)) return false;
      return commitAction(action);
    }
    function onHeaderConfirmed(payload) {
      try {
        if (!payload || payload.status === "active") return;
        if (_KDB.state.footer.status !== "active") return;
        dispatch({ type: "footer/hide", payload: { source: "bootstrap" } });
      } catch (err) {
        console.error("[footer.headerConfirmed]", err);
      }
    }
    function onTabsChanged() {
      try {
        if (disposed) return;
        _footerEffects(_KDB, { type: "__tabsSync", payload: { source: "bootstrap" } }, _KDB.state.footer);
      } catch (err) {
        console.error("[footer.tabsChanged]", err);
      }
    }
    return {
      mount: function (options) {
        try {
          disposed = false;
          if (_mountTarget.ensureFooterMountTarget(_KDB, options)) _mountTarget.abortFooterMountTargetWait(_KDB.runtime.footer);
          else if (_KDB.state.footer.status === "active") {
            _mountTarget.waitForFooterMountTarget(_KDB, function () { return disposed; }, runFooterEffectsAfterMountTarget);
          }
          stageFooterHistoryReplayHandler(_KDB);
          var rt = _KDB.runtime.footer;
          var subs = rt.subscriptions;
          if (typeof (subs && subs.headerConfirmedChanged) === "function") subs.headerConfirmedChanged();
          if (typeof (subs && subs.tabsChanged) === "function") subs.tabsChanged();
          var bus = _KDB.events;
          if (bus && typeof bus.subscribe === "function") {
            subs.headerConfirmedChanged = bus.subscribe(_footerEventNames.HEADER_CONFIRMED_CHANGED, onHeaderConfirmed);
            subs.tabsChanged = bus.subscribe(_footerEventNames.TABS_CHANGED, onTabsChanged);
          }
          _footerEffects(_KDB, { type: "__mountSync", payload: { source: "bootstrap" } }, _KDB.state.footer);
        } catch (err2) {
          console.error("[footer.mount]", err2);
        }
      },
      destroy: function () {
        try {
          disposed = true;
          _footerEffects(_KDB, { type: "__unmount", payload: { source: "bootstrap" } }, _KDB.state.footer);
          var rt = _KDB.runtime.footer;
          _mountTarget.abortFooterMountTargetWait(rt);
          var subs = rt.subscriptions;
          if (typeof (subs && subs.headerConfirmedChanged) === "function") subs.headerConfirmedChanged();
          if (typeof (subs && subs.tabsChanged) === "function") subs.tabsChanged();
          if (subs) { subs.headerConfirmedChanged = null; subs.tabsChanged = null; }
          if (rt.domRefs && rt.domRefs.rootEl && rt.domRefs.rootEl.parentNode) {
            rt.domRefs.rootEl.parentNode.removeChild(rt.domRefs.rootEl);
          }
          rt.domRefs = {
            rootEl: null,
            barEl: null,
            dashboardTitleEl: null,
            dataAktEl: null,
            centerDateUserEl: null,
            pageIndicatorEl: null,
            mountTargetEl: null,
          };
          rt.historyReplayHandlerContribution = null;
        } catch (err3) {
          console.error("[footer.destroy]", err3);
        }
      },
      dispatch: dispatch,
      getState: getState,
    };
  }
  return createFooterController;
});
