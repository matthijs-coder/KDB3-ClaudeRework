define([], function () {
  "use strict";

  function extractStringValues(_values) {
    var out = [];
    var idx;
    var entry;
    var value;
    if (!Array.isArray(_values)) {
      return out;
    }
    for (idx = 0; idx < _values.length; idx += 1) {
      entry = _values[idx];
      if (entry == null) {
        continue;
      }
      if (typeof entry === "string") {
        value = entry;
      } else if (entry.useValue != null && String(entry.useValue) !== "") {
        value = String(entry.useValue);
      } else if (entry.displayValue != null && String(entry.displayValue) !== "") {
        value = String(entry.displayValue);
      } else {
        continue;
      }
      out.push(value);
    }
    return out;
  }

  function extractDisplayValues(_values) {
    var out = [];
    var idx;
    var entry;
    if (!Array.isArray(_values)) {
      return out;
    }
    for (idx = 0; idx < _values.length; idx += 1) {
      entry = _values[idx];
      if (entry && typeof entry === "object" && entry.displayValue != null && String(entry.displayValue) !== "") {
        out.push(String(entry.displayValue));
      } else if (typeof entry === "string" && entry.trim()) {
        out.push(entry.trim());
      }
    }
    return out;
  }

  function hasEffectiveSelection(_payload) {
    var selection = _payload && _payload.selection ? _payload.selection : null;
    return !!(selection && selection.useValue != null && String(selection.useValue) !== "");
  }

  function buildResolutionBlock(_sourceResolution, _options) {
    var sourceResolution = _sourceResolution && typeof _sourceResolution === "object" ? _sourceResolution : {};
    var options = _options || {};
    var downstreamValues = extractStringValues(sourceResolution.downstreamValues);
    var dominantValues = extractStringValues(sourceResolution.dominantValues);
    var displayValues = Array.isArray(sourceResolution.displayValues)
      ? sourceResolution.displayValues.slice()
      : extractDisplayValues(sourceResolution.dominantValues).concat(extractDisplayValues(sourceResolution.downstreamValues));
    var hostDisplayValues = Array.isArray(sourceResolution.hostDisplayValues)
      ? sourceResolution.hostDisplayValues.slice()
      : null;
    var hasConfirmedSelection = sourceResolution.hasConfirmedSelection === true;

    if (
      options.applySelectionFallback === true &&
      !downstreamValues.length &&
      !dominantValues.length &&
      hasEffectiveSelection(options.payload)
    ) {
      var selection = options.payload.selection || null;
      dominantValues = [String(selection.useValue)];
      displayValues = selection.displayValue != null && String(selection.displayValue) !== ""
        ? [String(selection.displayValue)]
        : displayValues;
      if (typeof selection.hostDisplay === "string" && selection.hostDisplay !== "") {
        hostDisplayValues = [String(selection.hostDisplay)];
      }
    }
    if (!hasConfirmedSelection && (downstreamValues.length || dominantValues.length)) {
      hasConfirmedSelection = true;
    }

    var resolution = {
      hasConfirmedSelection: hasConfirmedSelection,
      downstreamValues: downstreamValues,
      dominantValues: dominantValues,
      displayValues: displayValues,
      dominantScopeKey: sourceResolution.dominantScopeKey != null
        ? String(sourceResolution.dominantScopeKey)
        : sourceResolution.dominantScope != null
          ? String(sourceResolution.dominantScope)
          : null
    };
    if (Array.isArray(hostDisplayValues)) {
      resolution.hostDisplayValues = hostDisplayValues;
    }
    return resolution;
  }

  function normalizePlannerSnapshot(_snapshot) {
    var snap = _snapshot || {};
    var sourceResolution = snap.resolution && typeof snap.resolution === "object" ? snap.resolution : {};
    return {
      activeDownstreamName: snap.activeDownstreamName != null
        ? String(snap.activeDownstreamName)
        : snap.filterId != null
          ? String(snap.filterId)
          : null,
      hierarchyItemId: snap.hierarchyItemId != null ? String(snap.hierarchyItemId) : null,
      resolution: buildResolutionBlock(sourceResolution, {}),
      byFilter: snap.byFilter || null
    };
  }

  function normalizeHierarchySnapshot(_payload) {
    var payload = _payload || {};
    if (payload.hierarchySnapshot && typeof payload.hierarchySnapshot === "object") {
      return normalizePlannerSnapshot(payload.hierarchySnapshot);
    }
    var sourceResolution = payload.resolution && typeof payload.resolution === "object"
      ? payload.resolution
      : {};
    return {
      activeDownstreamName: payload.activeFilterKey != null
        ? String(payload.activeFilterKey)
        : sourceResolution.activeFilterKey != null
          ? String(sourceResolution.activeFilterKey)
          : null,
      resolution: buildResolutionBlock(sourceResolution, {
        applySelectionFallback: true,
        payload: payload
      }),
      byFilter: payload.byFilter || null
    };
  }

  return normalizeHierarchySnapshot;
});
