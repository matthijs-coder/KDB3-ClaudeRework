define(["./config/pageSelectors.js"], function (_pageSelectors) {
  "use strict";

  function isActiveRoot(_root) {
    if (!_root || _root.hidden === true) return false;
    if (_root.closest && _root.closest("[hidden], [aria-hidden='true']")) return false;
    return !(_root.getClientRects && _root.getClientRects().length === 0);
  }

  function resolveTabPageRoots(_node) {
    var matches = _node && _node.querySelectorAll ? _node.querySelectorAll(_pageSelectors.exactPageRootSelector) : [];
    var roots = [];
    var idx;
    for (idx = 0; idx < matches.length; idx += 1) {
      if (isActiveRoot(matches[idx]) && roots.indexOf(matches[idx]) < 0) roots.push(matches[idx]);
    }
    return roots;
  }

  return resolveTabPageRoots;
});
