define([
  "./sanitizeHashValue.js"
], function (_sanitizeHashValue) {
  "use strict";

  function __controller(_sel, _tree) {
    try {
      var display;
      var idValueRaw;
      var idValueSan;
      var textToNodeId;
      var idToMember;
      var keys;
      var i;
      var key;
      var meta;
      var metaDataId;
      var metaText;
      var n;
      if (!_sel || !_tree) {
        return null;
      }
      textToNodeId = _tree.textToNodeId || {};
      idToMember = _tree.idToMember || {};
      display = String(_sel.displayValue == null ? "" : _sel.displayValue).trim();
      idValueRaw = String(_sel.idValue == null ? "" : _sel.idValue).trim();
      idValueSan = _sanitizeHashValue(idValueRaw) || idValueRaw;
      if (display && textToNodeId[display] != null) {
        return textToNodeId[display];
      }
      if (idValueSan && textToNodeId[idValueSan] != null) {
        return textToNodeId[idValueSan];
      }
      if (!idValueSan) {
        return null;
      }
      keys = Object.keys(idToMember);
      for (i = 0; i < keys.length; i += 1) {
        key = keys[i];
        meta = idToMember[key] || {};
        metaDataId = meta.dataId != null ? _sanitizeHashValue(String(meta.dataId).trim()) : "";
        metaText = meta.text != null ? _sanitizeHashValue(String(meta.text).trim()) : "";
        if ((metaDataId && metaDataId === idValueSan) || (metaText && metaText === idValueSan)) {
          n = parseInt(String(key), 10);
          if (!isNaN(n)) {
            return n;
          }
        }
      }
      return null;
    } catch (err) {
      console.error("[drillthrough.resolveOrgNodeId]", err);
      throw err;
    }
  }

  return __controller;
});
