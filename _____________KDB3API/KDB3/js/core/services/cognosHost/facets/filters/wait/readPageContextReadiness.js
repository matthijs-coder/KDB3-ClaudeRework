define([
  "../readHostFilterItems.js",
  "../../../../../utils/normalizeCognosScopeId.js"
], function (_readHostFilterItems, _normalizeCognosScopeId) {
  "use strict";

  function normalizeScopeIds(_scopeIds) {
    var wanted = [];
    var normalized;
    var index;
    if (!Array.isArray(_scopeIds)) {
      return wanted;
    }
    for (index = 0; index < _scopeIds.length; index += 1) {
      normalized = _normalizeCognosScopeId(_scopeIds[index]);
      if (normalized) {
        wanted.push(normalized);
      }
    }
    return wanted;
  }

  // Per-item guard, like the poll this replaces: an item whose scope can not be
  // read simply does not match, it does not abort the whole probe.
  function readItemScope(_filtersApi, _item) {
    try {
      if (_item && typeof _item.getScope === "function") {
        return _item.getScope();
      }
      if (_filtersApi && typeof _filtersApi.getFilterScope === "function") {
        return _filtersApi.getFilterScope(_item);
      }
      return "";
    } catch (error) {
      return "";
    }
  }

  // Readiness asks one question: is this scope registered on the host? It
  // deliberately does NOT build descriptors. Right after a tab activate an item
  // can already carry its scope while reading its values still throws, and a
  // full materialisation would drop that item, report "not ready" and abort the
  // restore — which the poll this replaces never did.
  function readReadiness(_ctx, _wanted) {
    var read = _readHostFilterItems(_ctx._KDB, "pageContext");
    var present = {};
    var index;
    if (!read.ok) {
      return { ok: false, ready: false, errorCode: read.errorCode, diagnostics: [] };
    }
    for (index = 0; index < read.items.length; index += 1) {
      present[_normalizeCognosScopeId(readItemScope(read.filtersApi, read.items[index]))] = true;
    }
    for (index = 0; index < _wanted.length; index += 1) {
      if (present[_wanted[index]] !== true) {
        return { ok: true, ready: false, diagnostics: [] };
      }
    }
    return { ok: true, ready: true, diagnostics: [] };
  }

  return {
    normalizeScopeIds: normalizeScopeIds,
    readReadiness: readReadiness
  };
});
