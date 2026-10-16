define([], function () {
  "use strict";

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

  function removeLastBracketDot(_value) {
    return String(_value).replace(/(\.\[[^\]]+\])(?![\s\S]*\.\[[^\]]+\])/, "");
  }

  function lastBracketSuffix(_value) {
    const match = String(_value).match(/(\.\[[^\]]+\])$/);
    return match ? match[1] : "";
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
    try {
      return universalizeNode(_node, buildOrigToKids(_sourceMap), []);
    } catch (error) {
      throw error;
    }
  }

  return universalizeV2KidTree;
});
