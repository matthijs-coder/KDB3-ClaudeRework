define(["../state/selectors.js", "./resolveSlotWidgetElement.js"], function (_selectors, _resolveSlotWidgetElement) {
  function readSlotWidgets(_KDB, _payload) {
    const payload = _payload || {};
    const padKey = payload.padKey;
    const tabId = payload.tabId != null ? payload.tabId : null;
    const mode = payload.mode === "first" ? "first" : "all";
    try {
      if (!padKey) {
        return buildFailure(padKey, tabId, mode, "LAUNCHPAD_INVALID_PAYLOAD", "padKey is required.");
      }
      if (_selectors.readLaunchpadReady(_KDB) !== true) {
        return buildFailure(padKey, tabId, mode, "LAUNCHPAD_NOT_READY", "Launchpad is not ready.");
      }
      const slots = collectSlots(_KDB, padKey, tabId);
      if (tabId && slots.length === 0) {
        return buildFailure(padKey, tabId, mode, "LAUNCHPAD_SLOT_NOT_FOUND", "No launchpad slot matched tabId for pad.");
      }
      const widgets = collectWidgetsFromSlots(_KDB, slots, padKey, mode);
      if (mode === "first") {
        const first = widgets.length > 0 ? widgets[0] : null;
        return { ok: true, padKey: padKey, tabId: tabId, mode: mode, widgets: first ? [first] : [], widgetId: first ? first.widgetId : null };
      }
      return { ok: true, padKey: padKey, tabId: tabId, mode: mode, widgets: widgets, widgetId: null };
    } catch (err) {
      console.error("[launchpad.readSlotWidgets] failed", { padKey: padKey, tabId: tabId, mode: mode }, err);
      return buildFailure(padKey, tabId, mode, "LAUNCHPAD_READ_SLOT_WIDGETS_FAILED", messageFromError(err));
    }
  }
  function collectSlots(_KDB, padKey, tabId) {
    const state = _selectors.readLaunchpadState(_KDB);
    const padSlots = state && state.padsByKey && Array.isArray(state.padsByKey[padKey]) ? state.padsByKey[padKey] : [];
    if (!tabId) {
      return padSlots.slice();
    }
    const matched = [];
    let index = 0;
    while (index < padSlots.length) {
      if (doesSlotMatchTab(padSlots[index], tabId)) {
        matched.push(padSlots[index]);
      }
      index += 1;
    }
    return matched;
  }
  function doesSlotMatchTab(slotMeta, tabId) {
    if (!slotMeta || !tabId) {
      return false;
    }
    if (slotMeta.tabId === tabId) {
      return true;
    }
    const aliases = Array.isArray(slotMeta.aliases) ? slotMeta.aliases : [];
    let index = 0;
    while (index < aliases.length) {
      if (aliases[index] === tabId) {
        return true;
      }
      index += 1;
    }
    return false;
  }
  function collectWidgetsFromSlots(_KDB, slots, padKey, mode) {
    const widgets = [];
    let slotIndex = 0;
    while (slotIndex < slots.length) {
      const slotMeta = slots[slotIndex];
      const slotEl = _resolveSlotWidgetElement(_KDB, slotMeta);
      if (slotEl) {
        collectDirectChildWidgets(slotEl, slotMeta, padKey, widgets);
        if (mode === "first" && widgets.length > 0) {
          return widgets;
        }
      }
      slotIndex += 1;
    }
    return widgets;
  }
  function collectDirectChildWidgets(slotEl, slotMeta, padKey, widgets) {
    if (!slotEl || !slotEl.children) {
      return;
    }
    let childIndex = 0;
    while (childIndex < slotEl.children.length) {
      const child = slotEl.children[childIndex];
      if (child && child.id) {
        widgets.push({
          widgetId: child.id,
          slotKey: slotMeta.slotKey || null,
          tabId: slotMeta.tabId || null,
          padKey: padKey,
          childIndex: slotMeta.childIndex != null ? slotMeta.childIndex : slotMeta.pageIndex
        });
      }
      childIndex += 1;
    }
  }
  function buildFailure(padKey, tabId, mode, errorCode, errorMessage) {
    return { ok: false, errorCode: errorCode, errorMessage: errorMessage, padKey: padKey || null, tabId: tabId, mode: mode, widgets: [], widgetId: null };
  }
  function messageFromError(err) {
    return String(err && err.message ? err.message : err);
  }
  return readSlotWidgets;
});
