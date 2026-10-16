define(["./config/pageSelectors.js"], function (_pageSelectors) {
  "use strict";

  var PAGE_ROOT_SELECTOR = _pageSelectors.exactPageRootSelector;

  function addUnique(_items, _item) {
    if (_item && _items.indexOf(_item) < 0) _items.push(_item);
  }

  function isActiveRoot(_root) {
    if (!_root || _root.hidden === true) return false;
    if (_root.closest && _root.closest("[hidden], [aria-hidden='true']")) return false;
    return !(_root.getClientRects && _root.getClientRects().length === 0);
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

  return resolveRelatedPageRoots;
});
