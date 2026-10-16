define(["../../../../core/utils/normalizeCognosScopeId.js"], function (_normalizeScopeId) {
  "use strict";

  function readOwnerState(_KDB) {
    return _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.singleSelect : undefined;
  }

  function projectFilterInstance(_record) {
    if (!_record) { return null; }
    var selection = _record.selectionOwner === "singleSelect" && _record.currentSelection
      ? _record.currentSelection : null;
    return {
      filterInstanceId: _record.filterInstanceId,
      scopeType: _record.scopeType,
      scopeId: _record.scopeId,
      filterLabel: _record.filterLabel,
      itemName: _record.itemName,
      itemId: _record.itemId == null ? null : _record.itemId,
      semanticInstanceKey: _record.semanticInstanceKey,
      filterType: _record.filterType,
      selectionOwner: _record.selectionOwner,
      identityQuality: _record.identityQuality,
      displayValue: selection ? selection.displayValue : null,
      useValue: selection ? selection.useValue : null,
      displaySource: selection ? selection.displaySource || null : null,
      status: _record.status,
      hostStatus: _record.hostStatus
    };
  }

  function cloneSelection(_selection) {
    return _selection ? Object.assign({}, _selection) : null;
  }

  function cloneInstance(_instance) {
    if (!_instance) { return undefined; }
    var cloned = Object.assign({}, _instance, {
      timestamps: _instance.timestamps ? Object.assign({}, _instance.timestamps) : null
    });
    ["currentSelection", "backupSelection", "pendingSelection"].forEach(function (_key) {
      if (Object.prototype.hasOwnProperty.call(_instance, _key)) {
        cloned[_key] = cloneSelection(_instance[_key]);
      } else {
        delete cloned[_key];
      }
    });
    return cloned;
  }

  function buildCompatibilityByScope(_state) {
    var byScope = { global: {}, pageContext: {} };
    var diagnostics = [];
    var byLabel = {};
    var ids = Object.keys((_state && _state.instancesById) || {}).sort();
    var idx;
    var rec;
    var key;
    for (idx = 0; idx < ids.length; idx += 1) {
      rec = _state.instancesById[ids[idx]];
      if (!rec || rec.selectionOwner !== "singleSelect" || rec.status !== "active" || rec.hostStatus !== "present") { continue; }
      key = rec.scopeType + "|" + rec.filterLabel;
      byLabel[key] = byLabel[key] || [];
      byLabel[key].push(rec);
    }
    Object.keys(byLabel).forEach(function (bucketKey) {
      var records = byLabel[bucketKey];
      var scopeType = bucketKey.split("|")[0];
      var label = bucketKey.slice(scopeType.length + 1);
      if (records.length !== 1) {
        diagnostics.push({ code: "SINGLE_SELECT_COMPATIBILITY_COLLISION", filterLabel: label, scopeType: scopeType });
        return;
      }
      byScope[scopeType][label] = cloneInstance(records[0]);
    });
    return { byScope: byScope, compatibilityDiagnostics: diagnostics };
  }

  function readFilterInstances(_KDB, _options) {
    var state = readOwnerState(_KDB);
    var options = _options || {};
    var out = [];
    Object.keys((state && state.instancesById) || {}).sort().forEach(function (id) {
      var rec = state.instancesById[id];
      if (!rec) { return; }
      if (options.status && rec.status !== options.status) { return; }
      if (options.hostStatus && rec.hostStatus !== options.hostStatus) { return; }
      if (options.scopeType && rec.scopeType !== options.scopeType) { return; }
      if (options.scopeId && _normalizeScopeId(rec.scopeId) !== _normalizeScopeId(options.scopeId)) { return; }
      out.push(projectFilterInstance(rec));
    });
    return out;
  }

  function readFilterInstance(_KDB, _filterInstanceId) {
    var state = readOwnerState(_KDB);
    return projectFilterInstance(state && state.instancesById ? state.instancesById[_filterInstanceId] : null);
  }

  function readFilterInstancesByScope(_KDB, _scopeType, _scopeId) {
    return readFilterInstances(_KDB, { scopeType: _scopeType, scopeId: _scopeId });
  }

  function readSingleSelectState(_KDB) {
    var state = readOwnerState(_KDB);
    var compatibility;
    var cloned = {};
    if (!state) { return undefined; }
    Object.keys(state.instancesById || {}).forEach(function (id) {
      cloned[id] = cloneInstance(state.instancesById[id]);
    });
    compatibility = buildCompatibilityByScope(state);
    return Object.assign({}, state, {
      meta: state.meta ? Object.assign({}, state.meta) : state.meta,
      inventory: state.inventory ? Object.assign({}, state.inventory) : null,
      lastInteraction: state.lastInteraction ? Object.assign({}, state.lastInteraction) : null,
      lastDiagnostics: Array.isArray(state.lastDiagnostics) ? state.lastDiagnostics.slice() : [],
      instancesById: cloned,
      byScope: compatibility.byScope,
      compatibilityDiagnostics: compatibility.compatibilityDiagnostics
    });
  }

  function readInventoryGeneration(_KDB) {
    var state = readOwnerState(_KDB);
    if (!state || !state.inventory) { return null; }
    return Number(state.inventory.generation || 0);
  }

  function readSingleSelectFilterState(_KDB, _filterScope, _filterLabel) {
    var projected = buildCompatibilityByScope(readOwnerState(_KDB) || {});
    return cloneInstance(projected.byScope && projected.byScope[_filterScope] ? projected.byScope[_filterScope][_filterLabel] : null);
  }

  function readCurrentSelection(_KDB, _filterScope, _filterLabel) {
    var filterState = readSingleSelectFilterState(_KDB, _filterScope, _filterLabel);
    return filterState ? cloneSelection(filterState.currentSelection) : null;
  }

  function readPendingSelection(_KDB, _filterScope, _filterLabel) {
    var filterState = readSingleSelectFilterState(_KDB, _filterScope, _filterLabel);
    return filterState ? cloneSelection(filterState.pendingSelection) : null;
  }

  return {
    readSingleSelectState: readSingleSelectState,
    readFilterInstances: readFilterInstances,
    readFilterInstance: readFilterInstance,
    readFilterInstancesByScope: readFilterInstancesByScope,
    readInventoryGeneration: readInventoryGeneration,
    readSingleSelectFilterState: readSingleSelectFilterState,
    readCurrentSelection: readCurrentSelection,
    readPendingSelection: readPendingSelection
  };
});
