define(["./copyTabsState.js"], function (_copyTabsState) {
  "use strict";

  function updateTraversal(_state, _payload) {
    const canvasLoadedByIndex = _payload.canvasLoadedByIndex || {};
    const byIndex = _copyTabsState.cloneByIndex(_state.byIndex);
    const activationSource = _payload.activationSource || _payload.source || null;
    const activatedAt = _payload.phase === "confirmed" ? Date.now() : null;
    Object.keys(canvasLoadedByIndex).forEach(function (key) {
      if (byIndex[key] && canvasLoadedByIndex[key] === true) {
        byIndex[key] = _copyTabsState.copyObject(byIndex[key], {
          isCanvasLoaded: true,
          hasBeenActivated: true,
          activatedAt: activatedAt,
          activatedBy: activationSource,
          canvasLoadedAt: activatedAt,
          canvasLoadSource: activationSource
        });
      }
    });
    const rootLifecycle = _payload.phase === "confirmed" ? "ready" : _state.lifecycle;
    return _copyTabsState.copyRoot(_state, {
      lifecycle: _payload.phase === "failed" ? "error" : rootLifecycle,
      byIndex: byIndex,
      traversal: _copyTabsState.copyObject(_state.traversal, {
        lifecycle: _copyTabsState.phaseToLifecycle(_payload.phase),
        traversedIndexes: Array.isArray(_payload.traversedIndexes) ? _payload.traversedIndexes.slice() : [],
        lastTraversedAt: _payload.lastTraversedAt || null,
        scope: _payload.scope || _state.traversal.scope || null,
        source: _payload.source || _state.traversal.source || null,
        errorCode: _payload.errorCode || null,
        errorMessage: _payload.errorMessage || null
      }),
      activeIndex: _copyTabsState.valueOrNull(_payload.activeIndex) != null ? _payload.activeIndex : _state.activeIndex,
      activeTabId: _payload.activeTabId || _state.activeTabId,
      currentTabId: _payload.currentTabId || _payload.activeTabId || _state.currentTabId,
      errorCode: _payload.phase === "failed" ? _payload.errorCode || "TABS_TRAVERSE_FAILED" : _state.errorCode,
      errorMessage: _payload.phase === "failed" ? _payload.errorMessage || null : _state.errorMessage
    });
  }

  return { updateTraversal: updateTraversal };
});
