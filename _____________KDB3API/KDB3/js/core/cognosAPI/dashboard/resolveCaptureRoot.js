define([
  "./queryIdentityNodes.js",
  "./proveActiveScope.js",
  "./config/pageSelectors.js"
], function (_queryIdentityNodes, _proveActiveScope, _pageSelectors) {
  "use strict";

  function normalizeIdentity(_value) {
    return _value != null && String(_value).length > 0 ? String(_value) : null;
  }

  function readIdentityDescriptor(_tabLike) {
    var source = _tabLike || {};
    return {
      pageId: normalizeIdentity(source.pageId),
      tabId: normalizeIdentity(source.tabId)
    };
  }

  function isRejectedScope(_scope) {
    return _scope.status === "ambiguous" || _scope.status === "unproved";
  }

  function tabContainsPage(_tabScope, _page) {
    var idx;
    if (_tabScope.page === _page) return true;
    for (idx = 0; idx < _tabScope.nodes.length; idx += 1) {
      if (_tabScope.nodes[idx] === _page) return true;
      if (_tabScope.nodes[idx].contains && _tabScope.nodes[idx].contains(_page)) return true;
    }
    return false;
  }

  function isExactPageRoot(_node) {
    return !!(_node && _node.matches && _node.matches(_pageSelectors.exactPageRootSelector));
  }

  function resolveCaptureRoot(_tabLike) {
    var descriptor = readIdentityDescriptor(_tabLike);
    var pageScope;
    var tabScope;
    if ((!descriptor.pageId && !descriptor.tabId) || typeof document === "undefined" || !document.querySelectorAll) return null;
    pageScope = descriptor.pageId
      ? _proveActiveScope.page(_queryIdentityNodes.page(descriptor.pageId))
      : { status: "missing" };
    tabScope = descriptor.tabId
      ? _proveActiveScope.tab(_queryIdentityNodes.tab(descriptor.tabId))
      : { status: "missing" };
    if (isRejectedScope(pageScope) || isRejectedScope(tabScope)) return null;
    if (pageScope.status === "resolved" && tabScope.status === "resolved") {
      if (!tabContainsPage(tabScope, pageScope.page) || !isExactPageRoot(pageScope.page)) return null;
      return pageScope.page;
    }
    if (pageScope.status === "resolved") return isExactPageRoot(pageScope.page) ? pageScope.page : null;
    if (tabScope.status === "resolved") return isExactPageRoot(tabScope.page) ? tabScope.page : null;
    return null;
  }

  return resolveCaptureRoot;
});
