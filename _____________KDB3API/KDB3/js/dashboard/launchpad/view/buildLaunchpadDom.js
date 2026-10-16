define([
  "../config/padConfig.js"
], function (_padConfig) {
  function __controller(_KDB, _descriptorModel, _options) {
    const ownerDocument = resolveOwnerDocument(_KDB, _options);
    const descriptorModel = _descriptorModel || {};
    const hideSpotEl = ownerDocument.createElement("div");
    const rootEl = ownerDocument.createElement("div");
    const domRefs = createDomRefs(hideSpotEl, rootEl);
    const padsByKey = {};

    hideSpotEl.id = "KDB_HideSpot";
    hideSpotEl.className = "KDB_hidden";
    hideSpotEl.setAttribute("aria-hidden", "true");
    rootEl.id = "KDB_widgetLaunchpad";
    rootEl.className = "KDB_widgetLaunchpad";
    hideSpotEl.appendChild(rootEl);
    buildPads(ownerDocument, rootEl, descriptorModel.tabs || [], domRefs, padsByKey);

    return {
      hideSpotEl: hideSpotEl,
      domRefs: domRefs,
      tabs: descriptorModel.tabs || [],
      padsByKey: padsByKey,
      helperTabIds: descriptorModel.helperTabIds || [],
      helperTabPageId: descriptorModel.helperTabPageId || null
    };
  }

  function resolveOwnerDocument(_KDB, _options) {
    const options = _options || {};

    if (options.ownerDocument) {
      return options.ownerDocument;
    }

    const hostSelector = readHostSelector(_KDB);
    const hostEl = hostSelector && typeof document !== "undefined" && typeof document.querySelector === "function" ? document.querySelector(hostSelector) : null;
    if (hostEl && hostEl.ownerDocument) {
      return hostEl.ownerDocument;
    }

    if (typeof document !== "undefined" && document.body) {
      return document;
    }

    throw new Error("Launchpad owner document is unavailable.");
  }
  function readHostSelector(_KDB) {
    const rootSelectors = _KDB && _KDB.elements && _KDB.elements.selectors ? _KDB.elements.selectors.root : null;
    if (!rootSelectors) {
      return null;
    }
    return rootSelectors.kdbWidget || null;
  }

  function createDomRefs(hideSpotEl, rootEl) {
    return {
      hideSpotEl: hideSpotEl,
      rootEl: rootEl,
      padsByKey: {},
      slotsByKey: {}
    };
  }

  function buildPads(ownerDocument, rootEl, tabs, domRefs, padsByKey) {
    const padKeys = Object.keys(_padConfig);
    let index = 0;

    while (index < padKeys.length) {
      buildPad(ownerDocument, rootEl, tabs, domRefs, padsByKey, padKeys[index]);
      index += 1;
    }
  }

  function buildPad(ownerDocument, rootEl, tabs, domRefs, padsByKey, padKey) {
    const padDefinition = _padConfig[padKey];
    const padEl = ownerDocument.createElement("div");

    padEl.id = padDefinition.elementId;
    padEl.className = padDefinition.elementId;
    padEl.setAttribute("data-kdb-launchpad-pad", padKey);
    domRefs.padsByKey[padKey] = padEl;
    padsByKey[padKey] = [];
    rootEl.appendChild(padEl);
    buildSlots(ownerDocument, padEl, tabs, domRefs, padsByKey, padKey);
  }

  function buildSlots(ownerDocument, padEl, tabs, domRefs, padsByKey, padKey) {
    let index = 0;

    while (index < tabs.length) {
      buildSlot(ownerDocument, padEl, tabs[index], domRefs, padsByKey, padKey, index);
      index += 1;
    }
  }

  function buildSlot(ownerDocument, padEl, tab, domRefs, padsByKey, padKey, childIndex) {
    const slotKey = padKey + "_" + childIndex;
    const canonicalTabId = tab.tabId || "";
    const slotEl = ownerDocument.createElement("div");

    slotEl.className = "KDB_launchpadSlot";
    slotEl.setAttribute("cor_page_id", canonicalTabId);
    slotEl.setAttribute("cor_page_index", String(childIndex));
    slotEl.setAttribute("data-kdb-launchpad-pad", padKey);
    domRefs.slotsByKey[slotKey] = slotEl;
    padsByKey[padKey].push(buildSlotMeta(tab, slotKey, childIndex, padKey));
    padEl.appendChild(slotEl);
  }

  function buildSlotMeta(tab, slotKey, childIndex, padKey) {
    return {
      aliases: readSlotAliases(tab),
      childIndex: childIndex,
      padKey: padKey,
      pageIndex: childIndex,
      pageId: tab.tabId || null,
      tabId: tab.tabId || null,
      slotKey: slotKey
    };
  }

  function readSlotAliases(tab) {
    const aliases = Array.isArray(tab.aliases) ? tab.aliases.slice() : [];

    appendAlias(aliases, tab.tabId);

    return aliases;
  }

  function appendAlias(aliases, value) {
    if (value && aliases.indexOf(value) === -1) {
      aliases.push(value);
    }
  }

  return __controller;
});
