define(["./isKdbOwnedMutationTarget.js"], function (_isKdbOwnedMutationTarget) {
  "use strict";

  function buildElementSignature(_node) {
    if (!_node || _node.nodeType !== 1) {
      return null;
    }
    var parts = [_node.tagName || "UNKNOWN"];
    var dataTid =
      typeof _node.getAttribute === "function" ? _node.getAttribute("data-tid") : null;
    if (dataTid) {
      parts.push("data-tid=" + dataTid);
    }
    if (_node.id) {
      parts.push("id=" + _node.id);
    }
    if (typeof _node.className === "string" && _node.className) {
      parts.push("class=" + String(_node.className).split(/\s+/).slice(0, 3).join("."));
    }
    return parts.join("|");
  }

  function __controller(_mutationRecords) {
    var records = Array.isArray(_mutationRecords) ? _mutationRecords : [];
    var addedCount = 0;
    var removedCount = 0;
    var attributeCount = 0;
    var lastAddedSignature = null;
    var lastRemovedSignature = null;
    var lastAttributeSignature = null;
    var nonKdbAttributeCount = 0;
    var hasNonKdbAttributeMutations = false;
    var lastNonKdbAttributeSignature = null;
    var index;
    for (index = 0; index < records.length; index += 1) {
      var record = records[index];
      if (!record) {
        continue;
      }
      if (record.type === "childList") {
        addedCount += record.addedNodes ? record.addedNodes.length : 0;
        removedCount += record.removedNodes ? record.removedNodes.length : 0;
        if (record.addedNodes && record.addedNodes.length) {
          lastAddedSignature = buildElementSignature(record.addedNodes[record.addedNodes.length - 1]);
        }
        if (record.removedNodes && record.removedNodes.length) {
          lastRemovedSignature = buildElementSignature(
            record.removedNodes[record.removedNodes.length - 1]
          );
        }
      } else if (record.type === "attributes") {
        var attributeSignature = buildElementSignature(record.target);
        attributeCount += 1;
        lastAttributeSignature = attributeSignature;
        if (!_isKdbOwnedMutationTarget(record.target)) {
          nonKdbAttributeCount += 1;
          hasNonKdbAttributeMutations = true;
          lastNonKdbAttributeSignature = attributeSignature;
        }
      }
    }
    return {
      addedCount: addedCount,
      removedCount: removedCount,
      attributeCount: attributeCount,
      hasAttributeMutations: attributeCount > 0,
      nonKdbAttributeCount: nonKdbAttributeCount,
      hasNonKdbAttributeMutations: hasNonKdbAttributeMutations,
      lastAddedSignature: lastAddedSignature,
      lastRemovedSignature: lastRemovedSignature,
      lastAttributeSignature: lastAttributeSignature,
      lastNonKdbAttributeSignature: lastNonKdbAttributeSignature,
      observedAt: Date.now()
    };
  }

  return __controller;
});
