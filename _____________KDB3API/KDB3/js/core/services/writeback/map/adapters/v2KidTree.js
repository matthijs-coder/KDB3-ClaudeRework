define([], function () {
  "use strict";

  // v2 payloads carry KID strings of the package they were saved in. buildV2SourceMapping collects
  // kid -> original pairs from the payload, universalizeV2KidTree replaces originals by ***kid*** tokens
  // and deUniversalizeV2KidTree resolves those tokens against the runtime package map.

  const TOKEN_RX = /^\*{3}(.+?)\*{3}([\s\S]*)$/;
  const UNRESOLVED_RX = /\*{3}[^*]+\*{3}/;

  function sanitizeToken(_value) {
    return String(_value).replace(/\^+/g, "").trim();
  }

  function removeLastBracketDot(_value) {
    return String(_value).replace(/(\.\[[^\]]+\])(?![\s\S]*\.\[[^\]]+\])/, "");
  }

  function lastBracketSuffix(_value) {
    const match = String(_value).match(/(\.\[[^\]]+\])$/);
    return match ? match[1] : "";
  }

  function deriveLabel(_rawKey) {
    const text = String(_rawKey);
    const segments = text.match(/\[([^\]]+)\]/g);
    if (segments && segments.length > 0) {
      const index = segments.length - 1;
      let label = segments[index].slice(1, -1);
      if (label === "Langtext" || label === "Tooltip" || / - Name$/i.test(label)) {
        if (index > 0) {
          label = segments[index - 1].slice(1, -1);
        }
      }
      return label.replace(/_flach/gi, "").trim();
    }
    return text.replace(/_flach/gi, "").replace(/\s*-\s*Name$/i, "").trim();
  }

  function addRev(_mapping, _seen, _kid, _original) {
    const kid = sanitizeToken(_kid);
    const original = sanitizeToken(_original);
    if (!kid || !original || _seen[kid]) {
      return;
    }
    _mapping[kid] = original;
    _seen[kid] = true;
  }

  function processFilterKey(_mapping, _seen, _rawKey, _meta) {
    const cleanKey = sanitizeToken(_rawKey);
    const label = deriveLabel(cleanKey);
    if (!label) {
      return;
    }
    addRev(_mapping, _seen, label + "_filter_KID", cleanKey);
    const values = Array.isArray(_meta && _meta.valuesArray) ? _meta.valuesArray : [];
    for (let index = 0; index < values.length; index += 1) {
      const useStr = values[index] && (values[index].u || values[index].use);
      if (!useStr) {
        continue;
      }
      const base = removeLastBracketDot(sanitizeToken(useStr));
      addRev(_mapping, _seen, label + "_filter_use_KID", base);
    }
  }

  function walkTabs(_mapping, _seen, _tabsObj) {
    if (!_tabsObj || typeof _tabsObj !== "object") {
      return;
    }
    const tabValues = Object.keys(_tabsObj).map(function (key) { return _tabsObj[key]; });
    for (let tabIndex = 0; tabIndex < tabValues.length; tabIndex += 1) {
      const arr = Array.isArray(tabValues[tabIndex].pageContextFilterObjArr)
        ? tabValues[tabIndex].pageContextFilterObjArr : [];
      for (let entryIndex = 0; entryIndex < arr.length; entryIndex += 1) {
        const entry = arr[entryIndex];
        if (!entry || typeof entry !== "object") {
          continue;
        }
        const keys = Object.keys(entry);
        if (keys.length > 0) {
          processFilterKey(_mapping, _seen, keys[0], entry[keys[0]]);
        }
      }
    }
  }

  function walkGlobalFilters(_mapping, _seen, _globalFiltersObj) {
    const tables = Object.keys(_globalFiltersObj);
    for (let tableIndex = 0; tableIndex < tables.length; tableIndex += 1) {
      const group = _globalFiltersObj[tables[tableIndex]];
      if (!group || typeof group !== "object") {
        continue;
      }
      const filterKeys = Object.keys(group);
      for (let filterIndex = 0; filterIndex < filterKeys.length; filterIndex += 1) {
        processFilterKey(_mapping, _seen, filterKeys[filterIndex], group[filterKeys[filterIndex]]);
      }
    }
  }

  function buildV2SourceMapping(_payload, _package) {
    const mapping = {};
    const seen = {};
    const gfo = _payload && _payload.globalFiltersObj;
    if (gfo && typeof gfo === "object") {
      const topKeys = Object.keys(gfo);
      const mainName = _package && _package.datasourceName;
      const altName = _package && _package.alternativeDatasourceName;
      for (let keyIndex = 0; keyIndex < topKeys.length; keyIndex += 1) {
        const key = topKeys[keyIndex];
        if (key === mainName) {
          addRev(mapping, seen, "datasource_name_KID", key);
        }
        if (key === altName) {
          addRev(mapping, seen, "alternativeDatasource_name_KID", key);
        }
      }
      walkGlobalFilters(mapping, seen, gfo);
    }
    walkTabs(mapping, seen, _payload.tabs);
    return mapping;
  }

  function buildOrigToKids(_sourceMap) {
    const origToKids = {};
    const keys = Object.keys(_sourceMap || {});
    for (let index = 0; index < keys.length; index += 1) {
      const kid = keys[index];
      const original = _sourceMap[kid];
      if (!origToKids[original]) {
        origToKids[original] = [];
      }
      origToKids[original].push(kid);
    }
    return origToKids;
  }

  function pickKid(_origToKids, _original, _isUse) {
    const list = _origToKids[_original];
    if (!list || list.length === 0) {
      return null;
    }
    if (_isUse) {
      for (let index = 0; index < list.length; index += 1) {
        if (/_filter_use_KID$/.test(list[index])) {
          return list[index];
        }
      }
    }
    for (let index = 0; index < list.length; index += 1) {
      if (/_filter_KID$/.test(list[index])) {
        return list[index];
      }
    }
    return list[0];
  }

  function universalizeString(_value, _origToKids, _isUse) {
    const text = String(_value).replace(/\^+/g, "").trim();
    let kid = pickKid(_origToKids, text, _isUse);
    if (kid) {
      return "***" + kid + "***";
    }
    const base = removeLastBracketDot(text);
    if (base !== text) {
      kid = pickKid(_origToKids, base, true);
      if (kid) {
        return "***" + kid + "***" + lastBracketSuffix(text);
      }
    }
    return null;
  }

  function pathBlocksKeyRename(_path) {
    for (let index = 0; index < _path.length; index += 1) {
      if (_path[index] === "selectedOptions" || _path[index] === "localFilters") {
        return true;
      }
    }
    return false;
  }

  function universalizeNode(_node, _origToKids, _path) {
    if (typeof _node === "string") {
      const parent = _path.length > 1 ? _path[_path.length - 2] : "";
      const isUse = parent === "valuesArray" || _path[_path.length - 1] === "u" || _path[_path.length - 1] === "use";
      const mapped = universalizeString(_node, _origToKids, isUse);
      return mapped === null ? _node : mapped;
    }
    if (Array.isArray(_node)) {
      const next = [];
      for (let index = 0; index < _node.length; index += 1) {
        next.push(universalizeNode(_node[index], _origToKids, _path.concat(index)));
      }
      return next;
    }
    if (_node && typeof _node === "object") {
      const out = {};
      const keys = Object.keys(_node);
      for (let index = 0; index < keys.length; index += 1) {
        const key = keys[index];
        const childPath = _path.concat(key);
        let newKey = key;
        if (!pathBlocksKeyRename(childPath) && typeof key === "string") {
          const mappedKey = universalizeString(key, _origToKids, false);
          if (mappedKey !== null) {
            newKey = mappedKey;
          }
        }
        out[newKey] = universalizeNode(_node[key], _origToKids, childPath);
      }
      return out;
    }
    return _node;
  }

  function universalizeV2KidTree(_node, _sourceMap) {
    return universalizeNode(_node, buildOrigToKids(_sourceMap), []);
  }

  function restoreString(_value, _targetMap) {
    const match = TOKEN_RX.exec(_value);
    if (!match) {
      return _value;
    }
    const kid = match[1].trim();
    const suffix = match[2] || "";
    const base = _targetMap[kid];
    if (!base) {
      return "***" + kid + "***" + suffix;
    }
    return base + suffix;
  }

  function deUniversalizeNode(_node, _targetMap) {
    if (typeof _node === "string") {
      return restoreString(_node, _targetMap);
    }
    if (Array.isArray(_node)) {
      const next = [];
      for (let index = 0; index < _node.length; index += 1) {
        next.push(deUniversalizeNode(_node[index], _targetMap));
      }
      return next;
    }
    if (_node && typeof _node === "object") {
      const out = {};
      const keys = Object.keys(_node);
      for (let index = 0; index < keys.length; index += 1) {
        const key = keys[index];
        out[restoreString(key, _targetMap)] = deUniversalizeNode(_node[key], _targetMap);
      }
      return out;
    }
    return _node;
  }

  function deUniversalizeV2KidTree(_node, _targetMap) {
    return deUniversalizeNode(_node, _targetMap);
  }

  function collectUnresolvedTokens(_node, _found) {
    if (typeof _node === "string") {
      if (UNRESOLVED_RX.test(_node)) {
        _found[_node] = true;
      }
      return;
    }
    if (Array.isArray(_node)) {
      for (let index = 0; index < _node.length; index += 1) {
        collectUnresolvedTokens(_node[index], _found);
      }
      return;
    }
    if (_node && typeof _node === "object") {
      const keys = Object.keys(_node);
      for (let index = 0; index < keys.length; index += 1) {
        collectUnresolvedTokens(_node[keys[index]], _found);
      }
    }
  }

  return Object.freeze({
    buildV2SourceMapping: buildV2SourceMapping,
    universalizeV2KidTree: universalizeV2KidTree,
    deUniversalizeV2KidTree: deUniversalizeV2KidTree,
    collectUnresolvedTokens: collectUnresolvedTokens,
  });
});
