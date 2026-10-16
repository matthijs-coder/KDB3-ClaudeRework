define([], function () {
  "use strict";

  var TEXT_KEYS = ["text", "label", "display", "d", "value", "id"];

  function extractLastBracketToken(_value) {
    var source = String(_value == null ? "" : _value).trim();
    var match;
    if (!source) {
      return "";
    }
    match = source.match(/\[([^\]]+)\](?!.*\[[^\]]+\])/);
    return match ? String(match[1] || "").trim() : "";
  }

  function cellText(_cell) {
    var i;
    var key;
    if (_cell && typeof _cell === "object") {
      for (i = 0; i < TEXT_KEYS.length; i += 1) {
        key = TEXT_KEYS[i];
        if (_cell[key] != null && String(_cell[key]).trim()) {
          return String(_cell[key]).trim();
        }
      }
      return "";
    }
    return _cell != null ? String(_cell).trim() : "";
  }

  function cellSourceId(_cell) {
    var token;
    if (!_cell || typeof _cell !== "object") {
      return null;
    }
    if (_cell.id != null && String(_cell.id).trim()) {
      return String(_cell.id).trim();
    }
    token = extractLastBracketToken(_cell.use);
    if (token) {
      return token;
    }
    token = extractLastBracketToken(_cell.useValue);
    if (token) {
      return token;
    }
    token = extractLastBracketToken(_cell.u);
    if (token) {
      return token;
    }
    token = extractLastBracketToken(_cell.value);
    if (token) {
      return token;
    }
    return null;
  }

  function parseHierarchyCell(_cell) {
    var text = cellText(_cell);
    if (!text) {
      return null;
    }
    return { text: text, sourceId: cellSourceId(_cell) };
  }

  function rankFromKey(_key) {
    var match = String(_key).match(/level0*(\d+)/i) || String(_key).match(/^(\d+)$/);
    var rank = match ? parseInt(match[1], 10) : NaN;
    return isNaN(rank) ? null : rank;
  }

  function rankHierarchyRowKeys(_row) {
    var i, keys;
    if (Array.isArray(_row)) {
      keys = [];
      for (i = 0; i < _row.length; i += 1) {
        keys.push(i);
      }
      return keys;
    }
    if (!_row || typeof _row !== "object") {
      return [];
    }
    return Object.keys(_row);
  }

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
      _nodesById[_nodeId] = { id: _nodeId, parent: _parentId ? [_parentId] : [], children: [], levelRank: _rank };
      return;
    }
    if (typeof node.levelRank !== "number" || _rank < node.levelRank) {
      node.levelRank = _rank;
      node.parent = _parentId ? [_parentId] : [];
    } else if (Array.isArray(node.parent) && node.parent.length === 0 && _parentId) {
      node.parent = [_parentId];
    }
  }

  function walkRow(_row, _maps, _nodesById) {
    var keys = rankHierarchyRowKeys(_row);
    var parentId = null;
    var i, cell, parsed, nodeId, sourceId, parentNode, rank;
    for (i = 0; i < keys.length; i += 1) {
      cell = _row[keys[i]];
      if (cell == null || cell === "") {
        continue;
      }
      parsed = parseHierarchyCell(cell);
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
      rank = typeof keys[i] === "number" ? keys[i] : rankFromKey(keys[i]);
      ensureNode(_nodesById, nodeId, parentId, rank == null ? i : rank);
      if (parentId != null) {
        parentNode = _nodesById[parentId];
        if (parentNode && parentNode.children.indexOf(nodeId) === -1) {
          parentNode.children.push(nodeId);
        }
      }
      parentId = nodeId;
    }
  }

  function buildOrgTree(_options) {
    try {
      var options = _options || {};
      var sicht = options.sicht;
      var tableKey = String(sicht || "").toUpperCase().trim() === "DEZPV"
        ? "dienststelle_dezpv_hierarchy"
        : "dienststelle_bw_hierarchy";
      var rows, maps, nodesById, i;
      if (typeof options.readRows !== "function") {
        return null;
      }
      rows = options.readRows([{ tableName: tableKey }]);
      if (!Array.isArray(rows) || !rows.length) {
        return null;
      }
      maps = { textToNodeId: {}, idToMember: {}, nextId: 1 };
      nodesById = {};
      for (i = 0; i < rows.length; i += 1) {
        if (rows[i] != null && typeof rows[i] === "object") {
          walkRow(rows[i], maps, nodesById);
        }
      }
      return {
        sicht: sicht,
        tableKey: tableKey,
        nodesById: nodesById,
        idToMember: maps.idToMember,
        textToNodeId: maps.textToNodeId
      };
    } catch (err) {
      console.error("[widgetVis.buildOrgTree]", err);
      return null;
    }
  }

  return {
    buildOrgTree: buildOrgTree,
    parseHierarchyCell: parseHierarchyCell
  };
});
