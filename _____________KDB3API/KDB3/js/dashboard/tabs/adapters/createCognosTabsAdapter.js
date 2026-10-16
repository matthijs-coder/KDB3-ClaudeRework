define([], function () {
  "use strict";

  function createCognosTabsAdapter(_deps) {
    const tabsFacet = _deps && _deps.tabsFacet;
    // Host-call errors intentionally bubble to tabs effects/controller boundaries.
    // Method names stay the wrap-consumer API (getTabsContainers etc.). The
    // facet surface is listTabs / getTabName / setTabName; getTabsContent is
    // not on the facet (no spec arrays / live nodes). Chrome clicks stay chrome.
    return {
      getTabsContainers: getTabsContainers.bind(null, tabsFacet),
      getTabsContent: getTabsContent.bind(null, tabsFacet),
      getTabName: getTabName.bind(null, tabsFacet),
      setTabName: setTabName.bind(null, tabsFacet)
    };
  }

  function getTabsContainers(tabsFacet) {
    return listTabDescriptors(tabsFacet);
  }

  function getTabsContent(tabsFacet) {
    return listTabDescriptors(tabsFacet);
  }

  function getTabName(tabsFacet, _tabLike) {
    ensureTabsFacet(tabsFacet, "getTabName");
    return unwrapOkData(tabsFacet.getTabName(_tabLike), "getTabName");
  }

  function setTabName(tabsFacet, _tabLike, _name) {
    ensureTabsFacet(tabsFacet, "setTabName");
    const pending = tabsFacet.setTabName(_tabLike, _name);
    if (pending && typeof pending.then === "function") {
      return pending.then(function (outcome) {
        return confirmedName(unwrapOkData(outcome, "setTabName"), _name);
      });
    }
    return confirmedName(unwrapOkData(pending, "setTabName"), _name);
  }

  function listTabDescriptors(tabsFacet) {
    ensureTabsFacet(tabsFacet, "listTabs");
    return alignTabDescriptors(unwrapOkData(tabsFacet.listTabs(), "listTabs"));
  }

  function alignTabDescriptors(_data) {
    const aligned = [];
    const list = Array.isArray(_data) ? _data : [];
    let index = 0;
    while (index < list.length) {
      const projected = projectTabDescriptor(list[index]);
      if (projected && typeof projected.index === "number") {
        aligned[projected.index] = projected;
      }
      index += 1;
    }
    return aligned;
  }

  function projectTabDescriptor(_dto) {
    if (!_dto || typeof _dto !== "object") {
      return null;
    }
    const id = scalarId(_dto.id);
    if (!id) {
      return null;
    }
    const index = typeof _dto.index === "number" && _dto.index >= 0 && _dto.index === Math.floor(_dto.index)
      ? _dto.index
      : null;
    if (index == null) {
      return null;
    }
    return {
      id: id,
      tabId: scalarId(_dto.tabId) || id,
      pageId: scalarId(_dto.pageId) || id,
      index: index,
      scopeId: scalarId(_dto.scopeId) || id,
      hasContent: _dto.hasContent === true
    };
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

  function confirmedName(_data, _name) {
    return _data != null && _data !== "" ? _data : _name;
  }

  function unwrapOkData(_outcome, methodName) {
    if (!_outcome || _outcome.ok !== true) {
      throw new Error("Cognos tabs adapter " + methodName + " failed");
    }
    return _outcome.data;
  }

  function ensureTabsFacet(tabsFacet, methodName) {
    if (!tabsFacet || typeof tabsFacet[methodName] !== "function") {
      throw new Error("Cognos tabs adapter missing method: " + methodName);
    }
  }

  return createCognosTabsAdapter;
});
