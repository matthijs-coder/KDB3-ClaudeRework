define(["../ownerRoutes.js"], function (_ownerRoutes) {
  "use strict";

  var COUNT_KEYS = ["addedCount", "removedCount", "attributeCount", "nonKdbAttributeCount"];
  var FLAG_KEYS = ["hasAttributeMutations", "hasNonKdbAttributeMutations"];
  var SIGNATURE_KEYS = [
    "lastAddedSignature",
    "lastRemovedSignature",
    "lastAttributeSignature",
    "lastNonKdbAttributeSignature"
  ];

  function buildElementSignature(node) {
    var parts;
    var dataTid;
    if (!node || node.nodeType !== 1) {
      return null;
    }
    parts = [node.tagName || "UNKNOWN"];
    dataTid = typeof node.getAttribute === "function" ? node.getAttribute("data-tid") : null;
    if (dataTid) {
      parts.push("data-tid=" + dataTid);
    }
    if (node.id) {
      parts.push("id=" + node.id);
    }
    if (typeof node.className === "string" && node.className) {
      parts.push("class=" + node.className.split(/\s+/).slice(0, 3).join("."));
    }
    return parts.join("|");
  }

  function isKdbOwnedMutationTarget(node) {
    var current = node;
    while (current && current.nodeType === 1) {
      if (_ownerRoutes.isKdbOwnedClassName(typeof current.className === "string" ? current.className : "")) {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  }

  function summarizeMutations(records) {
    var list = Array.isArray(records) ? records : [];
    var summary = {
      addedCount: 0,
      removedCount: 0,
      attributeCount: 0,
      hasAttributeMutations: false,
      nonKdbAttributeCount: 0,
      hasNonKdbAttributeMutations: false,
      lastAddedSignature: null,
      lastRemovedSignature: null,
      lastAttributeSignature: null,
      lastNonKdbAttributeSignature: null,
      observedAt: 0
    };
    var signature;
    list.forEach(function (record) {
      if (!record) {
        return;
      }
      if (record.type === "childList") {
        summary.addedCount += record.addedNodes ? record.addedNodes.length : 0;
        summary.removedCount += record.removedNodes ? record.removedNodes.length : 0;
        if (record.addedNodes && record.addedNodes.length) {
          summary.lastAddedSignature = buildElementSignature(record.addedNodes[record.addedNodes.length - 1]);
        }
        if (record.removedNodes && record.removedNodes.length) {
          summary.lastRemovedSignature = buildElementSignature(record.removedNodes[record.removedNodes.length - 1]);
        }
      } else if (record.type === "attributes") {
        signature = buildElementSignature(record.target);
        summary.attributeCount += 1;
        summary.lastAttributeSignature = signature;
        if (!isKdbOwnedMutationTarget(record.target)) {
          summary.nonKdbAttributeCount += 1;
          summary.hasNonKdbAttributeMutations = true;
          summary.lastNonKdbAttributeSignature = signature;
        }
      }
    });
    summary.hasAttributeMutations = summary.attributeCount > 0;
    summary.observedAt = Date.now();
    return summary;
  }

  function readMutationDelta(summary) {
    return summary.addedCount + summary.removedCount + (summary.attributeCount || 0);
  }

  function createPendingSummary(summary, scheduledAt) {
    var pending = { mutationDelta: readMutationDelta(summary), scheduledAt: scheduledAt };
    COUNT_KEYS.forEach(function (key) { pending[key] = summary[key] || 0; });
    FLAG_KEYS.forEach(function (key) { pending[key] = summary[key] === true; });
    SIGNATURE_KEYS.forEach(function (key) { pending[key] = summary[key]; });
    return pending;
  }

  function mergePendingSummary(pending, summary) {
    pending.mutationDelta = (pending.mutationDelta || 0) + readMutationDelta(summary);
    COUNT_KEYS.forEach(function (key) { pending[key] = (pending[key] || 0) + (summary[key] || 0); });
    FLAG_KEYS.forEach(function (key) { pending[key] = pending[key] === true || summary[key] === true; });
    SIGNATURE_KEYS.forEach(function (key) { pending[key] = summary[key] || pending[key]; });
    return pending;
  }

  return {
    buildElementSignature: buildElementSignature,
    isKdbOwnedMutationTarget: isKdbOwnedMutationTarget,
    summarizeMutations: summarizeMutations,
    createPendingSummary: createPendingSummary,
    mergePendingSummary: mergePendingSummary
  };
});
