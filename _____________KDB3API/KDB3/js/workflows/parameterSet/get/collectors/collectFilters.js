define([
  "../../../../core/config/writebackErrorCodes.js",
  "./collectDienststelleFilter.js",
  "./collectSingleSelectInstances.js",
  "./collectNativeMultiSelect.js",
  "./collectorSupport.js",
], function (_errorCodes, _collectDienststelleFilter, _collectSingleSelectInstances, _collectNativeMultiSelect, _support) {
  "use strict";

  async function collectFilterTargets(_KDB) {
    const tabsApi = _KDB && _KDB.api ? _KDB.api.tabs : null;
    if (!tabsApi || typeof tabsApi.dispatch !== "function") {
      throw _errorCodes.createWritebackError(
        _errorCodes.codes.WRITEBACK_TABS_NOT_READY,
        "get",
        "tabs API dispatch is unavailable for filter-scope target traversal/readiness"
      );
    }
    const result = await tabsApi.dispatch({
      type: "tabs/resolveFilterScopeTargets",
      payload: { source: "writebackGet" },
    });
    if (!result || result.ok !== true || !result.tabTargets || typeof result.tabTargets !== "object") {
      throw _errorCodes.createWritebackError(
        _errorCodes.codes.WRITEBACK_TABS_NOT_READY,
        "get",
        "tabs/resolveFilterScopeTargets failed during writeback GET filter readiness",
        { diagnostics: result && result.diagnostics ? result.diagnostics : null }
      );
    }
    return result.tabTargets;
  }

  async function collectFilters(_KDB, diagnostics) {
    const filt = {};
    let sicht;
    let sels;
    let dstl;
    let pcfs;
    let liveTabTargets = null;

    try {
      liveTabTargets = await collectFilterTargets(_KDB);
    } catch (error) {
      recordCollectorError(diagnostics, "filterTargets", error);
    }

    try {
      sicht = collectSicht(_support.readApiState(_KDB, "sicht"));
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

  function collectSicht(sichtState) {
    if (!sichtState) return null;
    const fromSelection = _support.trimUseValue(sichtState.currentSelection);
    if (fromSelection !== "") return fromSelection;
    const activeSichtValue = typeof sichtState.activeSichtValue === "string"
      ? sichtState.activeSichtValue.trim()
      : "";
    return activeSichtValue !== "" ? activeSichtValue : null;
  }

  // Fail-visible (remediation B3): a crash in a filter sub-collector must not leave
  // the filt section silently partial; the marker makes writebackGet.collect abort
  // the whole save. Exception (review finding 2): readiness conditions with their own
  // code (stale inventory, tabs not ready) are no crash. The section is simply missing
  // and writebackGet tells the user the save is partial instead of blocking it.
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
