define([], function () {
  "use strict";
  // Path frozen in Phase 1: widgetBase imports readLaunchpadReady and readLaunchpadSlotMeta from here.

  function readLaunchpadState(_KDB) {
    if (!_KDB || !_KDB.state) { return undefined; }
    return _KDB.state.launchpad;
  }

  function readLaunchpadReady(_KDB) {
    const state = readLaunchpadState(_KDB);
    return !!state && state.lifecycle === "ready" && state.domReady === true;
  }

  // Slots of one pad. With a tabId only the slots whose tabId or alias matches; without, all slots.
  function readLaunchpadSlots(_KDB, _padKey, _tabId) {
    const padSlots = readPadSlots(readLaunchpadState(_KDB), _padKey);
    if (!_tabId) { return padSlots.slice(); }
    return padSlots.filter(function (slot) { return doesSlotMatchTab(slot, _tabId); });
  }

  function readLaunchpadSlotMeta(_KDB, _padKey, _tabId) {
    if (!_tabId) { return undefined; }
    const slot = readLaunchpadSlots(_KDB, _padKey, _tabId)[0];
    return slot ? copySlotMeta(slot) : undefined;
  }

  function readPadSlots(state, _padKey) {
    if (!state || !state.padsByKey || !Array.isArray(state.padsByKey[_padKey])) { return []; }
    return state.padsByKey[_padKey];
  }

  function doesSlotMatchTab(slot, _tabId) {
    if (!slot || !_tabId) { return false; }
    return slot.tabId === _tabId || (Array.isArray(slot.aliases) && slot.aliases.indexOf(_tabId) !== -1);
  }

  function copySlotMeta(_slot) {
    return {
      aliases: Array.isArray(_slot.aliases) ? _slot.aliases.slice() : [],
      childIndex: _slot.childIndex,
      padKey: _slot.padKey || null,
      pageIndex: _slot.pageIndex,
      pageId: _slot.pageId || null,
      tabId: _slot.tabId || null,
      slotKey: _slot.slotKey || null
    };
  }

  return {
    readLaunchpadState: readLaunchpadState,
    readLaunchpadReady: readLaunchpadReady,
    readLaunchpadSlots: readLaunchpadSlots,
    readLaunchpadSlotMeta: readLaunchpadSlotMeta
  };
});
