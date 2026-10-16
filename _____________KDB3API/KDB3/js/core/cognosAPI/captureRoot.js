define(["../cognosHost/config/pageChromeSelectors.js"], function (_pageChrome) {
  "use strict";

  var PAGE_ROOT_SELECTOR = _pageChrome.page.strings.exactPageRootSelector;
  var PAGE_FIELDS = _pageChrome.page.strings.pageIdentityAttrs;
  var TAB_FIELDS = _pageChrome.page.strings.tabIdentityAttrs;

  function addUnique(_items, _item) {
    if (_item && _items.indexOf(_item) < 0) _items.push(_item);
  }

  function isActiveRoot(_root) {
    if (!_root || _root.hidden === true) return false;
    if (_root.closest && _root.closest("[hidden], [aria-hidden='true']")) return false;
    return !(_root.getClientRects && _root.getClientRects().length === 0);
  }

  function escapeCssValue(_value) {
    if (typeof CSS !== "undefined" && CSS && typeof CSS.escape === "function") {
      return CSS.escape(String(_value));
    }
    return String(_value).replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
  }

  function selectIdentityNodes(_identity, _fields) {
    var escaped = escapeCssValue(_identity);
    var selector = _fields.map(function (_field) {
      return "[" + _field + "=\"" + escaped + "\"]";
    }).join(", ");
    return document.querySelectorAll(selector);
  }

  function matchIdentityNode(_node, _identity, _fields) {
    var idx;
    if (!_node || !_node.getAttribute) return false;
    for (idx = 0; idx < _fields.length; idx += 1) {
      if (_node.getAttribute(_fields[idx]) === _identity) return true;
    }
    return false;
  }

  function queryIdentityNodes(_identity, _fields) {
    var matches = selectIdentityNodes(_identity, _fields);
    var nodes = [];
    var idx;
    for (idx = 0; idx < matches.length; idx += 1) {
      if (matchIdentityNode(matches[idx], _identity, _fields)) addUnique(nodes, matches[idx]);
    }
    return nodes;
  }

  function collectActiveDescendants(_node, _selector) {
    var matches = _node && _node.querySelectorAll ? _node.querySelectorAll(_selector) : [];
    var roots = [];
    var idx;
    for (idx = 0; idx < matches.length; idx += 1) {
      if (isActiveRoot(matches[idx])) addUnique(roots, matches[idx]);
    }
    return roots;
  }

  function resolveRelatedPageRoots(_node) {
    var roots = [];
    var closest;
    var descendants;
    var idx;
    if (!_node) return roots;
    if (_node.matches && _node.matches(PAGE_ROOT_SELECTOR) && isActiveRoot(_node)) {
      addUnique(roots, _node);
    }
    closest = _node.closest ? _node.closest(PAGE_ROOT_SELECTOR) : null;
    if (isActiveRoot(closest)) addUnique(roots, closest);
    descendants = collectActiveDescendants(_node, PAGE_ROOT_SELECTOR);
    for (idx = 0; idx < descendants.length; idx += 1) addUnique(roots, descendants[idx]);
    return roots;
  }

  function resolveTabPageRoots(_node) {
    return collectActiveDescendants(_node, PAGE_ROOT_SELECTOR);
  }

  function proveScopeResolution(_nodes, _resolveRoots) {
    var roots = [];
    var nodeRoots;
    var idx;
    if (!_nodes.length) return { status: "missing" };
    for (idx = 0; idx < _nodes.length; idx += 1) {
      nodeRoots = _resolveRoots(_nodes[idx]);
      if (!nodeRoots.length) return { status: "unproved" };
      if (nodeRoots.length > 1) return { status: "ambiguous" };
      addUnique(roots, nodeRoots[0]);
    }
    if (roots.length !== 1) return { status: "ambiguous" };
    return { status: "resolved", nodes: _nodes, page: roots[0] };
  }

  function normalizeIdentity(_value) {
    return _value != null && String(_value).length > 0 ? String(_value) : null;
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
    return !!(_node && _node.matches && _node.matches(PAGE_ROOT_SELECTOR));
  }

  function resolveCaptureRoot(_tabLike) {
    var source = _tabLike || {};
    var pageId = normalizeIdentity(source.pageId);
    var tabId = normalizeIdentity(source.tabId);
    var pageScope;
    var tabScope;
    if ((!pageId && !tabId) || typeof document === "undefined" || !document.querySelectorAll) return null;
    pageScope = pageId
      ? proveScopeResolution(queryIdentityNodes(pageId, PAGE_FIELDS), resolveRelatedPageRoots)
      : { status: "missing" };
    tabScope = tabId
      ? proveScopeResolution(queryIdentityNodes(tabId, TAB_FIELDS), resolveTabPageRoots)
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
