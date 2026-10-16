define([], function () {
  function __controller(_KDB, _slotMeta) {
    try {
      return resolveSlotElement(_KDB, _slotMeta);
    } catch (err) {
      console.error("[launchpad.resolveSlotWidgetElement] failed", err);
      throw err;
    }
  }

  function resolveSlotElement(_KDB, slotMeta) {
    const runtime = _KDB && _KDB.runtime && _KDB.runtime.launchpad ? _KDB.runtime.launchpad : null;
    const domRefs = runtime && runtime.domRefs ? runtime.domRefs : null;
    if (domRefs && domRefs.slotsByKey && slotMeta.slotKey && domRefs.slotsByKey[slotMeta.slotKey]) {
      return domRefs.slotsByKey[slotMeta.slotKey];
    }
    const rootEl = resolveLaunchpadRoot(_KDB, domRefs);
    if (!rootEl || typeof rootEl.querySelector !== "function") {
      return null;
    }
    const selector = buildSlotSelector(slotMeta);
    return selector ? rootEl.querySelector(selector) : null;
  }

  function resolveLaunchpadRoot(_KDB, domRefs) {
    if (domRefs && domRefs.rootEl) {
      return domRefs.rootEl;
    }
    const hideSpotEl = domRefs && domRefs.hideSpotEl ? domRefs.hideSpotEl : resolveHideSpotElement(_KDB);
    const selectors = readLaunchpadSelectors(_KDB);
    if (hideSpotEl && selectors.rootSelector && typeof hideSpotEl.querySelector === "function") {
      return hideSpotEl.querySelector(selectors.rootSelector) || hideSpotEl;
    }
    return hideSpotEl;
  }

  function resolveHideSpotElement(_KDB) {
    const selectors = readLaunchpadSelectors(_KDB);
    const ownerDocument = resolveOwnerDocument(_KDB);
    if (!ownerDocument || typeof ownerDocument.querySelector !== "function") {
      return null;
    }
    return selectors.hideSpotSelector ? ownerDocument.querySelector(selectors.hideSpotSelector) : null;
  }

  function buildSlotSelector(slotMeta) {
    const pageIndex = slotMeta.pageIndex != null ? slotMeta.pageIndex : slotMeta.childIndex;
    if (!slotMeta.padKey || !slotMeta.tabId || pageIndex == null) {
      return null;
    }
    return '[data-kdb-launchpad-pad="' + escapeAttribute(slotMeta.padKey) + '"][cor_page_id="' + escapeAttribute(slotMeta.tabId) + '"][cor_page_index="' + escapeAttribute(String(pageIndex)) + '"]';
  }

  function readLaunchpadSelectors(_KDB) {
    if (_KDB && _KDB.elements && _KDB.elements.selectors && _KDB.elements.selectors.launchpad) {
      return _KDB.elements.selectors.launchpad;
    }
    return { hideSpotSelector: "#KDB_HideSpot", rootSelector: "#KDB_widgetLaunchpad" };
  }

  function resolveOwnerDocument(_KDB) {
    const legacyHostEl = _KDB && _KDB.elements ? _KDB.elements.kdbWidget : null;
    if (legacyHostEl && legacyHostEl.ownerDocument) {
      return legacyHostEl.ownerDocument;
    }
    return typeof document !== "undefined" ? document : null;
  }

  function escapeAttribute(value) {
    return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  return __controller;
});
