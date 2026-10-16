define([
  "./sanitizeHashValue.js"
], function (_sanitizeHashValue) {
  "use strict";

  function memberIdFromNode(_nodeId, _tree) {
    var meta = _tree && _tree.idToMember ? _tree.idToMember[_nodeId] : null;
    if (!meta) {
      return "";
    }
    if (meta.dataId != null && String(meta.dataId).trim()) {
      return String(meta.dataId).trim();
    }
    return String(meta.text || "").trim();
  }

  function __controller(_node, _tree) {
    var out = [];
    var seen = {};
    var children;
    var i;
    var childId;
    var sanitized;
    if (!_node || !Array.isArray(_node.children)) {
      return out;
    }
    children = _node.children;
    for (i = 0; i < children.length; i += 1) {
      childId = children[i];
      sanitized = _sanitizeHashValue(memberIdFromNode(childId, _tree));
      if (!sanitized || sanitized === "#ALLE_GG#" || seen[sanitized]) {
        continue;
      }
      seen[sanitized] = true;
      out.push(sanitized);
    }
    return out;
  }

  return __controller;
});
