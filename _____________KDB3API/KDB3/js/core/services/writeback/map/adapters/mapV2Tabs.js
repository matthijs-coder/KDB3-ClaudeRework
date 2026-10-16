define([], function () {
  "use strict";

  function readTabIndices(_tabsObj) {
    if (!_tabsObj || typeof _tabsObj !== "object" || Array.isArray(_tabsObj)) {
      return [];
    }
    return Object.keys(_tabsObj)
      .filter(function (key) { return /^\d+$/.test(key); })
      .sort(function (left, right) { return Number(left) - Number(right); });
  }

  function mapV2Tabs(_tabsObj) {
    try {
      const indices = readTabIndices(_tabsObj);
      if (indices.length === 0) {
        return null;
      }
      const entries = [];
      for (let index = 0; index < indices.length; index += 1) {
        const tab = _tabsObj[indices[index]];
        if (!tab || typeof tab !== "object") {
          continue;
        }
        const name = typeof tab.name === "string" ? tab.name : "";
        if (name === "") {
          continue;
        }
        if (tab.visible === false) {
          entries.push({ name: name, hide: 1 });
        } else {
          entries.push({ name: name });
        }
      }
      return entries.length > 0 ? entries : null;
    } catch (error) {
      throw error;
    }
  }

  return mapV2Tabs;
});
