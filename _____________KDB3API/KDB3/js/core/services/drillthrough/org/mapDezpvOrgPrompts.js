define([
  "./highestWins.js",
  "./resolveOrgNodeId.js",
  "./normalizeDezpvValue.js",
  "./sanitizeHashValue.js"
], function (_highestWins, _resolveOrgNodeId, _normalizeDezpvValue, _sanitizeHashValue) {
  "use strict";

  function walkRootId(_nodeId, _nodesById) {
    var curId = _nodeId;
    var cur = _nodesById[curId];
    var guard = 0;
    while (cur && Array.isArray(cur.parent) && cur.parent.length) {
      curId = cur.parent[0];
      cur = _nodesById[curId];
      guard += 1;
      if (guard > 50) {
        break;
      }
    }
    return curId;
  }

  function memberIdFromNode(_nodeId, _tree) {
    var meta = _tree && _tree.idToMember ? _tree.idToMember[_nodeId] : null;
    if (!meta) {
      return "";
    }
    return String(meta.dataId != null && String(meta.dataId).trim() ? meta.dataId : meta.text || "").trim();
  }

  function isMarkerEligible(_rootId, _nodesById, _selectedIdMap) {
    var node = _nodesById[_rootId];
    var children = node && Array.isArray(node.children) ? node.children : [];
    var i;
    if (_selectedIdMap[_rootId]) {
      return true;
    }
    if (!children.length) {
      return false;
    }
    for (i = 0; i < children.length; i += 1) {
      if (!_selectedIdMap[children[i]]) {
        return false;
      }
    }
    return true;
  }

  function pushUnique(_arr, _set, _value) {
    if (!_value || _set[_value]) {
      return;
    }
    _set[_value] = true;
    _arr.push(_value);
  }

  function sanitizeOrdinary(_value) {
    if (!_value || String(_value).indexOf("|||#ALLE_GG#") !== -1) {
      return _value ? String(_value) : "";
    }
    return _sanitizeHashValue(_value);
  }

  function rawEndsWithAlle(_raw) {
    var raw = String(_raw == null ? "" : _raw).trim();
    if (raw.indexOf("DS_") === 0) {
      raw = raw.slice(3);
    }
    return raw.length >= 5 && raw.slice(-5) === "|ALLE";
  }

  function mapDezpvOrgPrompts(_orgSelection, _tree, _warnings) {
    try {
      var selectedArr = _orgSelection && Array.isArray(_orgSelection.selectedValues) ? _orgSelection.selectedValues : [];
      var i, sel, resolved, wins, rootId, memberId, normalized;
      var selectedIdMap = {}, rootMap = {}, markerRoots = {};
      var gruppeArr = [], gruppeSet = {}, dezpvArr = [], dezpvSet = {};
      var rootKeys;
      if (!_tree || typeof _tree !== "object") {
        return { errorCode: "DRILLTHROUGH_ORG_TREE_MISSING" };
      }
      if (!_tree.nodesById || typeof _tree.nodesById !== "object") {
        return { errorCode: "DRILLTHROUGH_ORG_TREE_INVALID" };
      }
      resolved = [];
      for (i = 0; i < selectedArr.length; i += 1) {
        sel = selectedArr[i] || {};
        resolved.push({
          sel: sel,
          nodeId: _resolveOrgNodeId(sel, _tree),
          level: typeof sel.level === "number" ? sel.level : null,
          idValue: String(sel.idValue != null ? sel.idValue : sel.displayValue || "").trim()
        });
        if (resolved[i].nodeId != null) {
          selectedIdMap[resolved[i].nodeId] = true;
          rootMap[walkRootId(resolved[i].nodeId, _tree.nodesById)] = true;
        }
      }
      wins = _highestWins(resolved, _tree.nodesById);
      rootKeys = Object.keys(rootMap);
      for (i = 0; i < rootKeys.length; i += 1) {
        rootId = rootKeys[i];
        memberId = memberIdFromNode(rootId, _tree);
        normalized = _normalizeDezpvValue(memberId, 0);
        if (!normalized) {
          continue;
        }
        pushUnique(gruppeArr, gruppeSet, sanitizeOrdinary(normalized));
        if (isMarkerEligible(rootId, _tree.nodesById, selectedIdMap)) {
          markerRoots[rootId] = true;
          if (rawEndsWithAlle(memberId)) {
            pushUnique(dezpvArr, dezpvSet, "#ALLE_GG#");
          } else {
            pushUnique(dezpvArr, dezpvSet, normalized + "|||#ALLE_GG#");
          }
        }
      }
      for (i = 0; i < wins.highest.length; i += 1) {
        if (wins.highest[i].level === 0) {
          continue;
        }
        rootId = walkRootId(wins.highest[i].nodeId, _tree.nodesById);
        if (markerRoots[rootId]) {
          continue;
        }
        pushUnique(dezpvArr, dezpvSet, sanitizeOrdinary(_normalizeDezpvValue(wins.highest[i].idValue, wins.highest[i].level)));
      }
      for (i = 0; i < wins.unresolved.length; i += 1) {
        pushUnique(dezpvArr, dezpvSet, sanitizeOrdinary(_normalizeDezpvValue(wins.unresolved[i].idValue, wins.unresolved[i].level)));
      }
      return {
        p_gruppe_drillFromGDB: gruppeArr.join(";"),
        p_dezpv_drillFromGDB: dezpvArr.join(";"),
        p_dienststelle_drillFromGDB: ""
      };
    } catch (err) {
      console.error("[drillthrough.mapDezpvOrgPrompts]", err);
      throw err;
    }
  }

  return mapDezpvOrgPrompts;
});
