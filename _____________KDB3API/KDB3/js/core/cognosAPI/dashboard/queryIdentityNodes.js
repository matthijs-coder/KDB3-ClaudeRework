define([
  "./selectIdentityNodes.js",
  "./matchIdentityNode.js",
  "../../cognosHost/config/pageChromeSelectors.js"
], function (_selectIdentityNodes, _matchIdentityNode, _pageChrome) {
  "use strict";

  var PAGE_FIELDS = _pageChrome.page.strings.pageIdentityAttrs;
  var TAB_FIELDS = _pageChrome.page.strings.tabIdentityAttrs;

  function queryNodes(_identity, _fields) {
    var matches = _selectIdentityNodes(_identity, _fields);
    var nodes = [];
    var idx;
    for (idx = 0; idx < matches.length; idx += 1) {
      if (_matchIdentityNode(matches[idx], _identity, _fields) && nodes.indexOf(matches[idx]) < 0) {
        nodes.push(matches[idx]);
      }
    }
    return nodes;
  }

  return {
    page: function (_pageId) { return queryNodes(_pageId, PAGE_FIELDS); },
    tab: function (_tabId) { return queryNodes(_tabId, TAB_FIELDS); }
  };
});
