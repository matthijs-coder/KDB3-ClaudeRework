define(["../config/mutationCodes.js", "../state.js", "../slots.js"], function (_codes, _state, _slots) {
  "use strict";

  // Return contract: unlike the other tabs reducer branches this returns { state, error } instead of bare state,
  // so the saga can tell a postcondition violation (error set, state unchanged) from a committed apply (error null).
  // commitTabsState in reducer.js duck-types this shape and mirrors the error into runtime.tabs.lastTabMutationError.
  function reduceTabMutationApply(_current, _payload) {
    const current = _current || {};
    const plan = _payload && _payload.plan;
    if (!plan) { return { state: current, error: _codes.APPLY_FAILED }; }
    const byIndex = _state.cloneByIndex(current.byIndex || {});
    moveContentFields(byIndex, plan);
    if (plan.operation === "duplicate" || plan.operation === "restoreDeleted") {
      applyNamesByIndexAfter(byIndex, plan);
      revealSlot(byIndex, plan);
    } else if (plan.operation === "move") {
      applyNamesByIndexAfter(byIndex, plan);
    } else if (plan.hideSlot) {
      hideSlot(byIndex, plan);
    }
    Object.keys(byIndex).forEach(function (key) {
      byIndex[key] = Object.assign({}, byIndex[key], { isActive: Number(key) === plan.landing.index });
    });
    if (!passesPostcondition(byIndex, current, plan)) { return { state: current, error: _codes.POSTCONDITION_FAILED }; }
    const next = Object.assign({}, current, {
      byIndex: byIndex,
      visibleOrder: _state.buildVisibleOrder(byIndex, current.order || [], current),
      activeIndex: plan.landing.index,
      activeTabId: plan.landing.tabId || null,
      currentTabId: plan.landing.tabId || null,
      // Parity with the parameterSet apply: a committed mutation ends any rename edit session
      // and unchecks the kdbControl toolbox radio.
      toolboxTabEditLineIndex: null,
      selectedTool: null,
      errorCode: null,
      errorMessage: null
    });
    next.editUi = _state.clearEditSessionFields(current.editUi);
    return { state: next, error: null };
  }

  function moveContentFields(byIndex, plan) {
    const snapshot = {};
    plan.slotMoves.forEach(function (move) {
      const fromKey = String(move.fromIndex);
      if (!snapshot[fromKey] && byIndex[fromKey]) { snapshot[fromKey] = extractContentFields(byIndex[fromKey]); }
    });
    plan.slotMoves.forEach(function (move) {
      const fromKey = String(move.fromIndex);
      const toKey = String(move.toIndex);
      if (!byIndex[fromKey] || !byIndex[toKey]) { return; }
      byIndex[toKey] = applyContentFields(byIndex[toKey], snapshot[fromKey] || byIndex[fromKey]);
    });
  }

  function applyNamesByIndexAfter(byIndex, plan) {
    const names = plan.names && plan.names.byIndexAfter;
    if (!names) { return; }
    Object.keys(names).forEach(function (key) {
      if (byIndex[key]) { byIndex[key] = Object.assign({}, byIndex[key], { name: names[key] }); }
    });
  }

  function revealSlot(byIndex, plan) {
    const key = String(plan.revealSlot.index);
    if (!byIndex[key]) { return; }
    byIndex[key] = Object.assign({}, byIndex[key], {
      visible: true,
      button: Object.assign({}, byIndex[key].button || {}, { visible: true })
    });
  }

  function hideSlot(byIndex, plan) {
    const key = String(plan.hideSlot.index);
    if (!byIndex[key]) { return; }
    byIndex[key] = Object.assign({}, byIndex[key], {
      name: plan.hideSlot.baselineName,
      visible: false,
      button: Object.assign({}, byIndex[key].button || {}, { visible: false })
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

  function countVisibleDashboardTabs(byIndex, current) {
    const order = Array.isArray(current.order) ? current.order : [];
    return order.reduce(function (count, index) {
      const tab = byIndex[String(index)];
      return _slots.isDashboardTab(tab, current) && tab.visible === true ? count + 1 : count;
    }, 0);
  }

  // Visible tabs stay a contiguous prefix; a move keeps every slot's visibility, duplicate and restoreDeleted
  // add exactly one visible slot and reveal the planned one.
  function passesPostcondition(byIndex, current, plan) {
    const order = Array.isArray(current.order) ? current.order : [];
    const minVisible = current.limits && typeof current.limits.minVisibleUserTabs === "number" ? current.limits.minVisibleUserTabs : 1;
    let visibleCount = 0;
    let seenHidden = false;
    for (let position = 0; position < order.length; position += 1) {
      const tab = byIndex[String(order[position])];
      if (!_slots.isDashboardTab(tab, current)) { continue; }
      if (tab.visible !== true) {
        seenHidden = true;
      } else if (seenHidden) {
        return false;
      } else {
        visibleCount += 1;
      }
    }
    if (visibleCount < minVisible) { return false; }
    if (plan && plan.operation === "move") { return keepsVisibility(byIndex, current, order, visibleCount); }
    if (plan && (plan.operation === "duplicate" || plan.operation === "restoreDeleted")) {
      const revealTab = byIndex[String(plan.revealSlot.index)];
      const revealed = !!revealTab && revealTab.visible === true;
      return visibleCount === countVisibleDashboardTabs(current.byIndex || {}, current) + 1 && revealed;
    }
    return true;
  }

  function keepsVisibility(byIndex, current, order, visibleCount) {
    const before = current.byIndex || {};
    let beforeVisible = 0;
    for (let position = 0; position < order.length; position += 1) {
      const beforeTab = before[String(order[position])];
      const afterTab = byIndex[String(order[position])];
      if (!_slots.isDashboardTab(beforeTab, current)) { continue; }
      if (beforeTab.visible === true) { beforeVisible += 1; }
      if ((beforeTab.visible === true) !== (afterTab && afterTab.visible === true)) { return false; }
    }
    return visibleCount === beforeVisible;
  }

  return reduceTabMutationApply;
});
