define([
  "./geometry.js",
  "./lookup.js"
], function (_geometry, _lookup) {
  "use strict";

  function validateDropIntent(_KDB, _dropboxEl, _transferPayload, _layout) {
    const transferPayload = _transferPayload || null;

    if (!_dropboxEl || _dropboxEl.getAttribute("kdb_dropbox") !== "true") {
      return buildResult(false, "invalid-dropbox");
    }
    if (_lookup.isHelperDropbox(_KDB, _dropboxEl, readLayoutHelperTabIds(_layout))) {
      return buildResult(false, "helper-tab");
    }
    if (!transferPayload || !isAcceptedType(transferPayload.draggedElementType)) {
      return buildResult(false, "invalid-widget-type");
    }
    if (!isWithinBounds(_dropboxEl, transferPayload, _layout)) {
      return buildResult(false, "out-of-bounds");
    }
    if (hasFilterNameConflict(_KDB, transferPayload)) {
      return buildResult(false, "name-conflicts-with-filter");
    }
    return buildResult(true, null);
  }

  function buildResult(isValid, reason) {
    return {
      isValid: isValid,
      reason: reason
    };
  }

  function readLayoutHelperTabIds(layout) {
    return layout && Array.isArray(layout.helperTabIds) ? layout.helperTabIds : [];
  }

  function isAcceptedType(draggedElementType) {
    return draggedElementType === "visualization" || draggedElementType === "text";
  }

  function isWithinBounds(dropboxEl, transferPayload, layout) {
    const pointer = layout && layout.pointer ? layout.pointer : null;
    const dragOffset = layout && layout.dragOffset ? layout.dragOffset : {};
    const scaleX = normalizePositiveNumber(layout && layout.scaleX, normalizePositiveNumber(transferPayload.scaleX, 1));
    const scaleY = normalizePositiveNumber(layout && layout.scaleY, normalizePositiveNumber(transferPayload.scaleY, 1));
    const width = normalizePositiveNumber(transferPayload.defaultWidth, 300) * scaleX;
    const height = normalizePositiveNumber(transferPayload.defaultHeight, 300) * scaleY;

    return _geometry.isPlacementWithinBounds(pointer, dragOffset, width, height, dropboxEl);
  }

  function hasFilterNameConflict(_KDB, transferPayload) {
    const candidateLabel = normalizeText(resolveCandidateLabel(transferPayload));
    const filterNames = candidateLabel ? collectFilterNames(_KDB) : {};

    return Boolean(candidateLabel && filterNames[candidateLabel] === true);
  }

  function resolveCandidateLabel(transferPayload) {
    const payload = transferPayload && transferPayload.payload ? transferPayload.payload : {};
    return payload.title || payload.display || payload.langtext || payload.name || "";
  }

  function collectFilterNames(_KDB) {
    const filterPropObj = _KDB && _KDB.properties && _KDB.properties.filterPropObj ? _KDB.properties.filterPropObj : {};
    const sources = Object.keys(filterPropObj);
    const names = {};
    let sourceIndex;

    for (sourceIndex = 0; sourceIndex < sources.length; sourceIndex += 1) {
      collectFilterScopeNames(names, filterPropObj[sources[sourceIndex]] || {});
    }
    return names;
  }

  function collectFilterScopeNames(names, sourceCfg) {
    collectObjectKeys(names, sourceCfg.globalFilters || {});
    collectObjectKeys(names, sourceCfg.pageContextFilters || {});
  }

  function collectObjectKeys(names, objectValue) {
    const keys = Object.keys(objectValue || {});
    let index;

    for (index = 0; index < keys.length; index += 1) {
      names[normalizeText(keys[index])] = true;
    }
  }

  function normalizeText(value) {
    return String(value == null ? "" : value).trim().toLowerCase();
  }

  function normalizePositiveNumber(value, fallback) {
    const parsed = typeof value === "number" ? value : parseFloat(value);
    return isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }

  return validateDropIntent;
});
