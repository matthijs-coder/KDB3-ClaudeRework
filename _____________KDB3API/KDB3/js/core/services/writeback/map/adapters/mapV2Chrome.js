define([], function () {
  "use strict";

  function mapHeader(_topHeader) {
    if (!_topHeader || typeof _topHeader !== "object") {
      return null;
    }
    const head = { on: _topHeader.turnedOn === true ? 1 : 0 };
    if (typeof _topHeader.text === "string" && _topHeader.text !== "") {
      head.title = _topHeader.text;
    }
    if (typeof _topHeader.icon === "string") {
      const stem = _topHeader.icon.trim().replace(/\.png$/i, "");
      if (stem) {
        head.icon = stem;
      }
    }
    return head;
  }

  function mapFooter(_bottomFooter) {
    if (!_bottomFooter || typeof _bottomFooter !== "object") {
      return null;
    }
    return { on: _bottomFooter.turnedOn === true ? 1 : 0 };
  }

  function mapV2HeaderFooter(_payload) {
    const result = {};
    const head = mapHeader(_payload.topHeader);
    if (head) {
      result.head = head;
    }
    const foot = mapFooter(_payload.bottomFooter);
    if (foot) {
      result.foot = foot;
    }
    return result;
  }

  function readTabIndices(_tabsObj) {
    if (!_tabsObj || typeof _tabsObj !== "object" || Array.isArray(_tabsObj)) {
      return [];
    }
    return Object.keys(_tabsObj)
      .filter(function (key) { return /^\d+$/.test(key); })
      .sort(function (left, right) { return Number(left) - Number(right); });
  }

  function mapV2Tabs(_tabsObj) {
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
      entries.push(tab.visible === false ? { name: name, hide: 1 } : { name: name });
    }
    return entries.length > 0 ? entries : null;
  }

  return Object.freeze({
    mapV2HeaderFooter: mapV2HeaderFooter,
    mapV2Tabs: mapV2Tabs,
  });
});
