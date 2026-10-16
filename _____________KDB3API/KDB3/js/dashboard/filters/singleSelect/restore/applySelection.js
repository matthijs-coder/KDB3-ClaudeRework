define([
  "../config.js",
  "../runtime.js",
  "../hostFilterIo.js",
  "../state/selection.js",
  "../inventory/definitions.js",
  "../commit/tableValues.js",
  "./generationGuards.js"
], function (_config, _singleSelectRuntime, _hostFilterIo, _selectionState, _definitions, _tableValues, _guards) {
  "use strict";

  function readMapPair(_definition, _useValue) {
    var map = _definition && _definition.selectionValuesByDisplay;
    var keys = Object.keys(map || {});
    var matches = [];
    for (var i = 0; i < keys.length; i += 1) {
      var entry = map[keys[i]];
      if (entry && String(entry.u == null ? "" : entry.u) === _useValue && entry.d != null) {
        matches.push({ d: String(entry.d), u: _useValue });
      }
    }
    if (matches.length === 1) { return matches[0]; }
    return null;
  }

  function readDumpSingleton(_definition, _useValue) {
    if (_definition && String(_definition.useValue == null ? "" : _definition.useValue) === _useValue &&
      _definition.displayValue != null) {
      return { d: String(_definition.displayValue), u: _useValue };
    }
    return null;
  }

  async function readTablePair(_KDB, _instance, _useValue) {
    var tableData = _KDB && _KDB.services ? _KDB.services.tableData : null;
    var tableKey = _tableValues.resolveFilterOptionsTableKey(_instance.filterLabel);
    var tableConfig = _KDB && _KDB.config && _KDB.config.tables
      ? _KDB.config.tables[tableKey] : null;
    if (!tableData || !tableConfig || typeof tableData.readRows !== "function") { return null; }
    var input = [{ tableName: tableKey, shape: tableConfig.shape, pick: tableConfig.pick }];
    var rows = tableData.readRows(input);
    if (!Array.isArray(rows) && typeof tableData.waitForRows === "function") {
      try {
        rows = await tableData.waitForRows(input);
      } catch (error) {
        console.warn("[singleSelect.resolveRestoreSelectionPair] table wait failed", {
          tableKey: tableKey
        }, error);
        return null;
      }
    }
    return _tableValues.findMatchingUseValue(rows, _useValue, _instance.filterLabel);
  }

  async function resolveRestoreSelectionPair(_KDB, _instance, _useValue) {
    try {
      var useValue = _useValue == null ? "" : String(_useValue);
      if (!useValue) {
        return { selection: { d: "Alle", u: "" }, degraded: false, diagnostic: null };
      }
      var definitionResult = _definitions.readFilterDefinition(
        _KDB, null, _instance.scopeType, _instance.itemName, _instance.itemId
      );
      var mapPair = readMapPair(definitionResult.definition, useValue);
      if (mapPair) {
        return { selection: mapPair, degraded: false, diagnostic: null };
      }
      var tablePair = await readTablePair(_KDB, _instance, useValue);
      if (tablePair) {
        return { selection: tablePair, degraded: false, diagnostic: null };
      }
      var dumpPair = readDumpSingleton(definitionResult.definition, useValue);
      if (dumpPair) {
        return { selection: dumpPair, degraded: false, diagnostic: null };
      }
      return {
        selection: { d: useValue, u: useValue },
        degraded: true,
        diagnostic: {
          code: _config.errorCodes.RESTORE_DISPLAY_DEGRADED,
          filterInstanceId: _instance.filterInstanceId,
          message: "real display unavailable; transport-only d=u used before mandatory reread"
        }
      };
    } catch (error) {
      console.error("[singleSelect.resolveRestoreSelectionPair] failed", {
        filterInstanceId: _instance && _instance.filterInstanceId
      }, error);
      throw error;
    }
  }

  function commitEmptyRestore(_canonicalInstance, _root) {
    _selectionState.applyConfirmedState(_canonicalInstance, _root, {
      displayValue: "Alle", useValue: "", displaySource: "policy"
    });
    return { committed: true, degraded: false, diagnostic: null };
  }

  function commitObservedRestore(_canonicalInstance, _root, _args) {
    var observed = _args.observed;
    var resolved = _args.resolved;
    var useValue = _args.useValue;
    var observedDisplay = observed[0].d == null ? null : String(observed[0].d);
    var resolvedD = resolved.selection && resolved.selection.d != null
      ? String(resolved.selection.d)
      : null;
    if (resolved.degraded === false && resolvedD != null && observedDisplay !== resolvedD) {
      _selectionState.applyConfirmedState(_canonicalInstance, _root, {
        displayValue: resolvedD,
        useValue: String(observed[0].u),
        displaySource: "table"
      });
      return { committed: true, degraded: false, diagnostic: null };
    }
    var transportOnly = resolved.degraded === true &&
      (observedDisplay === null || observedDisplay === useValue);
    var displayUnavailable = observedDisplay === null;
    _selectionState.applyConfirmedState(_canonicalInstance, _root, {
      displayValue: transportOnly ? null : observedDisplay,
      useValue: String(observed[0].u),
      displaySource: transportOnly || displayUnavailable ? "unavailable" : "cognos"
    });
    return {
      committed: true,
      degraded: transportOnly || displayUnavailable,
      diagnostic: transportOnly ? resolved.diagnostic : (displayUnavailable ? {
        code: _config.parameterSetCodes.DISPLAY_DEGRADED,
        filterInstanceId: _args.filterInstanceId,
        message: "host reread confirmed use value without an independent display value"
      } : null)
    };
  }

  function commitRestoreSelection(_canonicalInstance, _root, _args) {
    try {
      if (!_args.useValue) {
        return commitEmptyRestore(_canonicalInstance, _root);
      }
      return commitObservedRestore(_canonicalInstance, _root, _args);
    } catch (error) {
      console.error("[singleSelect.commitRestoreSelection] failed", {
        filterInstanceId: _args && _args.filterInstanceId
      }, error);
      throw error;
    }
  }

  function toCancelled(_guard, _degraded, _rollback) {
    var diag = _guard && _guard.diagnostics && _guard.diagnostics[0]
      ? _guard.diagnostics[0]
      : { code: _config.parameterSetCodes.CANCELLED, message: "singleSelect restore superseded before canonical commit" };
    var suffix = _rollback ? "; rollback " + (_rollback.ok ? "succeeded" : "failed") : "";
    return {
      committed: false,
      cancelled: true,
      degraded: _degraded === true,
      diagnostic: { code: diag.code, message: String(diag.message || "") + suffix }
    };
  }

  async function applyRestoreSelectionCore(_KDB, _runtime, _instance, _entry, _runId, _payload) {
    try {
      var payload = Object.assign({}, _payload || {}, { runId: _runId });
      var filtersFacet = _singleSelectRuntime.readFiltersFacet(_KDB, _runtime);
      var root = _KDB.state.filters.singleSelect;
      var canonicalInstance = root.instancesById && root.instancesById[_instance.filterInstanceId];
      var filterRef = _hostFilterIo.resolveFilterRef(_KDB, _runtime, {
        filterInstanceId: _instance.filterInstanceId
      });
      var useValue = _entry && _entry.vals && _entry.vals[0] != null ? String(_entry.vals[0]) : "";
      if (!_hostFilterIo.isWriteReady(filtersFacet) || !filterRef || !canonicalInstance) {
        throw new Error("restore host API unavailable for " + _instance.filterInstanceId);
      }
      var preGuard = _guards.validateMutationGuard(_KDB, payload);
      if (!preGuard.ok) {
        return toCancelled(preGuard, false);
      }
      var priorValues = _hostFilterIo.readValues(filtersFacet, filterRef);
      var rollbackInput = Array.isArray(priorValues)
        ? priorValues.map(function (entry) { return Object.assign({}, entry || {}); })
        : [];
      var resolved = await resolveRestoreSelectionPair(_KDB, _instance, useValue);
      var preWriteGuard = _guards.validateMutationGuard(_KDB, payload);
      if (!preWriteGuard.ok) {
        return toCancelled(preWriteGuard, false);
      }
      if (!(await _hostFilterIo.writeValues(filtersFacet, filterRef, useValue ? [resolved.selection] : []))) {
        throw new Error("restore host API unavailable for " + _instance.filterInstanceId);
      }
      var postGuard = _guards.validateMutationGuard(_KDB, payload);
      if (!postGuard.ok) {
        var rollbackPost = await _hostFilterIo.rollbackExact(filtersFacet, filterRef, rollbackInput);
        return toCancelled(postGuard, true, rollbackPost);
      }
      var observed = _hostFilterIo.readValues(filtersFacet, filterRef);
      if (!useValue) {
        if (Array.isArray(observed) && observed.length > 0) {
          var rollbackClear = await _hostFilterIo.rollbackExact(filtersFacet, filterRef, rollbackInput);
          throw new Error("empty restore reread returned a non-empty host value; rollback " +
            (rollbackClear.ok ? "succeeded" : "failed"));
        }
        var preCommitEmpty = _guards.validateMutationGuard(_KDB, payload);
        if (!preCommitEmpty.ok) {
          var rollbackEmpty = await _hostFilterIo.rollbackExact(filtersFacet, filterRef, rollbackInput);
          return toCancelled(preCommitEmpty, true, rollbackEmpty);
        }
        return commitRestoreSelection(canonicalInstance, root, {
          useValue: useValue, resolved: resolved, observed: observed,
          filterInstanceId: _instance.filterInstanceId
        });
      }
      if (!Array.isArray(observed) || !observed[0] || String(observed[0].u || "") !== useValue) {
        var rollbackMismatch = await _hostFilterIo.rollbackExact(filtersFacet, filterRef, rollbackInput);
        throw new Error("restore reread did not confirm target use value; rollback " +
          (rollbackMismatch.ok ? "succeeded" : "failed"));
      }
      var preCommit = _guards.validateMutationGuard(_KDB, payload);
      if (!preCommit.ok) {
        var rollbackFinal = await _hostFilterIo.rollbackExact(filtersFacet, filterRef, rollbackInput);
        return toCancelled(preCommit, true, rollbackFinal);
      }
      return commitRestoreSelection(canonicalInstance, root, {
        useValue: useValue, resolved: resolved, observed: observed,
        filterInstanceId: _instance.filterInstanceId
      });
    } catch (error) {
      console.error("[singleSelect.applyRestoreSelectionCore] failed", {
        filterInstanceId: _instance && _instance.filterInstanceId
      }, error);
      throw error;
    }
  }

  async function applyRestoreSelection(_KDB, _runtime, _instance, _entry, _runId, _payload) {
    try {
      return await applyRestoreSelectionCore(_KDB, _runtime, _instance, _entry, _runId, _payload);
    } catch (error) {
      console.error("[singleSelect.applyRestoreSelection] failed", {
        filterInstanceId: _instance && _instance.filterInstanceId
      }, error);
      return {
        committed: false,
        cancelled: true,
        degraded: false,
        diagnostic: {
          code: _config.parameterSetCodes.RESTORE_FAILED,
          message: String(error && error.message ? error.message : error)
        }
      };
    }
  }

  return {
    applyRestoreSelection: applyRestoreSelection,
    resolveRestoreSelectionPair: resolveRestoreSelectionPair
  };
});
