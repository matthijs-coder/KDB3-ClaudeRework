define([
  "../../schema/errorCodes.js",
  "./mapV2FilterEntries.js",
], function (_errorCodes, _mapV2FilterEntries) {
  "use strict";

  function walkGlobalFilters(_payload, _state, _filterPropObj, _diagnostics) {
    const gfo = _payload.globalFiltersObj;
    if (!gfo || typeof gfo !== "object") {
      return;
    }
    const tables = Object.keys(gfo);
    for (let tableIndex = 0; tableIndex < tables.length; tableIndex += 1) {
      const group = gfo[tables[tableIndex]];
      if (!group || typeof group !== "object") {
        continue;
      }
      const filterKeys = Object.keys(group);
      for (let filterIndex = 0; filterIndex < filterKeys.length; filterIndex += 1) {
        const meta = group[filterKeys[filterIndex]];
        const name = meta && typeof meta.name === "string" ? meta.name : "";
        if (name === "") {
          continue;
        }
        _mapV2FilterEntries.mapFilterEntry(
          _state, name, meta.valuesArray, null, _filterPropObj, _diagnostics
        );
      }
    }
  }

  function walkPageContextFilters(_payload, _state, _filterPropObj, _diagnostics) {
    const tabs = _payload.tabs;
    if (!tabs || typeof tabs !== "object") {
      return;
    }
    const tabIndices = Object.keys(tabs).filter(function (key) { return /^\d+$/.test(key); });
    for (let index = 0; index < tabIndices.length; index += 1) {
      const tabIdx = Number(tabIndices[index]);
      const arr = Array.isArray(tabs[tabIndices[index]].pageContextFilterObjArr)
        ? tabs[tabIndices[index]].pageContextFilterObjArr : [];
      for (let entryIndex = 0; entryIndex < arr.length; entryIndex += 1) {
        const entry = arr[entryIndex];
        if (!entry || typeof entry !== "object") {
          continue;
        }
        const keys = Object.keys(entry);
        if (keys.length === 0) {
          continue;
        }
        const meta = entry[keys[0]];
        const name = meta && typeof meta.itemName === "string" ? meta.itemName : "";
        if (name === "") {
          continue;
        }
        _mapV2FilterEntries.mapFilterEntry(
          _state, name, meta.valuesArray, tabIdx, _filterPropObj, _diagnostics
        );
      }
    }
  }

  function finalizeDstl(_state, _diagnostics) {
    if (!_state.dstl) {
      return;
    }
    if (_state.dstl.glob.length === 0) {
      delete _state.dstl.glob;
    }
    if (Object.keys(_state.dstl.byTab).length === 0) {
      delete _state.dstl.byTab;
    }
    const hasGlob = _state.dstl.glob && _state.dstl.glob.length > 0;
    const hasByTab = _state.dstl.byTab && Object.keys(_state.dstl.byTab).length > 0;
    if (!hasGlob && !hasByTab) {
      delete _state.dstl;
      return;
    }
    if (!_state.sicht) {
      _diagnostics.push(_errorCodes.makeDiagnostic(
        _errorCodes.codes.WRITEBACK_FILTER_KIND_UNSUPPORTED,
        "map",
        "filt.dstl omitted because filt.sicht is missing",
        { activeFilterKey: _state.dstl.key }
      ));
      delete _state.dstl;
    }
  }

  function mapV2Filters(_KDB, _payload, _diagnostics) {
    try {
      const filterPropObj = _KDB && _KDB.properties ? _KDB.properties.filterPropObj : null;
      const state = { sels: [], pcfs: [] };
      walkGlobalFilters(_payload, state, filterPropObj, _diagnostics);
      walkPageContextFilters(_payload, state, filterPropObj, _diagnostics);
      finalizeDstl(state, _diagnostics);
      const filt = {};
      if (state.sicht) {
        filt.sicht = state.sicht;
      }
      if (state.dstl) {
        filt.dstl = state.dstl;
      }
      if (state.sels.length > 0) {
        filt.sels = state.sels;
      }
      if (state.pcfs.length > 0) {
        filt.pcfs = state.pcfs;
      }
      return Object.keys(filt).length > 0 ? filt : null;
    } catch (error) {
      throw error;
    }
  }

  return mapV2Filters;
});
