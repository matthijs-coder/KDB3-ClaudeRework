define([
  "./filterRestoreTargets.js"
], function (_filterTargets) {
  "use strict";

  function buildAllowedClearTabIdxs(_filt, _resolvedTargets) {
    var allowed;
    var filt;
    var named;
    try {
      allowed = [];
      filt = _filt || {};
      addVisibleTabIdxs(allowed, _resolvedTargets);
      named = _filterTargets.collectPageContextTabIdx(
        Array.isArray(filt.sels) ? filt.sels : [],
        filt.dstl,
        Array.isArray(filt.pcfs) ? filt.pcfs : []
      );
      addNamedTabIdxs(allowed, named);
      return allowed;
    } catch (error) {
      console.error("[writebackSet.buildAllowedClearTabIdxs] failed", error);
      throw error;
    }
  }

  function addVisibleTabIdxs(allowed, _resolvedTargets) {
    var targets;
    var keys;
    var idx;
    var tabIdx;
    var target;
    try {
      targets = _resolvedTargets && typeof _resolvedTargets === "object" ? _resolvedTargets : {};
      keys = Object.keys(targets);
      for (idx = 0; idx < keys.length; idx += 1) {
        tabIdx = parseInt(keys[idx], 10);
        target = targets[keys[idx]];
        if (!isNonNegativeInt(tabIdx) || String(tabIdx) !== keys[idx]) { continue; }
        if (!target || target.visible !== true) { continue; }
        if (allowed.indexOf(tabIdx) === -1) { allowed.push(tabIdx); }
      }
    } catch (error) {
      console.error("[writebackSet.addVisibleTabIdxs] failed", error);
      throw error;
    }
  }

  function addNamedTabIdxs(allowed, named) {
    var idx;
    var tabIdx;
    try {
      if (!Array.isArray(named)) { return; }
      for (idx = 0; idx < named.length; idx += 1) {
        tabIdx = named[idx];
        if (!isNonNegativeInt(tabIdx)) { continue; }
        if (allowed.indexOf(tabIdx) === -1) { allowed.push(tabIdx); }
      }
    } catch (error) {
      console.error("[writebackSet.addNamedTabIdxs] failed", error);
      throw error;
    }
  }

  function isNonNegativeInt(value) {
    return typeof value === "number" && isFinite(value) && value >= 0 && Math.floor(value) === value;
  }

  return buildAllowedClearTabIdxs;
});
