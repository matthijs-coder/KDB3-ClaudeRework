define([], function () {
  "use strict";

  function addUnique(_items, _item) {
    if (_item && _items.indexOf(_item) < 0) _items.push(_item);
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

  return proveScopeResolution;
});
