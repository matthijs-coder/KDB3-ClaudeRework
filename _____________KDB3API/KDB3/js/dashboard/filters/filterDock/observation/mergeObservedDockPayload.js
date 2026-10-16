define([], function () {
  "use strict";

  function mergePendingEvaluationMerge(_runtime, _summary) {
    if (!_runtime.pendingEvaluationMerge) {
      return;
    }
    _runtime.pendingEvaluationMerge.mutationDelta =
      (_runtime.pendingEvaluationMerge.mutationDelta || 0) +
      _summary.addedCount +
      _summary.removedCount +
      (_summary.attributeCount || 0);
    _runtime.pendingEvaluationMerge.addedCount =
      (_runtime.pendingEvaluationMerge.addedCount || 0) + _summary.addedCount;
    _runtime.pendingEvaluationMerge.removedCount =
      (_runtime.pendingEvaluationMerge.removedCount || 0) + _summary.removedCount;
    _runtime.pendingEvaluationMerge.attributeCount =
      (_runtime.pendingEvaluationMerge.attributeCount || 0) + (_summary.attributeCount || 0);
    _runtime.pendingEvaluationMerge.nonKdbAttributeCount =
      (_runtime.pendingEvaluationMerge.nonKdbAttributeCount || 0) +
      (_summary.nonKdbAttributeCount || 0);
    _runtime.pendingEvaluationMerge.hasAttributeMutations =
      _runtime.pendingEvaluationMerge.hasAttributeMutations === true ||
      _summary.hasAttributeMutations === true;
    _runtime.pendingEvaluationMerge.hasNonKdbAttributeMutations =
      _runtime.pendingEvaluationMerge.hasNonKdbAttributeMutations === true ||
      _summary.hasNonKdbAttributeMutations === true;
    _runtime.pendingEvaluationMerge.lastAddedSignature =
      _summary.lastAddedSignature || _runtime.pendingEvaluationMerge.lastAddedSignature;
    _runtime.pendingEvaluationMerge.lastRemovedSignature =
      _summary.lastRemovedSignature || _runtime.pendingEvaluationMerge.lastRemovedSignature;
    _runtime.pendingEvaluationMerge.lastAttributeSignature =
      _summary.lastAttributeSignature || _runtime.pendingEvaluationMerge.lastAttributeSignature;
    _runtime.pendingEvaluationMerge.lastNonKdbAttributeSignature =
      _summary.lastNonKdbAttributeSignature ||
      _runtime.pendingEvaluationMerge.lastNonKdbAttributeSignature;
  }

  function buildPendingEvaluationMerge(_summary, _scheduledAt) {
    return {
      mutationDelta: _summary.addedCount + _summary.removedCount + (_summary.attributeCount || 0),
      addedCount: _summary.addedCount,
      removedCount: _summary.removedCount,
      attributeCount: _summary.attributeCount || 0,
      nonKdbAttributeCount: _summary.nonKdbAttributeCount || 0,
      hasAttributeMutations: _summary.hasAttributeMutations === true,
      hasNonKdbAttributeMutations: _summary.hasNonKdbAttributeMutations === true,
      lastAddedSignature: _summary.lastAddedSignature,
      lastRemovedSignature: _summary.lastRemovedSignature,
      lastAttributeSignature: _summary.lastAttributeSignature,
      lastNonKdbAttributeSignature: _summary.lastNonKdbAttributeSignature,
      scheduledAt: _scheduledAt
    };
  }

  return {
    mergePendingEvaluationMerge: mergePendingEvaluationMerge,
    buildPendingEvaluationMerge: buildPendingEvaluationMerge
  };
});
