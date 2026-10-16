define(["./createInitialTabsState.js", "./reduceActiveTabObserved.js", "./copyTabsState.js", "./reduceTabsRename.js"], function (_createInitialTabsState, _reduceActiveTabObserved, _copyTabsState, _reduceTabsRename) {
  "use strict";

  function initializeState(_state) {
    const next = _createInitialTabsState(_state);
    next.lifecycle = "initializing";
    return next;
  }

  function syncFromDom(_state, _payload) {
    const byIndex = _reduceActiveTabObserved.seedSyncFromDomActivation(_state.byIndex, _copyTabsState.cloneByIndex(_payload.byIndex || {}), _copyTabsState.valueOrNull(_payload.activeIndex), _payload.lastSyncedAt);
    const order = Array.isArray(_payload.order) ? _payload.order.slice() : [];
    const visibleOrder = Array.isArray(_payload.visibleOrder) ? _payload.visibleOrder.slice() : _copyTabsState.buildVisibleOrder(byIndex, order);
    const next = _copyTabsState.copyRoot(_state, {
      lifecycle: _state.lifecycle,
      byIndex: byIndex,
      order: order,
      visibleOrder: visibleOrder,
      activeIndex: _copyTabsState.valueOrNull(_payload.activeIndex),
      activeTabId: _payload.activeTabId || null,
      currentTabId: _payload.currentTabId || _payload.activeTabId || null,
      helperTab: _copyTabsState.cloneHelperTab(_payload.helperTab || _state.helperTab),
      hydration: _copyTabsState.copyObject(_state.hydration, { lastSyncedAt: _payload.lastSyncedAt || Date.now() }),
      errorCode: null,
      errorMessage: null
    });
    return _copyTabsState.copyRoot(next, { editUi: _reduceTabsRename.recomputeEditUi(next, _reduceTabsRename.clearEditSessionFields(_state.editUi)) });
  }

  function updateHydration(_state, _payload) {
    return _copyTabsState.copyRoot(_state, {
      hydration: _copyTabsState.copyObject(_state.hydration, {
        lifecycle: _copyTabsState.phaseToLifecycle(_payload.phase),
        helperDomHydrated: _payload.helperDomHydrated === true,
        errorCode: _payload.errorCode || null,
        errorMessage: _payload.errorMessage || null
      })
    });
  }

  return {
    initializeState: initializeState,
    syncFromDom: syncFromDom,
    updateHydration: updateHydration
  };
});
