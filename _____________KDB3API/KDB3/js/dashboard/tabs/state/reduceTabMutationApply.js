define([
  "../config/mutationCodes.js",
  "./tabMutationPostconditions.js",
  "../slots.js"
], function (_codes, _passesPostcondition, _slots) {
  "use strict";

  // Return contract: unlike the other tabs reducer branches this returns
  // { state, error } instead of bare state — the saga must distinguish a
  // postcondition violation (error set, state unchanged) from a committed
  // apply (error null). dispatchState in createTabsController.js duck-types
  // this shape and mirrors error into runtime.lastTabMutationError.
  function reduceTabMutationApply(_state, _payload) {
    var state = _state || {};
    var plan = _payload && _payload.plan;
    if (!plan) { return { state: state, error: _codes.APPLY_FAILED }; }
    var byIndex = cloneByIndex(state.byIndex || {});
    var snapshot = {};
    plan.slotMoves.forEach(function (move) {
      var fromKey = String(move.fromIndex);
      if (!snapshot[fromKey] && byIndex[fromKey]) { snapshot[fromKey] = extractContentFields(byIndex[fromKey]); }
    });
    plan.slotMoves.forEach(function (move) {
      var fromKey = String(move.fromIndex);
      var toKey = String(move.toIndex);
      if (!byIndex[fromKey] || !byIndex[toKey]) { return; }
      byIndex[toKey] = applyContentFields(byIndex[toKey], snapshot[fromKey] || byIndex[fromKey]);
    });
    if (plan.operation === "duplicate" || plan.operation === "restoreDeleted") {
      applyNamesByIndexAfter(byIndex, plan);
      revealDuplicateTailSlot(byIndex, plan);
    } else if (plan.operation === "move") {
      applyNamesByIndexAfter(byIndex, plan);
    } else if (plan.hideSlot) {
      var hideKey = String(plan.hideSlot.index);
      if (byIndex[hideKey]) {
        byIndex[hideKey] = Object.assign({}, byIndex[hideKey], {
          name: plan.hideSlot.baselineName,
          visible: false,
          button: Object.assign({}, byIndex[hideKey].button || {}, { visible: false })
        });
      }
    }
    Object.keys(byIndex).forEach(function (key) {
      byIndex[key] = Object.assign({}, byIndex[key], { isActive: Number(key) === plan.landing.index });
    });
    if (!_passesPostcondition(byIndex, state, plan)) { return { state: state, error: _codes.POSTCONDITION_FAILED }; }
    var next = Object.assign({}, state, {
      byIndex: byIndex,
      visibleOrder: buildVisibleOrder(byIndex, state.order || [], state),
      activeIndex: plan.landing.index,
      activeTabId: plan.landing.tabId || null,
      currentTabId: plan.landing.tabId || null,
      // Parity with reduceParameterSetApply: a committed mutation ends any
      // rename edit session and unchecks the kdbControl toolbox radio.
      toolboxTabEditLineIndex: null,
      selectedTool: null,
      errorCode: null,
      errorMessage: null
    });
    next.editUi = clearEditSessionFields(state.editUi);
    return { state: next, error: null };
  }

  function applyNamesByIndexAfter(byIndex, plan) {
    var names = plan.names && plan.names.byIndexAfter;
    if (!names) { return; }
    Object.keys(names).forEach(function (key) {
      if (byIndex[key]) { byIndex[key] = Object.assign({}, byIndex[key], { name: names[key] }); }
    });
  }

  function revealDuplicateTailSlot(byIndex, plan) {
    var revealKey = String(plan.revealSlot.index);
    if (!byIndex[revealKey]) { return; }
    byIndex[revealKey] = Object.assign({}, byIndex[revealKey], {
      visible: true,
      button: Object.assign({}, byIndex[revealKey].button || {}, { visible: true })
    });
  }

  function extractContentFields(tab) {
    return { name: tab.name, visible: tab.visible === true, button: Object.assign({}, tab.button || {}) };
  }

  function applyContentFields(target, source) {
    return Object.assign({}, target, {
      name: source.name,
      visible: source.visible === true,
      button: Object.assign({}, target.button || {}, source.button || {}, { visible: source.visible === true })
    });
  }

  function buildVisibleOrder(byIndex, order, state) {
    return (order || []).filter(function (index) {
      var tab = byIndex[String(index)];
      return _slots.isDashboardTab(tab, state) && tab.visible === true;
    });
  }

  function clearEditSessionFields(editUi) {
    return Object.assign({}, editUi || {}, {
      activeTool: null, sessionTabIndex: null, sessionTabId: null,
      isEditingLabel: false, errorCode: null, errorMessage: null
    });
  }

  function cloneByIndex(byIndex) {
    var clone = {};
    Object.keys(byIndex || {}).forEach(function (key) {
      clone[key] = Object.assign({}, byIndex[key], {
        button: Object.assign({}, byIndex[key] && byIndex[key].button || {}),
        edit: Object.assign({}, byIndex[key] && byIndex[key].edit || {})
      });
    });
    return clone;
  }

  return reduceTabMutationApply;
});
