define([
  "./parseHierarchyCell.js",
  "./rankHierarchyRowKeys.js"
], function (_parseHierarchyCell, _rankHierarchyRowKeys) {
  "use strict";

  function getOrCreateIdForText(_text, _maps) {
    var nodeId;
    if (!_text) {
      return null;
    }
    if (_maps.textToNodeId[_text] != null) {
      return _maps.textToNodeId[_text];
    }
    nodeId = _maps.nextId;
    _maps.nextId += 1;
    _maps.textToNodeId[_text] = nodeId;
    _maps.idToMember[nodeId] = { text: _text };
    return nodeId;
  }

  function ensureNode(_nodesById, _nodeId, _parentId, _rank) {
    var node = _nodesById[_nodeId];
    if (!node) {
      _nodesById[_nodeId] = {
        id: _nodeId,
        parent: _parentId ? [_parentId] : [],
        children: [],
        levelRank: _rank
      };
      return;
    }
    if (typeof node.levelRank !== "number" || _rank < node.levelRank) {
      node.levelRank = _rank;
      node.parent = _parentId ? [_parentId] : [];
    } else if (Array.isArray(node.parent) && node.parent.length === 0 && _parentId) {
      node.parent = [_parentId];
    }
  }

  function rankOfWalkKey(_key, _index) {
    var source;
    var match;
    var rank;
    if (typeof _key === "number") {
      return _key;
    }
    source = String(_key);
    match = source.match(/level0*(\d+)/i) || source.match(/^(\d+)$/);
    if (!match) {
      return _index;
    }
    rank = parseInt(match[1], 10);
    return isNaN(rank) ? _index : rank;
  }

  function emptyTree(_sicht, _tableKey) {
    return {
      sicht: _sicht,
      tableKey: _tableKey,
      nodesById: {},
      idToMember: {},
      textToNodeId: {}
    };
  }

  function walkRow(_row, _maps, _nodesById) {
    var keys = _rankHierarchyRowKeys(_row);
    var parentId = null;
    var i;
    var cell;
    var parsed;
    var nodeId;
    var sourceId;
    var parentNode;
    var rank;
    for (i = 0; i < keys.length; i += 1) {
      cell = _row[keys[i]];
      if (cell == null) {
        continue;
      }
      parsed = _parseHierarchyCell(cell);
      if (!parsed || !parsed.text) {
        continue;
      }
      nodeId = getOrCreateIdForText(parsed.text, _maps);
      if (nodeId == null) {
        continue;
      }
      sourceId = parsed.sourceId != null ? String(parsed.sourceId).trim() : "";
      if (sourceId && sourceId !== parsed.text) {
        if (_maps.idToMember[nodeId].dataId == null) {
          _maps.idToMember[nodeId].dataId = sourceId;
        }
        if (_maps.textToNodeId[sourceId] == null) {
          _maps.textToNodeId[sourceId] = nodeId;
        }
      }
      rank = rankOfWalkKey(keys[i], i);
      ensureNode(_nodesById, nodeId, parentId, rank);
      if (parentId != null) {
        parentNode = _nodesById[parentId];
        if (parentNode && parentNode.children.indexOf(nodeId) === -1) {
          parentNode.children.push(nodeId);
        }
      }
      parentId = nodeId;
    }
  }

  function __controller(_rows, _sicht, _tableKey) {
    try {
      var maps;
      var nodesById;
      var i;
      if (!Array.isArray(_rows)) {
        return emptyTree(_sicht, _tableKey);
      }
      maps = { textToNodeId: {}, idToMember: {}, nextId: 1 };
      nodesById = {};
      for (i = 0; i < _rows.length; i += 1) {
        if (_rows[i] != null && typeof _rows[i] === "object") {
          walkRow(_rows[i], maps, nodesById);
        }
      }
      return {
        sicht: _sicht,
        tableKey: _tableKey,
        nodesById: nodesById,
        idToMember: maps.idToMember,
        textToNodeId: maps.textToNodeId
      };
    } catch (err) {
      console.error("[drillthrough.buildOrgTreeFromRows]", err);
      throw err;
    }
  }

  return __controller;
});
