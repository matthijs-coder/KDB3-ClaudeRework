define([
  "./config/actionTypes.js",
  "./config/defaults.js",
  "./config.js",
  "./chrome.js",
  "./slots.js",
  "./view.js",
  "./editUi/session.js",
  "./editUi/renameActions.js",
  "../../core/utils/kit/async.js",
  "../../core/utils/kit/data.js"
], function (_actionTypes, _defaults, _config, _chrome, _slots, _view, _session, _renameActions, _async, _data) {
  "use strict";

  // Effect runner for the tabs actions that touch the DOM: sync from the DOM, hydrate, rename and edit session,
  // add and authoring view. Runs behind the controller dispatch; a failing effect becomes a TABS_ERROR commit.

  const CHROME_CHECK_KEY = "tabs.primaryTabButtonSelector";

  async function applyTabsEffects(_ctx, _action) {
    const action = _action || {};
    try {
      if (action.type === _actionTypes.SYNC_FROM_DOM) { return syncStateFromDom(_ctx); }
      if (action.type === _actionTypes.HYDRATE_DOM) { return hydrateDom(_ctx); }
      if (isRenameFamily(action.type)) { return await _renameActions.applyRenameEffects(_ctx, action); }
      if (action.type === _actionTypes.ADD || action.type === _actionTypes.AUTHORING_ENTERED || action.type === _actionTypes.AUTHORING_EXITED) {
        _view.syncDomFromState(_ctx._KDB, _ctx.getRawState());
        _view.syncKdbControlView(_ctx._KDB);
      }
      return true;
    } catch (err) {
      console.error("[tabs.applyTabsEffects] effect failed", err);
      _ctx.dispatch({ type: _actionTypes.ERROR, payload: { errorCode: "TABS_EFFECT_FAILED", errorMessage: toErrorMessage(err) } });
      return false;
    }
  }

  function isRenameFamily(type) {
    return type === _actionTypes.RENAME || type === _actionTypes.SELECT_EDIT_TARGET || type === _actionTypes.CANCEL_EDIT_SESSION;
  }

  function toErrorMessage(err) {
    return err && err.message ? err.message : String(err || "Unknown tabs error.");
  }

  function syncStateFromDom(_ctx) {
    _session.cleanupEditSession(_ctx._KDB);
    const payload = buildSyncPayload(_ctx);
    _ctx.dispatch({ type: _actionTypes.SYNC_FROM_DOM, payload: payload });
    captureBaselineNames(_ctx._KDB);
    _view.syncKdbControlView(_ctx._KDB);
    return payload;
  }

  function buildSyncPayload(_ctx) {
    const containers = normalizeList(_ctx.adapter.getTabsContainers());
    const content = normalizeList(_ctx.adapter.getTabsContent());
    const buttons = _chrome.readTabButtons(_ctx._KDB);
    const byIndex = {};
    const order = [];
    let activeIndex = null;
    for (let index = 0; index <= _defaults.HELPER_TAB_INDEX; index += 1) {
      const tab = buildTabDescriptor(_ctx, containers, content, buttons, index);
      if (!tab) { continue; }
      byIndex[String(index)] = tab;
      order.push(index);
      if (tab.isActive) { activeIndex = index; }
    }
    activeIndex = activeIndex == null ? readFirstVisibleIndex(byIndex, order) : activeIndex;
    Object.keys(byIndex).forEach(function (key) { byIndex[key].isActive = Number(key) === activeIndex; });
    const activeTabId = readTabId(byIndex, activeIndex);
    return {
      byIndex: byIndex,
      order: order,
      visibleOrder: listVisibleOrder(byIndex, order),
      activeIndex: activeIndex,
      activeTabId: activeTabId,
      currentTabId: activeTabId,
      helperTab: buildHelperTab(byIndex),
      lastSyncedAt: Date.now()
    };
  }

  function buildTabDescriptor(_ctx, containers, content, buttons, index) {
    const source = containers[index] || content[index] || null;
    const button = buttons[index] || null;
    if (!source && !button && index >= _defaults.MIN_VISIBLE_USER_TABS) { return null; }
    const tabId = extractId(source, button);
    const pageId = extractPageId(source, tabId);
    const name = readTabName(_ctx, pageId, source, button, index);
    const role = _slots.readTabRole(_ctx._KDB, index);
    const isDashboard = role === "dashboard";
    const visible = isDashboard && readButtonVisible(button, index);
    return {
      index: index,
      tabId: tabId,
      pageId: pageId,
      name: name,
      role: role,
      visible: visible,
      isActive: _chrome.isButtonActive(button),
      isHelper: !isDashboard,
      isCanvasLoaded: !!content[index],
      button: { visible: visible, disabled: false, domStatus: button ? "present" : "missing" },
      edit: { canRename: isDashboard, canDelete: false, canDuplicate: false, canMove: false, canReorder: false },
      lifecycle: "idle",
      errorCode: null,
      errorMessage: null
    };
  }

  function readTabName(_ctx, pageId, source, button, index) {
    const fallback = normalizeText(button || source ? textOf(button || source) : null, "Tab " + (index + 1));
    return pageId ? normalizeText(_ctx.adapter.getTabName({ pageId: pageId }), fallback) : fallback;
  }

  function textOf(node) {
    return node.textContent || node.label || node.title || node.name;
  }

  function normalizeList(value) {
    if (!value) { return []; }
    if (Array.isArray(value)) { return value; }
    return typeof value.length === "number" ? _data.toArray(value) : [value];
  }

  function extractId(source, button) {
    const fromSource = normalizeId(source && (source.tabId || source.pageId || source.id));
    if (fromSource) { return fromSource; }
    if (!button || !button.getAttribute) { return null; }
    const sel = _config.selectors;
    return button.getAttribute(sel.tabIdAttribute) || button.getAttribute(sel.pageIdAttribute) || button.id || null;
  }

  function extractPageId(source, tabId) {
    const child = source && source.items && source.items[0];
    return normalizeId(source && source.pageId)
      || normalizeId(child && (child.pageId || child.id))
      || normalizeId(source && source.id)
      || tabId
      || null;
  }

  function readButtonVisible(button, index) {
    const isBelowMinimum = index < _defaults.MIN_VISIBLE_USER_TABS;
    return button && button.classList ? button.classList.contains(_defaults.VISIBLE_CLASS) || isBelowMinimum : isBelowMinimum;
  }

  function readFirstVisibleIndex(byIndex, order) {
    const visible = listVisibleOrder(byIndex, order);
    return visible.length > 0 ? visible[0] : null;
  }

  function listVisibleOrder(byIndex, order) {
    return order.filter(function (index) {
      const tab = byIndex[String(index)];
      return !!tab && tab.visible === true && _slots.isDashboardTab(tab);
    });
  }

  function readTabId(byIndex, index) {
    const tab = byIndex[String(index)];
    return tab && tab.tabId || null;
  }

  function buildHelperTab(byIndex) {
    const helper = byIndex[String(_defaults.HELPER_TAB_INDEX)];
    return {
      index: _defaults.HELPER_TAB_INDEX,
      tabId: helper && helper.tabId || null,
      pageId: helper && helper.pageId || null,
      lifecycle: helper ? "ready" : "idle",
      errorCode: null,
      errorMessage: null
    };
  }

  function normalizeText(value, fallback) {
    if (typeof value === "string") { return value.trim() || fallback; }
    if (value == null) { return fallback; }
    if (typeof value === "number" || typeof value === "boolean") { return String(value); }
    if (typeof value === "object") {
      return normalizeText(value.text || value.value || value.label || value.defaultValue || value.name || value.title, fallback);
    }
    return fallback;
  }

  function normalizeId(value) {
    if (typeof value === "string") { return value || null; }
    return typeof value === "number" ? String(value) : null;
  }

  // First-wins baseline capture for parameterSet reset defaults (contract delta section 4.1). Runs after a
  // successful syncFromDom commit and keeps the pre-restore dashboard tab names under
  // runtime.tabs.baselineNamesByIndex (session runtime, never persisted).
  function captureBaselineNames(_KDB) {
    const runtime = _KDB.runtime && _KDB.runtime.tabs;
    if (!runtime || runtime.baselineNamesByIndex) { return; }
    const slots = _slots.listDashboardSlots(_KDB.state && _KDB.state.tabs);
    if (!slots.some(function (tab) { return !!tab.tabId; })) { return; }
    const baselineNamesByIndex = {};
    slots.forEach(function (tab) {
      if (typeof tab.name === "string" && tab.name !== "") { baselineNamesByIndex[String(tab.index)] = tab.name; }
    });
    runtime.baselineNamesByIndex = baselineNamesByIndex;
  }

  async function hydrateDom(_ctx) {
    _ctx.dispatch({ type: _actionTypes.HYDRATE_DOM, payload: hydratePayload("pending", false, null, null) });
    try {
      const helperDomHydrated = await waitForHydration(_ctx);
      _ctx.dispatch({ type: _actionTypes.HYDRATE_DOM, payload: hydratePayload("confirmed", helperDomHydrated, null, null) });
      return helperDomHydrated;
    } catch (err) {
      console.error("[tabs.hydrateDom] hydrate failed", err);
      _ctx.dispatch({ type: _actionTypes.HYDRATE_DOM, payload: hydratePayload("failed", false, "TABS_HYDRATE_FAILED", toErrorMessage(err)) });
      return false;
    }
  }

  function hydratePayload(phase, helperDomHydrated, errorCode, errorMessage) {
    return { phase: phase, helperDomHydrated: helperDomHydrated, errorCode: errorCode, errorMessage: errorMessage };
  }

  // Polls for the tab buttons; destroy aborts the wait through runtime.abortControllers.hydrate.
  async function waitForHydration(_ctx) {
    const _KDB = _ctx._KDB;
    const checks = _KDB.runtime.cognosHost && _KDB.runtime.cognosHost.chromeChecks;
    if (checks && typeof checks.beginWait === "function") { checks.beginWait(_KDB, CHROME_CHECK_KEY); }
    const controllers = _KDB.runtime.tabs.abortControllers;
    const controller = new AbortController();
    controllers.hydrate = controller;
    const outcome = await _async.pollUntil({
      check: function () { return _chrome.readTabButtons(_KDB); },
      predicate: function (buttons) { return buttons.length > 0 || _ctx.isDisposed(); },
      timeoutMs: _defaults.HYDRATE_TIMEOUT_MS,
      intervalMs: _defaults.POLL_INTERVAL_MS,
      signal: controller.signal
    });
    if (controllers.hydrate === controller) { delete controllers.hydrate; }
    const buttons = outcome.ok ? outcome.value : [];
    const found = !!buttons[_defaults.HELPER_TAB_INDEX] || hasHelperContent();
    if (checks && typeof checks.endWait === "function") {
      checks.endWait(_KDB, CHROME_CHECK_KEY, { aborted: !!_ctx.isDisposed(), found: _chrome.readPrimaryTabButtons().length > 0 });
    }
    return found;
  }

  function hasHelperContent() {
    return typeof document !== "undefined" && !!document.querySelector && !!document.querySelector("." + _defaults.HELPER_TAB_CONTENT_CLASS);
  }

  // Cognos tabs adapter over runtime.tabs.tabsFacet (listTabs, getTabName, setTabName). Host-call errors bubble to
  // the controller boundaries; chrome clicks stay in chrome.js.
  function createCognosTabsAdapter(_deps) {
    const tabsFacet = _deps && _deps.tabsFacet;
    return {
      getTabsContainers: listTabDescriptors.bind(null, tabsFacet),
      getTabsContent: listTabDescriptors.bind(null, tabsFacet),
      getTabName: getTabName.bind(null, tabsFacet),
      setTabName: setTabName.bind(null, tabsFacet)
    };
  }

  function getTabName(tabsFacet, _tabLike) {
    ensureFacetMethod(tabsFacet, "getTabName");
    return unwrapOkData(tabsFacet.getTabName(_tabLike), "getTabName");
  }

  function setTabName(tabsFacet, _tabLike, _name) {
    ensureFacetMethod(tabsFacet, "setTabName");
    const pending = tabsFacet.setTabName(_tabLike, _name);
    if (pending && typeof pending.then === "function") {
      return pending.then(function (outcome) { return confirmedName(unwrapOkData(outcome, "setTabName"), _name); });
    }
    return confirmedName(unwrapOkData(pending, "setTabName"), _name);
  }

  function listTabDescriptors(tabsFacet) {
    ensureFacetMethod(tabsFacet, "listTabs");
    const list = unwrapOkData(tabsFacet.listTabs(), "listTabs");
    const aligned = [];
    (Array.isArray(list) ? list : []).forEach(function (dto) {
      const projected = projectTabDescriptor(dto);
      if (projected) { aligned[projected.index] = projected; }
    });
    return aligned;
  }

  function projectTabDescriptor(_dto) {
    if (!_dto || typeof _dto !== "object") { return null; }
    const id = scalarId(_dto.id);
    const hasIndex = typeof _dto.index === "number" && _dto.index >= 0 && _dto.index === Math.floor(_dto.index);
    if (!id || !hasIndex) { return null; }
    return {
      id: id,
      tabId: scalarId(_dto.tabId) || id,
      pageId: scalarId(_dto.pageId) || id,
      index: _dto.index,
      scopeId: scalarId(_dto.scopeId) || id,
      hasContent: _dto.hasContent === true
    };
  }

  function scalarId(_value) {
    if (_value == null || _value === "") { return null; }
    if (typeof _value === "string") { return _value; }
    return typeof _value === "number" ? String(_value) : null;
  }

  function confirmedName(_data, _name) {
    return _data != null && _data !== "" ? _data : _name;
  }

  function unwrapOkData(_outcome, methodName) {
    if (!_outcome || _outcome.ok !== true) { throw new Error("Cognos tabs adapter " + methodName + " failed"); }
    return _outcome.data;
  }

  function ensureFacetMethod(tabsFacet, methodName) {
    if (!tabsFacet || typeof tabsFacet[methodName] !== "function") {
      throw new Error("Cognos tabs adapter missing method: " + methodName);
    }
  }

  return { applyTabsEffects: applyTabsEffects, createCognosTabsAdapter: createCognosTabsAdapter };
});
