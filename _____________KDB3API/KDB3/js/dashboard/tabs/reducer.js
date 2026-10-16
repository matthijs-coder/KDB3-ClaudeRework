define([
  "./config/actionTypes.js",
  "./state.js",
  "./editUi/reduce.js",
  "./restore/reduce.js",
  "./tabMutation/reduce.js"
], function (_actionTypes, _state, _editUi, _reduceParameterSetApply, _reduceTabMutationApply) {
  "use strict";

  function reduceTabsAction(_current, _action) {
    const current = _current || _state.createInitialTabsState();
    const action = _action || {};
    const payload = action.payload || {};
    switch (action.type) {
      case _actionTypes.INITIALIZE:
        return initializeState(current);
      case _actionTypes.SYNC_FROM_DOM:
        return syncFromDom(current, payload);
      case _actionTypes.ACTIVE_TAB_OBSERVED:
        return reduceActiveTabObserved(current, payload);
      case _actionTypes.HYDRATE_DOM:
        return updateHydration(current, payload);
      case _actionTypes.TRAVERSE:
        return updateTraversal(current, payload);
      case _actionTypes.ADD:
        return _editUi.addVisibleTab(current);
      case _actionTypes.SELECT_EDIT_TARGET:
        return _editUi.selectEditTarget(current, payload);
      case _actionTypes.SELECT_TOOL:
        return payload.tool === "rename" ? _editUi.setSelectedTool(current, "rename", 0) : current;
      case _actionTypes.RENAME:
        return _editUi.updateRename(current, payload);
      case _actionTypes.CANCEL_EDIT_SESSION:
        return _editUi.cancelEditSession(current);
      case _actionTypes.PARAMETER_SET_APPLY:
        return _reduceParameterSetApply(current, payload);
      case _actionTypes.TAB_MUTATION_APPLY:
        return _reduceTabMutationApply(current, payload);
      case _actionTypes.AUTHORING_ENTERED:
        return _state.copyObject(current, { isAuthoringView: true });
      case _actionTypes.AUTHORING_EXITED:
        return _state.copyObject(current, { isAuthoringView: false });
      case _actionTypes.ERROR:
        return _state.copyObject(current, {
          lifecycle: "error",
          errorCode: payload.errorCode || "TABS_ERROR",
          errorMessage: payload.errorMessage || null
        });
      case _actionTypes.DESTROY:
        return _state.copyObject(current, { lifecycle: "disposed", pendingOperation: null, editUi: _state.createEditUiState() });
      default:
        return current;
    }
  }

  // Applies one action to _KDB.state.tabs; returns true when the state changed.
  // A tab-mutation reducer error keeps the old state, is mirrored into runtime.tabs.lastTabMutationError and reports false.
  function commitTabsState(_KDB, _action) {
    const current = _KDB.state.tabs;
    const reduced = reduceTabsAction(current, _action);
    const runtime = _KDB.runtime && _KDB.runtime.tabs;
    if (reduced && reduced.state && Object.prototype.hasOwnProperty.call(reduced, "error")) {
      if (runtime) { runtime.lastTabMutationError = reduced.error || null; }
      if (reduced.error) { return false; }
      _KDB.state.tabs = reduced.state;
      return reduced.state !== current;
    }
    if (runtime) { runtime.lastTabMutationError = null; }
    if (reduced === current) { return false; }
    _KDB.state.tabs = reduced;
    return true;
  }

  function initializeState(_current) {
    const next = _state.createInitialTabsState(_current);
    next.lifecycle = "initializing";
    return next;
  }

  function syncFromDom(_current, _payload) {
    const byIndex = seedSyncFromDomActivation(
      _current.byIndex,
      _state.cloneByIndex(_payload.byIndex || {}),
      _state.valueOrNull(_payload.activeIndex),
      _payload.lastSyncedAt
    );
    const order = Array.isArray(_payload.order) ? _payload.order.slice() : [];
    const visibleOrder = Array.isArray(_payload.visibleOrder) ? _payload.visibleOrder.slice() : _state.buildVisibleOrder(byIndex, order);
    const next = _state.copyObject(_current, {
      lifecycle: _current.lifecycle === "error" ? "ready" : _current.lifecycle,
      byIndex: byIndex,
      order: order,
      visibleOrder: visibleOrder,
      activeIndex: _state.valueOrNull(_payload.activeIndex),
      activeTabId: _payload.activeTabId || null,
      currentTabId: _payload.currentTabId || _payload.activeTabId || null,
      helperTab: _state.cloneHelperTab(_payload.helperTab || _current.helperTab),
      hydration: _state.copyObject(_current.hydration, { lastSyncedAt: _payload.lastSyncedAt || Date.now() }),
      errorCode: null,
      errorMessage: null
    });
    return _state.copyObject(next, { editUi: _editUi.recomputeEditUi(next, _state.clearEditSessionFields(_current.editUi)) });
  }

  function updateHydration(_current, _payload) {
    return _state.copyObject(_current, {
      hydration: _state.copyObject(_current.hydration, {
        lifecycle: _state.phaseToLifecycle(_payload.phase),
        helperDomHydrated: _payload.helperDomHydrated === true,
        errorCode: _payload.errorCode || null,
        errorMessage: _payload.errorMessage || null
      })
    });
  }

  function updateTraversal(_current, _payload) {
    const canvasLoadedByIndex = _payload.canvasLoadedByIndex || {};
    const byIndex = _state.cloneByIndex(_current.byIndex);
    const activationSource = _payload.activationSource || _payload.source || null;
    const activatedAt = _payload.phase === "confirmed" ? Date.now() : null;
    Object.keys(canvasLoadedByIndex).forEach(function (key) {
      if (byIndex[key] && canvasLoadedByIndex[key] === true) {
        byIndex[key] = _state.copyObject(byIndex[key], {
          isCanvasLoaded: true,
          hasBeenActivated: true,
          activatedAt: activatedAt,
          activatedBy: activationSource,
          canvasLoadedAt: activatedAt,
          canvasLoadSource: activationSource
        });
      }
    });
    const failed = _payload.phase === "failed";
    const rootLifecycle = _payload.phase === "confirmed" ? "ready" : _current.lifecycle;
    return _state.copyObject(_current, {
      lifecycle: failed ? "error" : rootLifecycle,
      byIndex: byIndex,
      traversal: _state.copyObject(_current.traversal, {
        lifecycle: _state.phaseToLifecycle(_payload.phase),
        traversedIndexes: Array.isArray(_payload.traversedIndexes) ? _payload.traversedIndexes.slice() : [],
        lastTraversedAt: _payload.lastTraversedAt || null,
        scope: _payload.scope || _current.traversal.scope || null,
        source: _payload.source || _current.traversal.source || null,
        errorCode: _payload.errorCode || null,
        errorMessage: _payload.errorMessage || null
      }),
      activeIndex: _state.valueOrNull(_payload.activeIndex) != null ? _payload.activeIndex : _current.activeIndex,
      activeTabId: _payload.activeTabId || _current.activeTabId,
      currentTabId: _payload.currentTabId || _payload.activeTabId || _current.currentTabId,
      errorCode: failed ? _payload.errorCode || "TABS_TRAVERSE_FAILED" : _current.errorCode,
      errorMessage: failed ? _payload.errorMessage || null : _current.errorMessage
    });
  }

  // Commits an activation change detected by the DOM observer: no visibility mutation and no traversal-state
  // overwrite. Returns the same state reference for no-op selections.
  function reduceActiveTabObserved(_current, _payload) {
    const tabIndex = normalizeTabIndex(_payload.tabIndex);
    if (tabIndex == null || tabIndex === _current.activeIndex) { return _current; }
    const key = String(tabIndex);
    if (!_current.byIndex || !_current.byIndex[key]) { return _current; }
    const observedAt = _payload.observedAt || Date.now();
    const source = _payload.source || null;
    const byIndex = {};
    Object.keys(_current.byIndex).forEach(function (indexKey) {
      byIndex[indexKey] = withActiveFlag(_current.byIndex[indexKey], indexKey === key, observedAt, source);
    });
    return Object.assign({}, _current, {
      byIndex: byIndex,
      activeIndex: tabIndex,
      activeTabId: byIndex[key].tabId || null,
      currentTabId: byIndex[key].tabId || null
    });
  }

  function withActiveFlag(tab, isActive, observedAt, source) {
    const next = Object.assign({}, tab, { isActive: isActive });
    if (isActive && next.hasBeenActivated !== true) {
      next.hasBeenActivated = true;
      next.activatedAt = observedAt;
      next.activatedBy = source;
    }
    return next;
  }

  // syncFromDom rebuilds byIndex from the DOM, which knows nothing about hasBeenActivated: carry the monotone
  // activation flags over from the previous state and seed the initially active tab, so the startup tab never
  // reports firstActivation: true.
  function seedSyncFromDomActivation(_previousByIndex, _nextByIndex, _activeIndex, _syncedAt) {
    const previousByIndex = _previousByIndex || {};
    const nextByIndex = _nextByIndex || {};
    Object.keys(nextByIndex).forEach(function (indexKey) {
      const previousTab = previousByIndex[indexKey];
      if (previousTab && previousTab.hasBeenActivated === true) {
        nextByIndex[indexKey] = Object.assign({}, nextByIndex[indexKey], {
          hasBeenActivated: true,
          activatedAt: previousTab.activatedAt || null,
          activatedBy: previousTab.activatedBy || null
        });
      }
    });
    const activeKey = _activeIndex == null ? null : String(_activeIndex);
    if (activeKey && nextByIndex[activeKey] && nextByIndex[activeKey].hasBeenActivated !== true) {
      nextByIndex[activeKey] = Object.assign({}, nextByIndex[activeKey], {
        hasBeenActivated: true,
        activatedAt: _syncedAt || Date.now(),
        activatedBy: "syncFromDom"
      });
    }
    return nextByIndex;
  }

  function normalizeTabIndex(value) {
    return typeof value === "number" && value >= 0 && value === Math.floor(value) ? value : null;
  }

  return { reduceTabsAction: reduceTabsAction, commitTabsState: commitTabsState };
});
