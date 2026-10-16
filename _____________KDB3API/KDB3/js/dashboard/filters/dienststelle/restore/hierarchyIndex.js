define([
  "../../../../core/utils/orgTree/hierarchyCell.js"
], function (_hierarchyCell) {
  "use strict";

  function parseCell(cell) {
    var display;
    var useValue;
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
  }

  function recordMember(members, parsed) {
    var display = parsed.displayValue ? parsed.displayValue : null;
    var existing = members[parsed.useValue];
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
  }

  function recordAlias(_map, _key, _useValue) {
    var existing;
    if (!_key) { return; }
    existing = _map[_key];
    if (!existing) {
      _map[_key] = { useValue: _useValue, unique: true };
      return;
    }
    if (existing.unique === true && existing.useValue !== _useValue) {
      existing.unique = false;
    }
  }

  function buildHierarchyIndex(_rows) {
    var members = {};
    var byLeaf = {};
    var byDisplay = {};
    var rows = Array.isArray(_rows) ? _rows : [];
    rows.forEach(function (row) {
      if (!row || typeof row !== "object") { return; }
      Object.keys(row).forEach(function (key) {
        var parsed = parseCell(row[key]);
        if (parsed) {
          recordMember(members, parsed);
          recordAlias(byLeaf, _hierarchyCell.extractUniqueNameLeaf(parsed.useValue), parsed.useValue);
          recordAlias(byDisplay, parsed.displayValue, parsed.useValue);
        }
      });
    });
    return { members: members, byLeaf: byLeaf, byDisplay: byDisplay };
  }

  function resolveFullUseValue(_index, _useValue) {
    var saved;
    var hit;
    if (!_index || _useValue == null) { return null; }
    saved = String(_useValue);
    if (_index.members && _index.members[saved]) { return saved; }
    hit = _index.byLeaf && _index.byLeaf[saved];
    if (hit && hit.unique === true) { return hit.useValue; }
    hit = _index.byDisplay && _index.byDisplay[saved];
    return hit && hit.unique === true ? hit.useValue : null;
  }

  function hasUseValue(_index, _useValue) {
    return resolveFullUseValue(_index, _useValue) != null;
  }

  function resolveRestorePair(_index, _useValue) {
    var useValue = resolveFullUseValue(_index, _useValue);
    var member;
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
  }

  return {
    buildHierarchyIndex: buildHierarchyIndex,
    hasUseValue: hasUseValue,
    resolveRestorePair: resolveRestorePair
  };
});
