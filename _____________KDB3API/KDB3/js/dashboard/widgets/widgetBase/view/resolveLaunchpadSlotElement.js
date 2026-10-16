define(["./resolveOwnerDocument.js"], function (_resolveOwnerDocument) {
  function resolveLaunchpadSlotElement(_KDB, _slotMeta) {
    const slotMeta = _slotMeta || {};
    const slotSelector = buildSlotSelector(slotMeta);
    if (!slotSelector) {
      return null;
    }
    const rootEl = resolveLaunchpadRoot(_KDB);
    if (!rootEl || typeof rootEl.querySelector !== "function") {
      return null;
    }
    return rootEl.querySelector(slotSelector);
  }
  function buildSlotSelector(slotMeta) {
    const pageIndex = slotMeta && slotMeta.pageIndex != null ? slotMeta.pageIndex : slotMeta && slotMeta.childIndex;
    if (!slotMeta || !slotMeta.padKey || !slotMeta.tabId || pageIndex == null) {
      return null;
    }
    return '[data-kdb-launchpad-pad="' + escapeAttribute(slotMeta.padKey) + '"][cor_page_id="' + escapeAttribute(slotMeta.tabId) + '"][cor_page_index="' + escapeAttribute(String(pageIndex)) + '"]';
  }
  function escapeAttribute(value) {
    return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }
  function resolveLaunchpadRoot(_KDB) {
    const selectorConfig = readLaunchpadSelectors(_KDB);
    const hideSpotSelector = selectorConfig && selectorConfig.hideSpotSelector;
    const rootSelector = selectorConfig && selectorConfig.rootSelector;
    const ownerDocument = _resolveOwnerDocument(_KDB);
    if (!ownerDocument || typeof ownerDocument.querySelector !== "function") {
      return null;
    }
    if (hideSpotSelector) {
      const hideSpotEl = ownerDocument.querySelector(hideSpotSelector);
      if (hideSpotEl && rootSelector && typeof hideSpotEl.querySelector === "function") {
        return hideSpotEl.querySelector(rootSelector) || hideSpotEl;
      }
    }
    return rootSelector ? ownerDocument.querySelector(rootSelector) : null;
  }
  function readLaunchpadSelectors(_KDB) {
    return _KDB && _KDB.elements && _KDB.elements.selectors ? _KDB.elements.selectors.launchpad : null;
  }
  return resolveLaunchpadSlotElement;
});
