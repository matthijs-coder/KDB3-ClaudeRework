define([
  "./config.js",
  "./state/selectors.js"
], function (_config, _selectors) {
  "use strict";

  const DOM_SELECTORS = _config.DOM_SELECTORS;

  function readDomSelectors(_KDB) {
    const selectors = _KDB && _KDB.elements && _KDB.elements.selectors ? _KDB.elements.selectors.launchpad : null;
    return selectors || DOM_SELECTORS;
  }

  function isConnectedElement(element) {
    return !!element && (element.isConnected === true || !!element.parentNode);
  }

  function ensureRuntimeDomRefs(_KDB) {
    _KDB.runtime = _KDB.runtime || {};
    _KDB.runtime.launchpad = _KDB.runtime.launchpad || {};
    _KDB.runtime.launchpad.domRefs = _KDB.runtime.launchpad.domRefs || {};
    return _KDB.runtime.launchpad;
  }

  // ---- build ---------------------------------------------------------------

  function buildLaunchpadDom(_KDB, _descriptorModel, _options) {
    const ownerDocument = resolveOwnerDocument(_KDB, _options || {});
    const descriptorModel = _descriptorModel || {};
    const tabs = descriptorModel.tabs || [];
    const hideSpotEl = ownerDocument.createElement("div");
    const rootEl = ownerDocument.createElement("div");
    const domRefs = { hideSpotEl: hideSpotEl, rootEl: rootEl, padsByKey: {}, slotsByKey: {} };
    const padsByKey = {};

    hideSpotEl.id = "KDB_HideSpot";
    hideSpotEl.className = "KDB_hidden";
    hideSpotEl.setAttribute("aria-hidden", "true");
    rootEl.id = "KDB_widgetLaunchpad";
    rootEl.className = "KDB_widgetLaunchpad";
    hideSpotEl.appendChild(rootEl);
    Object.keys(_config.PAD_CONFIG).forEach(function (padKey) {
      buildPad(ownerDocument, rootEl, tabs, domRefs, padsByKey, padKey);
    });

    return {
      hideSpotEl: hideSpotEl,
      domRefs: domRefs,
      tabs: tabs,
      padsByKey: padsByKey,
      helperTabIds: descriptorModel.helperTabIds || [],
      helperTabPageId: descriptorModel.helperTabPageId || null
    };
  }

  function resolveOwnerDocument(_KDB, options) {
    if (options.ownerDocument) { return options.ownerDocument; }

    const rootSelectors = _KDB && _KDB.elements && _KDB.elements.selectors ? _KDB.elements.selectors.root : null;
    const hostSelector = rootSelectors ? rootSelectors.kdbWidget || null : null;
    const canQuery = typeof document !== "undefined" && typeof document.querySelector === "function";
    const hostEl = hostSelector && canQuery ? document.querySelector(hostSelector) : null;
    if (hostEl && hostEl.ownerDocument) { return hostEl.ownerDocument; }
    if (typeof document !== "undefined" && document.body) { return document; }
    throw new Error("Launchpad owner document is unavailable.");
  }

  function buildPad(ownerDocument, rootEl, tabs, domRefs, padsByKey, padKey) {
    const padDefinition = _config.PAD_CONFIG[padKey];
    const padEl = ownerDocument.createElement("div");

    padEl.id = padDefinition.elementId;
    padEl.className = padDefinition.elementId;
    padEl.setAttribute("data-kdb-launchpad-pad", padKey);
    domRefs.padsByKey[padKey] = padEl;
    padsByKey[padKey] = [];
    rootEl.appendChild(padEl);
    tabs.forEach(function (tab, childIndex) {
      buildSlot(ownerDocument, padEl, tab, domRefs, padsByKey, padKey, childIndex);
    });
  }

  function buildSlot(ownerDocument, padEl, tab, domRefs, padsByKey, padKey, childIndex) {
    const slotKey = padKey + "_" + childIndex;
    const slotEl = ownerDocument.createElement("div");

    slotEl.className = "KDB_launchpadSlot";
    slotEl.setAttribute("cor_page_id", tab.tabId || "");
    slotEl.setAttribute("cor_page_index", String(childIndex));
    slotEl.setAttribute("data-kdb-launchpad-pad", padKey);
    domRefs.slotsByKey[slotKey] = slotEl;
    padsByKey[padKey].push({
      aliases: readSlotAliases(tab),
      childIndex: childIndex,
      padKey: padKey,
      pageIndex: childIndex,
      pageId: tab.tabId || null,
      tabId: tab.tabId || null,
      slotKey: slotKey
    });
    padEl.appendChild(slotEl);
  }

  function readSlotAliases(tab) {
    const aliases = Array.isArray(tab.aliases) ? tab.aliases.slice() : [];
    if (tab.tabId && aliases.indexOf(tab.tabId) === -1) { aliases.push(tab.tabId); }
    return aliases;
  }

  // ---- place / remove ------------------------------------------------------

  // Puts the built hide spot into the body. An already mounted hide spot is kept when the launchpad is
  // ready or any slot still holds a parked widget; otherwise it is replaced. Returns true when attached.
  function placeLaunchpadDom(_KDB, _buildResult) {
    const buildResult = _buildResult || {};
    if (!buildResult.hideSpotEl) { throw new Error("Launchpad hide spot was not built."); }

    const ownerDocument = buildResult.hideSpotEl.ownerDocument;
    const runtime = ensureRuntimeDomRefs(_KDB);
    const selectors = readDomSelectors(_KDB);
    const existingHideSpotEl = ownerDocument.querySelector(selectors.hideSpotSelector);

    if (isConnectedElement(existingHideSpotEl)) {
      if (shouldKeepExistingHideSpot(_KDB, existingHideSpotEl)) {
        syncRuntimeDomRefs(runtime, existingHideSpotEl, selectors);
        return existingHideSpotEl.parentNode === ownerDocument.body;
      }
      existingHideSpotEl.parentNode.removeChild(existingHideSpotEl);
    }

    ownerDocument.body.appendChild(buildResult.hideSpotEl);
    runtime.domRefs = buildResult.domRefs || {};
    return buildResult.hideSpotEl.parentNode === ownerDocument.body;
  }

  function shouldKeepExistingHideSpot(_KDB, hideSpotEl) {
    if (_selectors.readLaunchpadReady(_KDB)) { return true; }
    if (typeof hideSpotEl.querySelectorAll !== "function") { return false; }
    return Array.prototype.some.call(hideSpotEl.querySelectorAll(DOM_SELECTORS.slotSelector), function (slotEl) {
      return !!slotEl.children && slotEl.children.length > 0;
    });
  }

  function syncRuntimeDomRefs(runtime, hideSpotEl, selectors) {
    const rootEl = hideSpotEl.querySelector(selectors.rootSelector);
    runtime.domRefs = runtime.domRefs || {};
    runtime.domRefs.hideSpotEl = hideSpotEl;
    runtime.domRefs.rootEl = rootEl || hideSpotEl;
  }

  // Removes the hide spot including any widgets still parked in its slots.
  function removeLaunchpadDom(_KDB) {
    const runtime = ensureRuntimeDomRefs(_KDB);
    const hideSpotEl = runtime.domRefs.hideSpotEl;
    if (hideSpotEl && hideSpotEl.parentNode) {
      hideSpotEl.parentNode.removeChild(hideSpotEl);
    }
    runtime.domRefs = {};
  }

  return {
    readDomSelectors: readDomSelectors,
    isConnectedElement: isConnectedElement,
    buildLaunchpadDom: buildLaunchpadDom,
    placeLaunchpadDom: placeLaunchpadDom,
    removeLaunchpadDom: removeLaunchpadDom
  };
});
