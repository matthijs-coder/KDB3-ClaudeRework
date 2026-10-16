define([
  "../../outcome.js",
  "../../errorCodes.js",
  "../../hostAccess.js",
  "../../runtime.js",
  "../../../../utils/normalizeCognosScopeId.js"
], function (_outcome, _errorCodes, _hostAccess, _runtime, _normalizeCognosScopeId) {
  "use strict";

  // Filter inventory and handle index of the filters facet. Live host items stay inside this
  // layer: runtime.adapters.filterItemsByKey maps "<scopeType>|<scopeId>|id|<itemId>" and
  // "...|name|<itemName>" keys to { handle, descriptor, generation }. refreshFilterIndex is its
  // sole writer; one inventory pass reads descriptor and values together, so a reconcile never
  // does list-then-read and can not tear.
  var CODES = _errorCodes.filters;
  // Unit separator: never part of a Cognos identifier, so a key can not be forged by an
  // itemId or itemName that happens to contain the delimiter.
  var SEP = "\u001F";
  var GLOBAL_SCOPE = "global";

  // scopeType mirrors the derivation of isUnownedNativeMultiSelectItem (normalised scope === "global").
  function buildScopeContext(_scopeId) {
    var scopeId = _normalizeCognosScopeId(_scopeId);
    if (scopeId === GLOBAL_SCOPE) {
      return { scopeType: GLOBAL_SCOPE, scopeId: GLOBAL_SCOPE };
    }
    return { scopeType: "pageContext", scopeId: scopeId };
  }

  // An empty itemId yields no id key, so distinct items can not collide on ("", ...); such an
  // item stays reachable through its name key only.
  function buildKey(_scope, _kind, _value) {
    var value = _value == null ? "" : String(_value).trim();
    if (!value) {
      return null;
    }
    return _scope.scopeType + SEP + _scope.scopeId + SEP + _kind + SEP + value;
  }

  function buildIdKey(_scope, _itemId) {
    return buildKey(_scope, "id", _itemId);
  }

  function buildNameKey(_scope, _itemName) {
    return buildKey(_scope, "name", _itemName);
  }

  // ---- host inventory ----

  function readGlobalItems(_filtersApi) {
    if (typeof _filtersApi.getAllGlobalFilterItems !== "function") {
      return { ok: false, errorCode: CODES.HOST_CAPABILITY_MISSING };
    }
    return { ok: true, items: _filtersApi.getAllGlobalFilterItems() || [] };
  }

  function isPageContextScope(_filterItem) {
    return _filterItem.getScope() !== GLOBAL_SCOPE;
  }

  // getAllPageContextFilterItems is the pre-filtered list (scope !== "global"); getPageContextItemsArr
  // is the raw list dienststelle filters itself. Filtering the fallback keeps both paths identical,
  // so the page partition can never absorb a global item.
  function readPageContextItems(_filtersApi) {
    if (typeof _filtersApi.getAllPageContextFilterItems === "function") {
      return { ok: true, items: _filtersApi.getAllPageContextFilterItems() || [] };
    }
    if (typeof _filtersApi.getPageContextItemsArr === "function") {
      return { ok: true, items: (_filtersApi.getPageContextItemsArr(true) || []).filter(isPageContextScope) };
    }
    return { ok: false, errorCode: CODES.HOST_CAPABILITY_MISSING };
  }

  // One inventory pass over the host list that belongs to the requested scope type.
  function readHostFilterItems(_KDB, _scopeType) {
    var filtersApi = _hostAccess.resolveHostApi(_KDB, "filters");
    var read;
    if (!filtersApi) {
      return { ok: false, errorCode: CODES.HOST_UNAVAILABLE };
    }
    try {
      read = _scopeType === GLOBAL_SCOPE ? readGlobalItems(filtersApi) : readPageContextItems(filtersApi);
      read.filtersApi = filtersApi;
      return read;
    } catch (error) {
      console.error("[cognosHost.filters.readHostFilterItems] inventory failed", { scopeType: _scopeType }, error);
      return { ok: false, errorCode: CODES.INVENTORY_FAILED };
    }
  }

  // The host api when it offers the named method, else null (callers answer HOST_CAPABILITY_MISSING).
  function resolveFilterMethodApi(_KDB, _method) {
    var filtersApi = _hostAccess.resolveHostApi(_KDB, "filters");
    return filtersApi && typeof filtersApi[_method] === "function" ? filtersApi : null;
  }

  // ---- descriptors ----

  function readText(_filtersApi, _apiMethod, _item, _itemMethod) {
    if (typeof _filtersApi[_apiMethod] === "function") {
      return String(_filtersApi[_apiMethod](_item) || "");
    }
    if (_itemMethod && _item && typeof _item[_itemMethod] === "function") {
      return String(_item[_itemMethod]() || "");
    }
    return "";
  }

  function readRawScope(_filtersApi, _item) {
    if (_item && typeof _item.getScope === "function") {
      return String(_item.getScope() || "");
    }
    return readText(_filtersApi, "getFilterScope", _item, null);
  }

  function readValues(_filtersApi, _item) {
    return typeof _filtersApi.getFilterValues === "function" ? _filtersApi.getFilterValues(_item) || [] : [];
  }

  // Live host item -> flat FilterItemDescriptor. scopeType comes from the inventory pass, not
  // from the item: a page-context item whose scope normalises to "global" stays in the pageContext
  // partition and is unreachable through a global lookup.
  function buildFilterItemDescriptor(_filtersApi, _item, _includeValues, _scopeType) {
    var rawScopeId = readRawScope(_filtersApi, _item);
    var descriptor = {
      itemId: readText(_filtersApi, "getFilterItemId", _item, "getItemId"),
      itemName: readText(_filtersApi, "getFilterItemLabel", _item, "getItemName"),
      sourceId: readText(_filtersApi, "getFilterSourceId", _item, null),
      scopeType: _scopeType,
      scopeId: buildScopeContext(rawScopeId).scopeId,
      rawScopeId: rawScopeId
    };
    if (_includeValues === true) {
      descriptor.values = readValues(_filtersApi, _item);
    }
    return descriptor;
  }

  // ---- index ----

  function copyOtherPartitions(_index, _scopeType) {
    var next = {};
    var prefix = _scopeType + SEP;
    Object.keys(_index).forEach(function copyKey(_key) {
      if (_key.indexOf(prefix) !== 0) {
        next[_key] = _index[_key];
      }
    });
    return next;
  }

  // First item wins on BOTH keys, mirroring the loop-and-return semantics of the lookups this
  // index replaces. Deliberately silent: a duplicate diagnostic would make the whole inventory
  // degraded, which is fail-closed at the owner boundary and would wipe an entire scope.
  function indexEntry(_next, _scopeType, _entry) {
    var scope = { scopeType: _scopeType, scopeId: _entry.descriptor.scopeId };
    var idKey = buildIdKey(scope, _entry.descriptor.itemId);
    var nameKey = buildNameKey(scope, _entry.descriptor.itemName);
    if (idKey && !_next[idKey]) {
      _next[idKey] = _entry;
    }
    if (nameKey && !_next[nameKey]) {
      _next[nameKey] = _entry;
    }
  }

  function describeItemFailure(_index, _error) {
    return _outcome.buildDiagnostic(
      CODES.READ_FAILED,
      "host item " + _index + " could not be read: " + String(_error && _error.message ? _error.message : _error)
    );
  }

  function refreshFilterIndex(_ctx, _scopeType) {
    var read = readHostFilterItems(_ctx._KDB, _scopeType);
    var runtime;
    var next;
    var descriptors = [];
    var diagnostics = [];
    var descriptor;
    var index;
    if (!read.ok) {
      return { ok: false, errorCode: read.errorCode, descriptors: descriptors, diagnostics: diagnostics };
    }
    runtime = _runtime.ensureRuntime(_ctx._KDB);
    next = copyOtherPartitions(runtime.adapters.filterItemsByKey, _scopeType);
    for (index = 0; index < read.items.length; index += 1) {
      try {
        descriptor = buildFilterItemDescriptor(read.filtersApi, read.items[index], true, _scopeType);
      } catch (error) {
        // Never drop a broken item silently: the caller sees a degraded outcome with this diagnostic.
        diagnostics.push(describeItemFailure(index, error));
        continue;
      }
      indexEntry(next, _scopeType, { handle: read.items[index], descriptor: descriptor, generation: _ctx.generation });
      descriptors.push(descriptor);
    }
    // Atomic replace of this partition.
    runtime.adapters.filterItemsByKey = next;
    return { ok: true, descriptors: descriptors, diagnostics: diagnostics };
  }

  // The host may replace an item during or after a write, so a successful mutation must never
  // leave its handle in the index. The next read re-inventories that partition.
  function invalidateFilterIndexEntry(_ctx, _descriptor) {
    var map = _runtime.ensureRuntime(_ctx._KDB).adapters.filterItemsByKey;
    var scope = { scopeType: _descriptor.scopeType, scopeId: _descriptor.scopeId };
    var idKey = buildIdKey(scope, _descriptor.itemId);
    var nameKey = buildNameKey(scope, _descriptor.itemName);
    if (idKey) {
      delete map[idKey];
    }
    if (nameKey) {
      delete map[nameKey];
    }
  }

  // An entry stamped by an older generation belongs to a disposed service and is refused.
  function readIndexedEntry(_ctx, _scope, _ref) {
    var map = _runtime.ensureRuntime(_ctx._KDB).adapters.filterItemsByKey;
    var idKey = buildIdKey(_scope, _ref.itemId);
    var nameKey = buildNameKey(_scope, _ref.itemName);
    var entry = null;
    if (idKey && map[idKey]) {
      entry = map[idKey];
    } else if (nameKey && map[nameKey]) {
      entry = map[nameKey];
    }
    return entry && entry.generation === _ctx.generation ? entry : null;
  }

  // Cache, then exactly one fresh inventory on a miss, then give up. Never a retry loop.
  function resolveFilterItemHandle(_ctx, _ref) {
    var scope;
    var entry;
    var refresh;
    if (!_ref || (!_ref.itemId && !_ref.itemName)) {
      return { ok: false, errorCode: CODES.INVALID_REF, diagnostics: [] };
    }
    scope = buildScopeContext(_ref.scopeId);
    entry = readIndexedEntry(_ctx, scope, _ref);
    if (entry) {
      return { ok: true, entry: entry, diagnostics: [] };
    }
    refresh = refreshFilterIndex(_ctx, scope.scopeType);
    if (!refresh.ok) {
      return { ok: false, errorCode: refresh.errorCode, diagnostics: refresh.diagnostics };
    }
    entry = readIndexedEntry(_ctx, scope, _ref);
    if (entry) {
      return { ok: true, entry: entry, diagnostics: refresh.diagnostics };
    }
    return { ok: false, errorCode: CODES.ITEM_NOT_FOUND, diagnostics: refresh.diagnostics };
  }

  return {
    buildScopeContext: buildScopeContext,
    buildIdKey: buildIdKey,
    buildNameKey: buildNameKey,
    readHostFilterItems: readHostFilterItems,
    resolveFilterMethodApi: resolveFilterMethodApi,
    refreshFilterIndex: refreshFilterIndex,
    invalidateFilterIndexEntry: invalidateFilterIndexEntry,
    resolveFilterItemHandle: resolveFilterItemHandle
  };
});
