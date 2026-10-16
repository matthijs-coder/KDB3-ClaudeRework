define([], function () {
  "use strict";

  function hasSelectedAncestor(_nodeId, _nodesById, _selectedIdSet) {
    var cur = _nodesById[_nodeId];
    var guard = 0;
    var parentId;
    while (cur && Array.isArray(cur.parent) && cur.parent.length) {
      parentId = cur.parent[0];
      if (_selectedIdSet[parentId]) {
        return true;
      }
      cur = _nodesById[parentId];
      guard += 1;
      if (guard > 50) {
        break;
      }
    }
    return false;
  }

  function __controller(_resolvedItems, _nodesById) {
    var items = Array.isArray(_resolvedItems) ? _resolvedItems : [];
    var nodesById = _nodesById && typeof _nodesById === "object" ? _nodesById : {};
    var selectedIdSet = {};
    var unresolved = [];
    var resolved = [];
    var highest = [];
    var i;
    var item;
    for (i = 0; i < items.length; i += 1) {
      item = items[i] || {};
      if (item.nodeId == null) {
        unresolved.push(item);
      } else {
        resolved.push(item);
        selectedIdSet[item.nodeId] = true;
      }
    }
    for (i = 0; i < resolved.length; i += 1) {
      item = resolved[i];
      if (!hasSelectedAncestor(item.nodeId, nodesById, selectedIdSet)) {
        highest.push(item);
      }
    }
    return { highest: highest, unresolved: unresolved };
  }

  return __controller;
});
