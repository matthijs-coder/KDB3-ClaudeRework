define([
  "./hierarchyCell.js",
  "./hierarchyTable.js"
], function (_hierarchyCell, _hierarchyTable) {
  "use strict";

  function rowKeys(_row) {
    var keys = [];
    var i;
    if (Array.isArray(_row)) {
      for (i = 0; i < _row.length; i += 1) {
        keys.push(i);
      }
      return keys;
    }
    return _row && typeof _row === "object" ? Object.keys(_row) : keys;
  }

  // Rank of a row key: the number itself, the digits of "level02" or of "2", else the position in the row.
  function rankOfKey(_key, _index) {
    var match;
    var rank;
    if (typeof _key === "number") {
      return _key;
    }
    match = String(_key).match(/level0*(\d+)/i) || String(_key).match(/^(\d+)$/);
    if (!match) {
      return _index;
    }
    rank = parseInt(match[1], 10);
    return isNaN(rank) ? _index : rank;
  }

  function getOrCreateIdForText(_text, _maps) {
    var nodeId;
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

  function recordSourceId(_parsed, _nodeId, _maps) {
    var sourceId = _parsed.sourceId != null ? String(_parsed.sourceId).trim() : "";
    if (!sourceId || sourceId === _parsed.text) {
      return;
    }
    if (_maps.idToMember[_nodeId].dataId == null) {
      _maps.idToMember[_nodeId].dataId = sourceId;
    }
    if (_maps.textToNodeId[sourceId] == null) {
      _maps.textToNodeId[sourceId] = _nodeId;
    }
  }

  function walkRow(_row, _maps, _nodesById) {
    var keys = rowKeys(_row);
    var parentId = null;
    var i;
    var cell;
    var parsed;
    var nodeId;
    var parentNode;
    for (i = 0; i < keys.length; i += 1) {
      cell = _row[keys[i]];
      if (cell == null) {
        continue;
      }
      parsed = _hierarchyCell.parseHierarchyCell(cell);
      if (!parsed || !parsed.text) {
        continue;
      }
      nodeId = getOrCreateIdForText(parsed.text, _maps);
      recordSourceId(parsed, nodeId, _maps);
      ensureNode(_nodesById, nodeId, parentId, rankOfKey(keys[i], i));
      if (parentId != null) {
        parentNode = _nodesById[parentId];
        if (parentNode && parentNode.children.indexOf(nodeId) === -1) {
          parentNode.children.push(nodeId);
        }
      }
      parentId = nodeId;
    }
  }

  // Tree of hierarchy rows (one cell per level, root first). Node ids are 1-based in first-seen order of the cell text.
  // Returns an empty tree when `_rows` is not an array. `_sicht` and `_tableKey` are echoed into the result.
  function buildOrgTreeFromRows(_rows, _sicht, _tableKey) {
    var maps = { textToNodeId: {}, idToMember: {}, nextId: 1 };
    var nodesById = {};
    var i;
    if (Array.isArray(_rows)) {
      for (i = 0; i < _rows.length; i += 1) {
        if (_rows[i] != null && typeof _rows[i] === "object") {
          walkRow(_rows[i], maps, nodesById);
        }
      }
    }
    return {
      sicht: _sicht,
      tableKey: _tableKey,
      nodesById: nodesById,
      idToMember: maps.idToMember,
      textToNodeId: maps.textToNodeId
    };
  }

  // Cache-only read of the hierarchy table of `sicht` through `readRows` and its tree; null without a reader or rows.
  function readOrgTree(_options) {
    var options = _options || {};
    var tableKey = _hierarchyTable.hierarchyTableKey(options.sicht);
    var rows;
    if (typeof options.readRows !== "function") {
      return null;
    }
    rows = options.readRows([{ tableName: tableKey }]);
    if (!Array.isArray(rows) || !rows.length) {
      return null;
    }
    return buildOrgTreeFromRows(rows, options.sicht, tableKey);
  }

  return {
    buildOrgTreeFromRows: buildOrgTreeFromRows,
    readOrgTree: readOrgTree
  };
});
