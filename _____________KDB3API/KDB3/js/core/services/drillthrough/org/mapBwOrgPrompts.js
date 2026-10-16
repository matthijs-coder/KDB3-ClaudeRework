define([
  "./highestWins.js",
  "./resolveOrgNodeId.js",
  "./collectBwGruppeCandidates.js",
  "./expandBwLevel001Children.js",
  "./sanitizeHashValue.js"
], function (_highestWins, _resolveOrgNodeId, _collectBwGruppeCandidates, _expandBwLevel001Children, _sanitizeHashValue) {
  "use strict";

  function isMag(_sel) {
    return String((_sel && (_sel.idValue || _sel.displayValue)) || "").trim().toLowerCase() === "mag";
  }

  function isLevel0(_sel) {
    return !!(_sel && _sel.level === 0);
  }

  function memberIdFromNode(_nodeId, _tree) {
    var meta = _tree && _tree.idToMember ? _tree.idToMember[_nodeId] : null;
    if (!meta) {
      return "";
    }
    return String(meta.dataId != null && String(meta.dataId).trim() ? meta.dataId : meta.text || "").trim();
  }

  function isCoveredByCandidate(_nodeId, _nodesById, _candidateMap) {
    var curId = _nodeId;
    var cur = _nodesById[curId];
    var guard = 0;
    if (_candidateMap[curId]) {
      return true;
    }
    while (cur && Array.isArray(cur.parent) && cur.parent.length) {
      curId = cur.parent[0];
      if (_candidateMap[curId]) {
        return true;
      }
      cur = _nodesById[curId];
      guard += 1;
      if (guard > 50) {
        break;
      }
    }
    return false;
  }

  function pushUnique(_arr, _set, _value) {
    if (!_value || _value === "#ALLE_GG#" || _set[_value]) {
      return;
    }
    _set[_value] = true;
    _arr.push(_value);
  }

  function __controller(_orgSelection, _tree, _warnings) {
    try {
      var selectedArr = _orgSelection && Array.isArray(_orgSelection.selectedValues) ? _orgSelection.selectedValues : [];
      var i, sel, resolved, wins, selectedIdMap, candidateMap, allCovered, candKeys, children, c;
      var hasMagLevel0 = false, hasMag = false, hasLevel0 = false;
      var gruppeOut = [], gruppeSet = {}, dienstOut = [], dienstSet = {};
      for (i = 0; i < selectedArr.length; i += 1) {
        sel = selectedArr[i] || {};
        if (isMag(sel)) {
          hasMag = true;
        }
        if (isLevel0(sel)) {
          hasLevel0 = true;
        }
        if (isMag(sel) && isLevel0(sel)) {
          hasMagLevel0 = true;
        }
      }
      if (hasMagLevel0 || !selectedArr.length) {
        return { p_gruppe_drillFromGDB: "", p_dienststelle_drillFromGDB: "", p_dezpv_drillFromGDB: "" };
      }
      if (hasMag !== hasLevel0 && Array.isArray(_warnings)) {
        _warnings.push({ code: "DRILLTHROUGH_BW_MAG_LEVEL_MISMATCH", message: "MAG and level-0 did not both match" });
      }
      if (!_tree || typeof _tree !== "object") {
        return { errorCode: "DRILLTHROUGH_ORG_TREE_MISSING" };
      }
      if (!_tree.nodesById || typeof _tree.nodesById !== "object") {
        return { errorCode: "DRILLTHROUGH_ORG_TREE_INVALID" };
      }
      resolved = [];
      selectedIdMap = {};
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
        }
      }
      wins = _highestWins(resolved, _tree.nodesById);
      candidateMap = _collectBwGruppeCandidates(_tree.nodesById, selectedIdMap);
      candKeys = Object.keys(candidateMap);
      allCovered = candKeys.length > 0 && wins.highest.length > 0;
      for (i = 0; allCovered && i < wins.highest.length; i += 1) {
        if (!isCoveredByCandidate(wins.highest[i].nodeId, _tree.nodesById, candidateMap)) {
          allCovered = false;
        }
      }
      if (allCovered) {
        for (i = 0; i < candKeys.length; i += 1) {
          pushUnique(gruppeOut, gruppeSet, _sanitizeHashValue(memberIdFromNode(candKeys[i], _tree)));
        }
      } else {
        for (i = 0; i < wins.highest.length; i += 1) {
          if (wins.highest[i].level === 1) {
            children = _expandBwLevel001Children(_tree.nodesById[wins.highest[i].nodeId], _tree);
            for (c = 0; c < children.length; c += 1) {
              pushUnique(dienstOut, dienstSet, children[c]);
            }
          } else {
            pushUnique(dienstOut, dienstSet, _sanitizeHashValue(wins.highest[i].idValue));
          }
        }
        for (i = 0; i < wins.unresolved.length; i += 1) {
          pushUnique(dienstOut, dienstSet, _sanitizeHashValue(wins.unresolved[i].idValue));
        }
      }
      if (!gruppeOut.length && !dienstOut.length) {
        for (i = 0; i < selectedArr.length; i += 1) {
          sel = String((selectedArr[i] || {}).displayValue || "").trim();
          if (sel.indexOf("Geschäftsgruppe") === 0) {
            pushUnique(gruppeOut, gruppeSet, _sanitizeHashValue(sel));
            break;
          }
        }
      }
      return {
        p_gruppe_drillFromGDB: gruppeOut.join(";"),
        p_dienststelle_drillFromGDB: gruppeOut.length ? "" : dienstOut.join(";"),
        p_dezpv_drillFromGDB: ""
      };
    } catch (err) {
      console.error("[drillthrough.mapBwOrgPrompts]", err);
      throw err;
    }
  }

  return __controller;
});
