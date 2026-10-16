define([
  "./state/selectors.js",
  "./view.js"
], function (_selectors, _view) {
  "use strict";
  // Query behind the "launchpad/readSlotWidgets" dispatch: widgets parked in the slots of one pad.

  function readSlotWidgets(_KDB, _payload) {
    const request = normalizeSlotWidgetsRequest(_payload);
    try {
      if (!request.padKey) {
        return buildSlotWidgetsFailure(request, "LAUNCHPAD_INVALID_PAYLOAD", "padKey is required.");
      }
      if (_selectors.readLaunchpadReady(_KDB) !== true) {
        return buildSlotWidgetsFailure(request, "LAUNCHPAD_NOT_READY", "Launchpad is not ready.");
      }
      const slots = _selectors.readLaunchpadSlots(_KDB, request.padKey, request.tabId);
      if (request.tabId && slots.length === 0) {
        return buildSlotWidgetsFailure(request, "LAUNCHPAD_SLOT_NOT_FOUND", "No launchpad slot matched tabId for pad.");
      }
      const widgets = collectWidgetsFromSlots(_KDB, slots, request);
      if (request.mode === "first") {
        const first = widgets.length > 0 ? widgets[0] : null;
        return buildSlotWidgetsResult(request, first ? [first] : [], first ? first.widgetId : null);
      }
      return buildSlotWidgetsResult(request, widgets, null);
    } catch (err) {
      console.error("[launchpad.readSlotWidgets] failed", { padKey: request.padKey, tabId: request.tabId, mode: request.mode }, err);
      return buildSlotWidgetsFailure(request, "LAUNCHPAD_READ_SLOT_WIDGETS_FAILED", String(err && err.message ? err.message : err));
    }
  }

  function normalizeSlotWidgetsRequest(_payload) {
    const payload = _payload || {};
    return {
      padKey: payload.padKey,
      tabId: payload.tabId != null ? payload.tabId : null,
      mode: payload.mode === "first" ? "first" : "all"
    };
  }

  function buildSlotWidgetsResult(request, widgets, widgetId) {
    return { ok: true, padKey: request.padKey, tabId: request.tabId, mode: request.mode, widgets: widgets, widgetId: widgetId };
  }

  function buildSlotWidgetsFailure(request, errorCode, errorMessage) {
    return {
      ok: false,
      errorCode: errorCode,
      errorMessage: errorMessage,
      padKey: request.padKey || null,
      tabId: request.tabId,
      mode: request.mode,
      widgets: [],
      widgetId: null
    };
  }

  function buildDisposedSlotWidgetsResult(_payload) {
    return buildSlotWidgetsFailure(normalizeSlotWidgetsRequest(_payload), "LAUNCHPAD_DISPOSED", "Launchpad dispatch called after destroy.");
  }

  function collectWidgetsFromSlots(_KDB, slots, request) {
    const widgets = [];
    for (let i = 0; i < slots.length; i += 1) {
      const slotEl = resolveSlotWidgetElement(_KDB, slots[i]);
      if (slotEl) {
        collectDirectChildWidgets(slotEl, slots[i], request.padKey, widgets);
        if (request.mode === "first" && widgets.length > 0) { return widgets; }
      }
    }
    return widgets;
  }

  function collectDirectChildWidgets(slotEl, slotMeta, padKey, widgets) {
    Array.prototype.forEach.call(slotEl.children || [], function (child) {
      if (child && child.id) {
        widgets.push({
          widgetId: child.id,
          slotKey: slotMeta.slotKey || null,
          tabId: slotMeta.tabId || null,
          padKey: padKey,
          childIndex: slotMeta.childIndex != null ? slotMeta.childIndex : slotMeta.pageIndex
        });
      }
    });
  }

  // ---- slot element lookup -------------------------------------------------

  function resolveSlotWidgetElement(_KDB, slotMeta) {
    const runtime = _KDB && _KDB.runtime && _KDB.runtime.launchpad ? _KDB.runtime.launchpad : null;
    const domRefs = runtime && runtime.domRefs ? runtime.domRefs : null;
    if (domRefs && domRefs.slotsByKey && slotMeta.slotKey && domRefs.slotsByKey[slotMeta.slotKey]) {
      return domRefs.slotsByKey[slotMeta.slotKey];
    }
    const rootEl = resolveLaunchpadRoot(_KDB, domRefs);
    if (!rootEl || typeof rootEl.querySelector !== "function") { return null; }
    const selector = buildSlotSelector(slotMeta);
    return selector ? rootEl.querySelector(selector) : null;
  }

  function resolveLaunchpadRoot(_KDB, domRefs) {
    if (domRefs && domRefs.rootEl) { return domRefs.rootEl; }
    const hideSpotEl = domRefs && domRefs.hideSpotEl ? domRefs.hideSpotEl : findHideSpotElement(_KDB);
    const selectors = _view.readDomSelectors(_KDB);
    if (hideSpotEl && selectors.rootSelector && typeof hideSpotEl.querySelector === "function") {
      return hideSpotEl.querySelector(selectors.rootSelector) || hideSpotEl;
    }
    return hideSpotEl;
  }

  function findHideSpotElement(_KDB) {
    const legacyHostEl = _KDB && _KDB.elements ? _KDB.elements.kdbWidget : null;
    const ownerDocument = legacyHostEl && legacyHostEl.ownerDocument
      ? legacyHostEl.ownerDocument
      : (typeof document !== "undefined" ? document : null);
    if (!ownerDocument || typeof ownerDocument.querySelector !== "function") { return null; }
    const selectors = _view.readDomSelectors(_KDB);
    return selectors.hideSpotSelector ? ownerDocument.querySelector(selectors.hideSpotSelector) : null;
  }

  function buildSlotSelector(slotMeta) {
    const pageIndex = slotMeta.pageIndex != null ? slotMeta.pageIndex : slotMeta.childIndex;
    if (!slotMeta.padKey || !slotMeta.tabId || pageIndex == null) { return null; }
    return '[data-kdb-launchpad-pad="' + escapeAttribute(slotMeta.padKey) + '"][cor_page_id="' + escapeAttribute(slotMeta.tabId)
      + '"][cor_page_index="' + escapeAttribute(String(pageIndex)) + '"]';
  }

  function escapeAttribute(value) {
    return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  return {
    readSlotWidgets: readSlotWidgets,
    buildDisposedSlotWidgetsResult: buildDisposedSlotWidgetsResult
  };
});
