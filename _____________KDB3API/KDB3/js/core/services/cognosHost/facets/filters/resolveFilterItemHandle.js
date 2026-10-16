define([
  "./buildFilterItemKeys.js",
  "./refreshFilterIndex.js",
  "./config/filterErrorCodes.js",
  "../../runtime/ensureCognosHostRuntime.js"
], function (
  _buildFilterItemKeys,
  _refreshFilterIndex,
  _filterErrorCodes,
  _ensureCognosHostRuntime
) {
  "use strict";

  // Resolve strategy of design doc section 2.3 point 2: cache, then exactly one
  // fresh inventory on a miss, then give up. Never a retry loop.

  function readEntry(_ctx, _scope, _ref) {
    var runtime = _ensureCognosHostRuntime(_ctx._KDB);
    var map = runtime.adapters.filterItemsByKey;
    var idKey = _buildFilterItemKeys.buildIdKey(_scope, _ref.itemId);
    var nameKey = _buildFilterItemKeys.buildNameKey(_scope, _ref.itemName);
    var entry = null;
    if (idKey && map[idKey]) {
      entry = map[idKey];
    } else if (nameKey && map[nameKey]) {
      entry = map[nameKey];
    }
    if (!entry) {
      return null;
    }
    // An entry stamped by an older generation belongs to a disposed service and
    // is refused rather than handed out (design doc section 2.3 point 5).
    if (entry.generation !== _ctx.generation) {
      return null;
    }
    return entry;
  }

  function __controller(_ctx, _ref) {
    var scope;
    var entry;
    var refresh;
    if (!_ref || (!_ref.itemId && !_ref.itemName)) {
      return { ok: false, errorCode: _filterErrorCodes.INVALID_REF, diagnostics: [] };
    }
    scope = _buildFilterItemKeys.buildScopeContext(_ref.scopeId);
    entry = readEntry(_ctx, scope, _ref);
    if (entry) {
      return { ok: true, entry: entry, diagnostics: [] };
    }
    refresh = _refreshFilterIndex(_ctx, scope.scopeType);
    if (!refresh.ok) {
      return { ok: false, errorCode: refresh.errorCode, diagnostics: refresh.diagnostics };
    }
    entry = readEntry(_ctx, scope, _ref);
    if (entry) {
      return { ok: true, entry: entry, diagnostics: refresh.diagnostics };
    }
    return { ok: false, errorCode: _filterErrorCodes.ITEM_NOT_FOUND, diagnostics: refresh.diagnostics };
  }

  return __controller;
});
