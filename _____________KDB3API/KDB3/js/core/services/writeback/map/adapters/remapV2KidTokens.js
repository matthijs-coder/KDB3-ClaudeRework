define([
  "../../schema/errorCodes.js",
  "../../../../config/mapping/kidIndex.js",
  "./buildV2SourceMapping.js",
  "./universalizeV2KidTree.js",
  "./deUniversalizeV2KidTree.js",
], function (_errorCodes, _parameterMapping, _buildV2SourceMapping, _universalizeV2KidTree, _deUniversalizeV2KidTree) {
  "use strict";

  function cloneV2Payload(_payload) {
    return JSON.parse(JSON.stringify(_payload));
  }

  function isSamePackage(_payload, _KDB) {
    const gfo = _payload && _payload.globalFiltersObj;
    const topKeys = gfo && typeof gfo === "object" ? Object.keys(gfo) : [];
    if (topKeys.length === 0) {
      return false;
    }
    const index = _parameterMapping.getParameterMappingIndex(_KDB);
    const pkg = index && index.package;
    const main = pkg ? pkg.datasourceName : null;
    const alt = pkg ? pkg.alternativeDatasourceName : null;
    const allowed = {};
    if (typeof main === "string" && main) {
      allowed[main] = true;
    }
    if (typeof alt === "string" && alt) {
      allowed[alt] = true;
    }
    if (!Object.keys(allowed).length) {
      return false;
    }
    for (let keyIndex = 0; keyIndex < topKeys.length; keyIndex += 1) {
      if (!allowed[topKeys[keyIndex]]) {
        return false;
      }
    }
    return true;
  }

  function remapV2KidTokens(_KDB, _payload, _diagnostics) {
    try {
      const clone = cloneV2Payload(_payload);
      if (isSamePackage(_payload, _KDB)) {
        return clone;
      }
      const index = _parameterMapping.getParameterMappingIndex(_KDB);
      const sourceMap = _buildV2SourceMapping(_payload, index && index.package);
      const universal = _universalizeV2KidTree(clone, sourceMap);
      const targetMap = index && index.rawKid ? index.rawKid : {};
      const remapped = _deUniversalizeV2KidTree.deUniversalizeV2KidTree(universal, targetMap);
      const unresolved = {};
      _deUniversalizeV2KidTree.collectUnresolvedTokens(remapped, unresolved);
      const tokens = Object.keys(unresolved);
      for (let indexToken = 0; indexToken < tokens.length; indexToken += 1) {
        _diagnostics.push(_errorCodes.makeDiagnostic(
          _errorCodes.codes.WRITEBACK_MAPPING_TOKEN_UNRESOLVED,
          "map",
          "cross-package KID token could not be resolved to runtime mapping",
          { token: tokens[indexToken] }
        ));
      }
      return remapped;
    } catch (error) {
      throw error;
    }
  }

  return remapV2KidTokens;
});
