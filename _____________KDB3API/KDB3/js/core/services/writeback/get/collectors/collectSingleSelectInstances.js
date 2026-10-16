define([
  "../../schema/errorCodes.js",
  "../../../../utils/tabSlots.js",
  "./collectorSupport.js",
  "./materializeSingleSelect.js",
], function (_errorCodes, _tabSlots, _support, _materializeSingleSelectEntries) {
  "use strict";

  // Owner reads go through the published getState() of singleSelect (and tabs below), like the other collectors; an
  // absent or destroyed owner reads as an empty state, i.e. a stale inventory.
  function projectInstance(record) {
    const selection = record.currentSelection || null;
    return {
      filterInstanceId: record.filterInstanceId,
      scopeType: record.scopeType,
      scopeId: record.scopeId,
      filterLabel: record.filterLabel,
      itemName: record.itemName,
      semanticInstanceKey: record.semanticInstanceKey,
      filterType: record.filterType,
      displayValue: selection ? selection.displayValue : null,
      useValue: selection ? selection.useValue : null,
    };
  }

  function readInventoryInstances(_KDB) {
    const state = _support.readApiState(_KDB, "singleSelect") || {};
    const inventory = state.inventory || {};
    const freshness = typeof inventory.freshness === "string" ? inventory.freshness : "stale";
    if (freshness !== "fresh") {
      throw _errorCodes.createWritebackError(
        _errorCodes.codes.WRITEBACK_SINGLESELECT_INVENTORY_STALE,
        "get",
        "singleSelect inventory is not fresh for writeback collection",
        { freshness: freshness, generation: inventory.generation == null ? null : inventory.generation }
      );
    }

    const byId = state.instancesById || {};
    return Object.keys(byId).sort().map(function (id) {
      return byId[id];
    }).filter(function (record) {
      return record &&
        record.status === "active" &&
        record.hostStatus === "present" &&
        record.selectionOwner === "singleSelect" &&
        record.filterType !== "sicht" &&
        record.filterType !== "dienststelle";
    }).map(projectInstance).sort(function (left, right) {
      return String(left.filterInstanceId || "").localeCompare(String(right.filterInstanceId || ""));
    });
  }

  function pushScopeIssue(_diagnostics, _code, _message, _details) {
    _diagnostics.push(_errorCodes.makeDiagnostic(_errorCodes.codes[_code], "get", _message, _details));
  }

  function resolvePageContextTabIdx(_readTabsState, _instance, _liveTabTargets, _diagnostics, _identityDetails) {
    if (!_liveTabTargets || typeof _liveTabTargets !== "object") {
      pushScopeIssue(_diagnostics, "WRITEBACK_SINGLESELECT_SCOPE_TARGET_MISSING",
        "page-context instance skipped because live scope targets are unavailable", _identityDetails);
      return { ok: false };
    }

    const match = _tabSlots.matchTabScope(_readTabsState(), _instance.scopeId, _liveTabTargets);
    if (!match || match.status === "missing") {
      pushScopeIssue(_diagnostics, "WRITEBACK_SINGLESELECT_SCOPE_TARGET_MISSING",
        "page-context scope cannot be mapped to one dashboard tab target",
        Object.assign({}, _identityDetails, { scopeId: _instance.scopeId }));
      return { ok: false };
    }
    if (match.status === "ambiguous") {
      pushScopeIssue(_diagnostics, "WRITEBACK_SINGLESELECT_SCOPE_TARGET_AMBIGUOUS",
        "page-context scope maps to multiple dashboard tab targets",
        Object.assign({}, _identityDetails, { scopeId: _instance.scopeId, candidates: match.candidates || [] }));
      return { ok: false };
    }
    if (match.evidence !== "liveScope") {
      pushScopeIssue(_diagnostics, "WRITEBACK_SINGLESELECT_SCOPE_TARGET_MISSING",
        "alias-only tab scope evidence is unsafe for page-context writeback collection",
        Object.assign({}, _identityDetails, { scopeId: _instance.scopeId, evidence: match.evidence || null }));
      return { ok: false };
    }

    const tabIdx = match.tab && match.tab.tabIdx != null ? Number(match.tab.tabIdx) : NaN;
    if (!isFinite(tabIdx) || tabIdx < 0 || Math.floor(tabIdx) !== tabIdx) {
      pushScopeIssue(_diagnostics, "WRITEBACK_SINGLESELECT_SCOPE_TARGET_MISSING",
        "liveScope match did not expose a valid numeric tabIdx",
        Object.assign({}, _identityDetails, { scopeId: _instance.scopeId, tabIdx: match.tab ? match.tab.tabIdx : null }));
      return { ok: false };
    }
    const liveTarget = _liveTabTargets[String(tabIdx)];
    if (!liveTarget || liveTarget.visible !== true) {
      return { ok: false };
    }
    return { ok: true, tab: tabIdx };
  }

  function collectSingleSelectInstances(_KDB, diagnostics, liveTabTargets) {
    const instances = readInventoryInstances(_KDB);
    let tabsState;
    const readTabsState = function () {
      if (tabsState === undefined) { tabsState = _support.readApiState(_KDB, "tabs"); }
      return tabsState;
    };
    const pending = [];
    const seenByFilterInstanceId = {};

    for (let index = 0; index < instances.length; index += 1) {
      const instance = instances[index];
      if (!instance || seenByFilterInstanceId[instance.filterInstanceId]) continue;
      seenByFilterInstanceId[instance.filterInstanceId] = true;

      const filterKey = readSemanticFilterKey(instance);
      if (_support.isKnownUnsupportedKey(filterKey)) continue;

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
      const tabResolution = resolvePageContextTabIdx(readTabsState, instance, liveTabTargets, diagnostics, identity);
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
