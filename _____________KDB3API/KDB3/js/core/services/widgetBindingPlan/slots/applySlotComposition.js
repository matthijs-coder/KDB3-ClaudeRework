define([], function () {
  "use strict";
  function moveElement(_ids, _fromIndex, _toIndex) {
    if (_fromIndex < 0 || _fromIndex >= _ids.length) { return _ids.slice(); }
    var next = _ids.slice();
    var moved = next.splice(_fromIndex, 1)[0];
    if (moved == null) { return next; }
    var target = _toIndex < 0 ? 0 : (_toIndex > next.length ? next.length : _toIndex);
    next.splice(target, 0, moved);
    return next;
  }
  function slotCompositionPolicy(_visTypeConfig, _slotName) {
    var composition = _visTypeConfig && _visTypeConfig.slotComposition;
    return composition && composition[_slotName] ? composition[_slotName] : null;
  }
  function resolveDimensionPolicy(_slotPolicy, _slotName, _dimAffects) {
    if (_slotPolicy && _slotPolicy.dimension) { return _slotPolicy.dimension; }
    if (_slotName === "grid_cols" && _dimAffects === "grid_cols") {
      return { mode: "prependThenMoveFirstToIndex", targetIndex: 2 };
    }
    return null;
  }
  function resolveHierarchyPolicy(_slotPolicy, _slotName) {
    if (_slotPolicy && _slotPolicy.hierarchy) { return _slotPolicy.hierarchy; }
    if (_slotName === "grid_cols") {
      return { mode: "insertBeforeSelectedDimensionOrBeforeLast" };
    }
    return null;
  }
  function applyDimensionComposition(_columnIds, _policy) {
    if (!_policy || _policy.mode !== "prependThenMoveFirstToIndex") { return _columnIds; }
    var targetIndex = typeof _policy.targetIndex === "number" ? _policy.targetIndex : 2;
    return moveElement(_columnIds, 0, targetIndex);
  }
  function insertHierarchyId(_columnIds, _hierarchyId, _policy, _selectedDimensionId) {
    var next = _columnIds.slice();
    var existingIdx = next.indexOf(_hierarchyId);
    if (existingIdx >= 0) { next.splice(existingIdx, 1); }
    if (_policy && _policy.mode === "insertBeforeSelectedDimensionOrBeforeLast") {
      var dimIdx = _selectedDimensionId ? next.indexOf(_selectedDimensionId) : -1;
      var insertAt = dimIdx >= 0 ? dimIdx : Math.max(0, next.length - 1);
      next.splice(insertAt, 0, _hierarchyId);
      return next;
    }
    if (_policy && _policy.mode === "insertAfterSelectedDimensionOrAt") {
      var selectedDimIdx = _selectedDimensionId ? next.indexOf(_selectedDimensionId) : -1;
      var targetIndexAfter = typeof _policy.targetIndex === "number" ? _policy.targetIndex : 0;
      var insertAfterAt = selectedDimIdx >= 0
        ? selectedDimIdx + 1
        : (targetIndexAfter < 0 ? 0 : (targetIndexAfter > next.length ? next.length : targetIndexAfter));
      next.splice(insertAfterAt, 0, _hierarchyId);
      return next;
    }
    if (_policy && _policy.mode === "moveToIndex") {
      var targetIndex = typeof _policy.targetIndex === "number" ? _policy.targetIndex : 0;
      var clamped = targetIndex < 0 ? 0 : (targetIndex > next.length ? next.length : targetIndex);
      next.splice(clamped, 0, _hierarchyId);
      return next;
    }
    if (next.indexOf(_hierarchyId) < 0) { next.push(_hierarchyId); }
    return next;
  }
  function prependUniqueId(_leadId, _columnIds) {
    var merged = [String(_leadId)];
    for (var u = 0; u < _columnIds.length; u += 1) {
      if (_columnIds[u] !== merged[0] && merged.indexOf(_columnIds[u]) < 0) { merged.push(_columnIds[u]); }
    }
    return merged;
  }
  return {
    slotCompositionPolicy: slotCompositionPolicy,
    resolveDimensionPolicy: resolveDimensionPolicy,
    resolveHierarchyPolicy: resolveHierarchyPolicy,
    applyDimensionComposition: applyDimensionComposition,
    insertHierarchyId: insertHierarchyId,
    prependUniqueId: prependUniqueId,
  };
});
