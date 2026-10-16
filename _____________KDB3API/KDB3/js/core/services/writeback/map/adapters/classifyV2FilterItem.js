define([], function () {
  "use strict";

  function matchInBucket(bucket, targetLower) {
    if (!bucket || typeof bucket !== "object") {
      return null;
    }
    const keys = Object.keys(bucket);
    for (let index = 0; index < keys.length; index += 1) {
      if (String(keys[index]).trim().toLowerCase() === targetLower) {
        return bucket[keys[index]];
      }
    }
    return null;
  }

  function lookupFilterPropEntry(_filterPropObj, _name) {
    if (!_filterPropObj || typeof _filterPropObj !== "object" || !_name) {
      return null;
    }
    const targetLower = String(_name).trim().toLowerCase();
    const packageKeys = Object.keys(_filterPropObj);
    for (let index = 0; index < packageKeys.length; index += 1) {
      const pkg = _filterPropObj[packageKeys[index]];
      if (!pkg || typeof pkg !== "object") {
        continue;
      }
      const found = matchInBucket(pkg.globalFilters, targetLower)
        || matchInBucket(pkg.pageContextFilters, targetLower);
      if (found) {
        return found;
      }
    }
    return null;
  }

  function isDienststelleName(_lowerName) {
    return _lowerName === "dienststelle"
      || _lowerName === "dienststelle_bw"
      || _lowerName === "dienststelle_dezpv";
  }

  function hasDuPairs(_valuesArray) {
    if (!Array.isArray(_valuesArray) || _valuesArray.length === 0) {
      return false;
    }
    for (let index = 0; index < _valuesArray.length; index += 1) {
      const row = _valuesArray[index];
      if (row && typeof row.d === "string" && row.d.trim() !== ""
        && typeof row.u === "string" && row.u.trim() !== "") {
        return true;
      }
    }
    return false;
  }

  function classifyV2FilterItem(_filterPropObj, _name, _valuesArray) {
    const name = String(_name || "").trim();
    const lower = name.toLowerCase();
    if (lower === "sicht") {
      return { kind: "sicht" };
    }
    const prop = lookupFilterPropEntry(_filterPropObj, name);
    if (isDienststelleName(lower) || (prop && prop.isHierarchy === "true")) {
      return { kind: "dstl", name: name };
    }
    if (prop && prop.isSingleSelect === "true") {
      return { kind: "sels", key: name };
    }
    if (prop && prop.isNative === "true") {
      return { kind: "pcfs", nm: name };
    }
    if (hasDuPairs(_valuesArray)) {
      return { kind: "pcfs", nm: name };
    }
    return { kind: "unsupported" };
  }

  return classifyV2FilterItem;
});
