define([
  "../../schema/errorCodes.js",
  "./collectFilterTargets.js",
  "./collectDienststelleFilter.js",
  "./collectSingleSelectInstances.js",
  "./collectNativeMultiSelect.js",
  "./singleSelectFilterSupport.js",
], function (_errorCodes, _collectFilterTargets, _collectDienststelleFilter, _collectSingleSelectInstances, _collectNativeMultiSelect, _singleSelectFilterSupport) {
  "use strict";

  async function collectFilters(_KDB, diagnostics) {
    const filt = {};
    let sicht;
    let sels;
    let dstl;
    let pcfs;
    let liveTabTargets = null;

    try {
      liveTabTargets = await _collectFilterTargets(_KDB);
    } catch (error) {
      recordCollectorError(diagnostics, "filterTargets", error);
    }

    try {
      sicht = collectSicht(readOwnerState(_KDB, "sicht"));
    } catch (error) {
      recordCollectorError(diagnostics, "sicht", error);
    }

    try {
      sels = _collectSingleSelectInstances(_KDB, diagnostics, liveTabTargets);
    } catch (error) {
      recordCollectorError(diagnostics, "singleSelect", error);
      sels = null;
    }

    try {
      dstl = _collectDienststelleFilter(_KDB, diagnostics, liveTabTargets);
      if (dstl && !sicht) {
        diagnostics.push(_errorCodes.makeDiagnostic(
          _errorCodes.codes.WRITEBACK_FILTER_KIND_UNSUPPORTED,
          "get",
          "filt.dstl omitted because the active Sicht value is missing",
          { activeFilterKey: dstl.key }
        ));
        dstl = null;
      }
    } catch (error) {
      recordCollectorError(diagnostics, "dienststelle", error);
    }

    try {
      pcfs = _collectNativeMultiSelect(_KDB, diagnostics, liveTabTargets);
    } catch (error) {
      recordCollectorError(diagnostics, "nativeMultiSelect", error);
      pcfs = null;
    }

    if (sicht) filt.sicht = sicht;
    if (sels && sels.length > 0) filt.sels = sels;
    if (dstl) filt.dstl = dstl;
    if (pcfs && pcfs.length > 0) filt.pcfs = pcfs;
    return Object.keys(filt).length === 0 ? {} : { filt: filt };
  }

  function readOwnerState(_KDB, owner) {
    const api = _KDB && _KDB.api ? _KDB.api[owner] : null;
    return api && typeof api.getState === "function" ? api.getState() : null;
  }

  function collectSicht(sichtState) {
    if (!sichtState) return null;
    const fromSelection = _singleSelectFilterSupport.trimUseValue(sichtState.currentSelection);
    if (fromSelection !== "") return fromSelection;
    const activeSichtValue = typeof sichtState.activeSichtValue === "string"
      ? sichtState.activeSichtValue.trim()
      : "";
    return activeSichtValue !== "" ? activeSichtValue : null;
  }

  // Fail-visible (remediation B3): een crash in een filter-subcollector mag de
  // filt-sectie niet stil partieel laten; de marker laat writebackGet.collect
  // de hele save afbreken. Uitzondering (reviewbevinding 2): readiness-condities
  // met een eigen code (stale inventory, tabs niet klaar) zijn geen crash — de
  // sectie ontbreekt zoals voorheen en writebackGet meldt de save als
  // onvolledig (partial) aan de user in plaats van hem te blokkeren.
  const READINESS_CODES = {
    WRITEBACK_SINGLESELECT_INVENTORY_STALE: true,
    WRITEBACK_TABS_NOT_READY: true
  };

  function recordCollectorError(diagnostics, collectorName, error) {
    const original = error && error.diagnostic ? error.diagnostic : null;
    if (original) {
      diagnostics.push(original);
      if (READINESS_CODES[original.code] === true) { return; }
    }
    diagnostics.push(_errorCodes.makeDiagnostic(
      _errorCodes.codes.WRITEBACK_COLLECTOR_FAILED,
      "get",
      collectorName + " collector failed",
      { collector: collectorName, error: error && error.message ? error.message : String(error) }
    ));
  }

  return collectFilters;
});
