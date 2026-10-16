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

  function mapV2HeaderFooter(_payload, _diagnostics) {
    try {
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
    } catch (error) {
      throw error;
    }
  }

  return mapV2HeaderFooter;
});
