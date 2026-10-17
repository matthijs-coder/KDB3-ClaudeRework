define([], function () {
  "use strict";

  function allChildrenSelected(_children, _selectedIdMap) {
    var i;
    if (!Array.isArray(_children) || !_children.length) {
      return false;
    }
    for (i = 0; i < _children.length; i += 1) {
      if (!_selectedIdMap[_children[i]]) {
        return false;
      }
    }
    return true;
  }

  function collectBwGruppeCandidates(_nodesById, _selectedIdMap) {
    var nodesById = _nodesById && typeof _nodesById === "object" ? _nodesById : {};
    var selectedIdMap = _selectedIdMap && typeof _selectedIdMap === "object" ? _selectedIdMap : {};
    var candidateMap = {};
    var keys = Object.keys(nodesById);
    var i;
    var nodeId;
    var node;
    for (i = 0; i < keys.length; i += 1) {
      nodeId = parseInt(keys[i], 10);
      if (isNaN(nodeId)) {
        nodeId = keys[i];
      }
      node = nodesById[nodeId] || nodesById[keys[i]];
      if (!node || node.levelRank !== 1) {
        continue;
      }
      if (selectedIdMap[nodeId] || allChildrenSelected(node.children, selectedIdMap)) {
        candidateMap[nodeId] = true;
      }
    }
    return candidateMap;
  }

  return collectBwGruppeCandidates;
});
