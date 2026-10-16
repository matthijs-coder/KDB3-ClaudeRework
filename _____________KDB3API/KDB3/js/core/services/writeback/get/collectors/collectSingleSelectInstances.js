define([
  "../../schema/errorCodes.js",
  "./singleSelectFilterSupport.js",
  "./singleSelectCollectorInventory.js",
  "./singleSelectCollectorScope.js",
  "./singleSelectCollectorMaterialize.js",
], function (_errorCodes, _singleSelectFilterSupport, _readInventoryInstances, _resolvePageContextTabIdx, _materializeSingleSelectEntries) {
  "use strict";

  function collectSingleSelectInstances(_KDB, diagnostics, liveTabTargets) {
    const instances = _readInventoryInstances(_KDB);
    const pending = [];
    const seenByFilterInstanceId = {};

    for (let index = 0; index < instances.length; index += 1) {
      const instance = instances[index];
      if (!instance || seenByFilterInstanceId[instance.filterInstanceId]) continue;
      seenByFilterInstanceId[instance.filterInstanceId] = true;

      const filterKey = readSemanticFilterKey(instance);
      if (_singleSelectFilterSupport.isKnownUnsupportedKey(filterKey)) continue;

      const useValue = typeof instance.useValue === "string" ? instance.useValue.trim() : "";
      if (useValue === "") {
        if (hasConfirmedNonDefaultDisplay(instance)) {
          recordUseValueMissing(diagnostics, buildIdentityDetails(instance));
        }
        continue;
      }

      if (instance.scopeType === "global") {
        pending.push(buildPendingEntry(filterKey, readSemanticInstanceKey(instance), useValue, undefined));
        continue;
      }
      if (instance.scopeType !== "pageContext") {
        recordUnsupportedScope(diagnostics, buildIdentityDetails(instance), instance.scopeType);
        continue;
      }

      const identity = buildIdentityDetails(instance);
      const tabResolution = _resolvePageContextTabIdx(_KDB, instance, liveTabTargets, diagnostics, identity);
      if (!tabResolution.ok) continue;
      pending.push(buildPendingEntry(filterKey, readSemanticInstanceKey(instance), useValue, tabResolution.tab));
    }

    const materialized = _materializeSingleSelectEntries(pending, diagnostics);
    return materialized.length > 0 ? materialized : null;
  }

  function buildPendingEntry(key, instCandidate, useValue, tab) {
    return {
      key: key,
      defaultSemanticKey: key,
      instCandidate: instCandidate,
      tab: tab,
      vals: [useValue],
    };
  }

  function readSemanticFilterKey(instance) {
    const filterLabel = typeof instance.filterLabel === "string" ? instance.filterLabel.trim() : "";
    if (filterLabel !== "") return filterLabel;
    const itemName = typeof instance.itemName === "string" ? instance.itemName.trim() : "";
    return itemName;
  }

  function readSemanticInstanceKey(instance) {
    const key = typeof instance.semanticInstanceKey === "string" ? instance.semanticInstanceKey.trim() : "";
    return key !== "" ? key : null;
  }

  function hasConfirmedNonDefaultDisplay(instance) {
    const display = instance && instance.displayValue != null
      ? String(instance.displayValue).trim()
      : "";
    if (display === "") return false;
    return display.toLowerCase() !== "alle";
  }

  function recordUseValueMissing(diagnostics, identityDetails) {
    diagnostics.push(_errorCodes.makeDiagnostic(
      _errorCodes.codes.WRITEBACK_SINGLESELECT_USE_VALUE_MISSING,
      "get",
      "singleSelect instance has a non-empty display selection but no useValue",
      identityDetails
    ));
  }

  function recordUnsupportedScope(diagnostics, identityDetails, scopeType) {
    diagnostics.push(_errorCodes.makeDiagnostic(
      _errorCodes.codes.WRITEBACK_FILTER_KIND_UNSUPPORTED,
      "get",
      "singleSelect instance scopeType is unsupported for writeback collection",
      Object.assign({}, identityDetails, { scopeType: scopeType })
    ));
  }

  function buildIdentityDetails(instance) {
    return {
      key: readSemanticFilterKey(instance),
      inst: readSemanticInstanceKey(instance),
      filterInstanceId: instance.filterInstanceId || null,
      scopeType: instance.scopeType || null,
    };
  }

  return collectSingleSelectInstances;
});
