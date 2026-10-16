/*
 * Published read surface of the launchpad (template root selectors file). `state/selectors.js` stays importable at
 * its frozen path; its four reads are re-exported here.
 *
 *   readLaunchpadState(_KDB)                   -> state.launchpad | undefined
 *   readLaunchpadReady(_KDB)                   -> boolean (lifecycle "ready" and DOM built)
 *   readLaunchpadSlots(_KDB, padKey, tabId?)   -> slot records of one pad (copy of the list), filtered by tab id or alias
 *   readLaunchpadSlotMeta(_KDB, padKey, tabId) -> copy of the first matching slot record | undefined
 *   readSlotElement(_KDB, slotMeta)            -> the launchpad slot DOM element for { padKey, tabId, pageIndex | childIndex },
 *                                                 or null (incomplete meta, no launchpad DOM, slot not found)
 *   readHelperTabIds(_KDB)                     -> string[] copy of state.launchpad.helperTabIds ([] when missing)
 *
 * readSlotElement looks the slot up under the hide spot / root selectors published on
 * `_KDB.elements.selectors.launchpad`, in the host document (`selectors.root.kdbWidget`, else the global document).
 * Nothing here throws on a missing namespace.
 */
define(["./state/selectors.js"], function (_stateSelectors) {
  "use strict";

  function escapeAttributeValue(_value) {
    return String(_value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  function buildSlotSelector(_slotMeta) {
    var meta = _slotMeta || {};
    var pageIndex = meta.pageIndex != null ? meta.pageIndex : meta.childIndex;
    if (!meta.padKey || !meta.tabId || pageIndex == null) {
      return null;
    }
    return '[data-kdb-launchpad-pad="' + escapeAttributeValue(meta.padKey) + '"][cor_page_id="' + escapeAttributeValue(meta.tabId) +
      '"][cor_page_index="' + escapeAttributeValue(String(pageIndex)) + '"]';
  }

  function readOwnerDocument(_KDB) {
    var rootSelectors = _KDB && _KDB.elements && _KDB.elements.selectors ? _KDB.elements.selectors.root : null;
    var hostSelector = rootSelectors && rootSelectors.kdbWidget ? rootSelectors.kdbWidget : null;
    var canQuery = typeof document !== "undefined" && typeof document.querySelector === "function";
    var hostEl = hostSelector && canQuery ? document.querySelector(hostSelector) : null;
    if (hostEl && hostEl.ownerDocument) {
      return hostEl.ownerDocument;
    }
    return typeof document !== "undefined" ? document : null;
  }

  function readLaunchpadRoot(_KDB) {
    var published = _KDB && _KDB.elements && _KDB.elements.selectors ? _KDB.elements.selectors.launchpad : null;
    var hideSpotSelector = published && published.hideSpotSelector;
    var rootSelector = published && published.rootSelector;
    var ownerDocument = readOwnerDocument(_KDB);
    var hideSpotEl;
    if (!ownerDocument || typeof ownerDocument.querySelector !== "function") {
      return null;
    }
    if (hideSpotSelector) {
      hideSpotEl = ownerDocument.querySelector(hideSpotSelector);
      if (hideSpotEl && rootSelector && typeof hideSpotEl.querySelector === "function") {
        return hideSpotEl.querySelector(rootSelector) || hideSpotEl;
      }
    }
    return rootSelector ? ownerDocument.querySelector(rootSelector) : null;
  }

  function readSlotElement(_KDB, _slotMeta) {
    var slotSelector = buildSlotSelector(_slotMeta);
    var rootEl;
    if (!slotSelector) {
      return null;
    }
    rootEl = readLaunchpadRoot(_KDB);
    if (!rootEl || typeof rootEl.querySelector !== "function") {
      return null;
    }
    return rootEl.querySelector(slotSelector);
  }

  function readHelperTabIds(_KDB) {
    var state = _stateSelectors.readLaunchpadState(_KDB);
    return state && Array.isArray(state.helperTabIds) ? state.helperTabIds.map(String) : [];
  }

  return {
    readLaunchpadState: _stateSelectors.readLaunchpadState,
    readLaunchpadReady: _stateSelectors.readLaunchpadReady,
    readLaunchpadSlots: _stateSelectors.readLaunchpadSlots,
    readLaunchpadSlotMeta: _stateSelectors.readLaunchpadSlotMeta,
    readSlotElement: readSlotElement,
    readHelperTabIds: readHelperTabIds
  };
});
