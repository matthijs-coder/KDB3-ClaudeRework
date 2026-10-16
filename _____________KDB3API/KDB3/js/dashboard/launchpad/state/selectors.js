define([], function () {
  const selectors = {
    readLaunchpadState: readLaunchpadState,
    readLaunchpadReady: readLaunchpadReady,
    readLaunchpadTabs: readLaunchpadTabs,
    readLaunchpadHelperTabIds: readLaunchpadHelperTabIds,
    readLaunchpadSlotMeta: readLaunchpadSlotMeta
  };
  function readLaunchpadState(_KDB) {
    if (!_KDB || !_KDB.state) { return undefined; }
    return _KDB.state.launchpad;
  }
  function readLaunchpadReady(_KDB) {
    const state = readLaunchpadState(_KDB);
    return !!state && state.lifecycle === "ready" && state.domReady === true;
  }
  function readLaunchpadTabs(_KDB) {
    const state = readLaunchpadState(_KDB);
    return state && Array.isArray(state.tabs) ? state.tabs.slice() : [];
  }
  function readLaunchpadHelperTabIds(_KDB) {
    const state = readLaunchpadState(_KDB);
    return state && Array.isArray(state.helperTabIds) ? state.helperTabIds.slice() : [];
  }
  function readLaunchpadSlotMeta(_KDB, _padKey, _tabId) {
    const padSlots = readPadSlots(readLaunchpadState(_KDB), _padKey);
    let index = 0;
    while (index < padSlots.length) {
      if (doesSlotMatchTab(padSlots[index], _tabId)) { return copySlotMeta(padSlots[index]); }
      index += 1;
    }
    return undefined;
  }
  function readPadSlots(state, _padKey) {
    if (!state || !state.padsByKey || !Array.isArray(state.padsByKey[_padKey])) { return []; }
    return state.padsByKey[_padKey];
  }
  function doesSlotMatchTab(slot, _tabId) {
    if (!slot || !_tabId) { return false; }
    return slot.tabId === _tabId || doesAliasMatch(slot.aliases, _tabId);
  }
  function doesAliasMatch(_aliases, _tabId) {
    let index = 0;
    if (!Array.isArray(_aliases)) { return false; }
    while (index < _aliases.length) {
      if (_aliases[index] === _tabId) { return true; }
      index += 1;
    }
    return false;
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
  return selectors;
});
