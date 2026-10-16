define([], function () {
  "use strict";

  function readCurrentTab(_deps, _root) {
    const index = readSelectedTabIndex(_deps, _root);
    return {
      index: index,
      id: readTabIdFromFacet(_deps, index)
    };
  }

  function readSelectedTabIndex(_deps, _root) {
    const chromeReaders = _deps && _deps.chromeReaders;
    if (!chromeReaders || typeof chromeReaders.readSelectedTabIndex !== "function") {
      return -1;
    }
    try {
      const index = chromeReaders.readSelectedTabIndex(_root);
      if (typeof index === "number" && index >= 0 && index === Math.floor(index)) {
        return index;
      }
    } catch (error) {
      console.error("[KDB][readCurrentTab] chrome read failed", error);
    }
    return -1;
  }

  function readTabIdFromFacet(_deps, _index) {
    const tabsFacet = _deps && _deps.tabsFacet;
    if (_index < 0 || !tabsFacet || typeof tabsFacet.listTabs !== "function") {
      return null;
    }
    try {
      const outcome = tabsFacet.listTabs();
      if (!outcome || outcome.ok !== true || !Array.isArray(outcome.data)) {
        return null;
      }
      return readDescriptorIdAtIndex(outcome.data, _index);
    } catch (error) {
      console.error("[KDB][readCurrentTab] layout read failed", error);
      return null;
    }
  }

  function readDescriptorIdAtIndex(_list, _index) {
    let i;
    let dto;
    for (i = 0; i < _list.length; i += 1) {
      dto = _list[i];
      if (dto && dto.index === _index) {
        return scalarId(dto.id);
      }
    }
    return null;
  }

  function scalarId(_value) {
    if (_value == null || _value === "") {
      return null;
    }
    if (typeof _value === "string") {
      return _value;
    }
    if (typeof _value === "number") {
      return String(_value);
    }
    return null;
  }

  return readCurrentTab;
});
