define([
  "./buildFilterItemKeys.js",
  "../../runtime/ensureCognosHostRuntime.js"
], function (_buildFilterItemKeys, _ensureCognosHostRuntime) {
  "use strict";

  // Design doc section 2.3 point 3: the host may replace an item during or after
  // a write, so a successful mutation must never leave its handle in the index.
  // The next read re-inventories that partition.
  function __controller(_ctx, _descriptor) {
    var runtime = _ensureCognosHostRuntime(_ctx._KDB);
    var map = runtime.adapters.filterItemsByKey;
    var scope = { scopeType: _descriptor.scopeType, scopeId: _descriptor.scopeId };
    var idKey = _buildFilterItemKeys.buildIdKey(scope, _descriptor.itemId);
    var nameKey = _buildFilterItemKeys.buildNameKey(scope, _descriptor.itemName);
    if (idKey) {
      delete map[idKey];
    }
    if (nameKey) {
      delete map[nameKey];
    }
  }

  return __controller;
});
