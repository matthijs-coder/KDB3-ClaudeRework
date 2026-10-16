define([], function () {
  "use strict";

  const TOKEN_RX = /^\*{3}(.+?)\*{3}([\s\S]*)$/;
  const UNRESOLVED_RX = /\*{3}[^*]+\*{3}/;

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

  function deUniversalizeNode(_node, _targetMap, _path) {
    if (typeof _node === "string") {
      return restoreString(_node, _targetMap);
    }
    if (Array.isArray(_node)) {
      const next = [];
      for (let index = 0; index < _node.length; index += 1) {
        next.push(deUniversalizeNode(_node[index], _targetMap, _path.concat(index)));
      }
      return next;
    }
    if (_node && typeof _node === "object") {
      const out = {};
      const keys = Object.keys(_node);
      for (let index = 0; index < keys.length; index += 1) {
        const key = keys[index];
        const newKey = typeof key === "string" ? restoreString(key, _targetMap) : key;
        out[newKey] = deUniversalizeNode(_node[key], _targetMap, _path.concat(key));
      }
      return out;
    }
    return _node;
  }

  function collectUnresolvedTokens(_node, _found) {
    try {
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
    } catch (error) {
      console.error("[writebackMap.collectUnresolvedTokens]", error);
      throw error;
    }
  }

  function deUniversalizeV2KidTree(_node, _targetMap) {
    try {
      return deUniversalizeNode(_node, _targetMap, []);
    } catch (error) {
      throw error;
    }
  }

  return Object.freeze({
    deUniversalizeV2KidTree: deUniversalizeV2KidTree,
    collectUnresolvedTokens: collectUnresolvedTokens,
  });
});
