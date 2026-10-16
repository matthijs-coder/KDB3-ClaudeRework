define(["./extractUniqueNameLeaf.js"], function (_extractUniqueNameLeaf) {
  "use strict";

  function parseCell(cell) {
    var display;
    var useValue;
    try {
      if (cell == null) { return null; }
      if (typeof cell === "string" || typeof cell === "number") {
        useValue = String(cell).trim();
        return useValue ? { displayValue: "", useValue: useValue } : null;
      }
      if (typeof cell !== "object" || Array.isArray(cell)) { return null; }
      display = cell.display != null ? String(cell.display).trim()
        : cell.d != null ? String(cell.d).trim() : "";
      useValue = cell.use != null ? String(cell.use).trim()
        : cell.u != null ? String(cell.u).trim()
          : cell.useValue != null ? String(cell.useValue).trim() : "";
      return useValue ? { displayValue: display, useValue: useValue } : null;
    } catch (error) {
      console.error("[dienststelle.parseHierarchyCell] failed", error);
      throw error;
    }
  }

  function recordMember(members, parsed) {
    var existing;
    var display;
    try {
      display = parsed.displayValue ? parsed.displayValue : null;
      existing = members[parsed.useValue];
      if (!existing) {
        members[parsed.useValue] = { displayValue: display, unique: true };
        return;
      }
      if (existing.unique !== true || existing.displayValue === display || !display) {
        return;
      }
      if (!existing.displayValue) {
        existing.displayValue = display;
        return;
      }
      existing.unique = false;
      existing.displayValue = null;
    } catch (error) {
      console.error("[dienststelle.recordHierarchyMember] failed", error);
      throw error;
    }
  }

  function recordAlias(_map, _key, _useValue) {
    var existing;
    try {
      if (!_key) { return; }
      existing = _map[_key];
      if (!existing) {
        _map[_key] = { useValue: _useValue, unique: true };
        return;
      }
      if (existing.unique === true && existing.useValue !== _useValue) {
        existing.unique = false;
      }
    } catch (error) {
      console.error("[dienststelle.recordHierarchyAlias] failed", error);
      throw error;
    }
  }

  function buildHierarchyIndex(_rows) {
    var members = {};
    var byLeaf = {};
    var byDisplay = {};
    var rows = Array.isArray(_rows) ? _rows : [];
    var rowIdx, row, keys, keyIdx, parsed;
    try {
      for (rowIdx = 0; rowIdx < rows.length; rowIdx += 1) {
        row = rows[rowIdx];
        if (!row || typeof row !== "object") { continue; }
        keys = Object.keys(row);
        for (keyIdx = 0; keyIdx < keys.length; keyIdx += 1) {
          parsed = parseCell(row[keys[keyIdx]]);
          if (parsed) {
            recordMember(members, parsed);
            recordAlias(byLeaf, _extractUniqueNameLeaf(parsed.useValue), parsed.useValue);
            recordAlias(byDisplay, parsed.displayValue, parsed.useValue);
          }
        }
      }
      return { members: members, byLeaf: byLeaf, byDisplay: byDisplay };
    } catch (error) {
      console.error("[dienststelle.buildHierarchyIndex] failed", error);
      throw error;
    }
  }

  function resolveFullUseValue(_index, _useValue) {
    var saved;
    var hit;
    try {
      if (!_index || _useValue == null) { return null; }
      saved = String(_useValue);
      if (_index.members && _index.members[saved]) { return saved; }
      hit = _index.byLeaf && _index.byLeaf[saved];
      if (hit && hit.unique === true) { return hit.useValue; }
      hit = _index.byDisplay && _index.byDisplay[saved];
      return hit && hit.unique === true ? hit.useValue : null;
    } catch (error) {
      console.error("[dienststelle.resolveFullUseValue] failed", { useValue: _useValue }, error);
      throw error;
    }
  }

  function hasUseValue(_index, _useValue) {
    return resolveFullUseValue(_index, _useValue) != null;
  }

  function resolveRestorePair(_index, _useValue) {
    var useValue;
    var member;
    try {
      useValue = resolveFullUseValue(_index, _useValue);
      if (!useValue) { return null; }
      member = _index.members[useValue];
      if (member.unique === true && member.displayValue) {
        return {
          displayValue: member.displayValue,
          useValue: useValue,
          source: "cognos",
          degraded: false
        };
      }
      return {
        displayValue: useValue,
        useValue: useValue,
        source: "cognos",
        degraded: true
      };
    } catch (error) {
      console.error("[dienststelle.resolveRestorePair] failed", { useValue: _useValue }, error);
      throw error;
    }
  }

  return {
    buildHierarchyIndex: buildHierarchyIndex,
    hasUseValue: hasUseValue,
    resolveRestorePair: resolveRestorePair
  };
});
