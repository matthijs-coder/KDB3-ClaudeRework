define([
  "../../errorCodes.js",
  "../../hostAccess.js",
  "../../hostOps.js"
], function (_errorCodes, _hostAccess, _hostOps) {
  "use strict";

  var CODES = _errorCodes.visualization;

  function writeLocalFilters(_ctx, _options, _valid, _method, _label, _info, _call) {
    return _hostOps.writeOp(_ctx, _options, _valid, {
      codes: CODES,
      theme: "visualization",
      method: _method,
      label: "visualization." + _label,
      info: _info,
      call: _call
    });
  }

  function readFilterItemId(_filter) {
    return _filter ? String(_filter.columnId || _filter.itemId || _filter.id || "").trim() : "";
  }

  function clearAllLocalFilters(_ctx, _widgetId, _options) {
    return writeLocalFilters(
      _ctx, _options, _hostAccess.isValidWidgetId(_widgetId), "getLocalFilters", "clearAllLocalFilters", { widgetId: _widgetId },
      function (api) {
        var localFilters = api.getLocalFilters(_widgetId);
        var filterList = localFilters && typeof localFilters.getFilterList === "function" ? localFilters.getFilterList() || [] : [];
        var index;
        var itemId;
        if (!filterList.length) {
          return undefined;
        }
        if (typeof localFilters.removeFilter !== "function") {
          return _hostOps.hostFail(CODES.HOST_CAPABILITY_MISSING);
        }
        for (index = 0; index < filterList.length; index += 1) {
          itemId = readFilterItemId(filterList[index]);
          if (itemId) {
            localFilters.removeFilter({ itemId: itemId });
          }
        }
        return undefined;
      }
    );
  }

  function ensureDisplayType(_filterObj) {
    if (_filterObj.type != null && String(_filterObj.type).trim() !== "") {
      return _filterObj;
    }
    if (!Array.isArray(_filterObj.values) || !_filterObj.values.length) {
      return _filterObj;
    }
    return Object.assign({}, _filterObj, { type: "display" });
  }

  function filterForAdd(_filterObj, _filterOptions) {
    if (_filterOptions.skipDisplayType === true) {
      return Object.assign({}, _filterObj, { type: null });
    }
    return ensureDisplayType(_filterObj);
  }

  // The filter may not exist yet: a failing removeFilter is expected and ignored.
  function removeExisting(_localFilters, _itemId, _removeSuffix1) {
    if (typeof _localFilters.removeFilter !== "function") {
      return;
    }
    try {
      _localFilters.removeFilter({ itemId: _itemId });
      if (_removeSuffix1) {
        _localFilters.removeFilter({ itemId: _itemId + "_1" });
      }
    } catch (_ignoreMissing) {
      return;
    }
  }

  function addOrReplaceLocalFilter(_ctx, _widgetId, _itemId, _filterObj, _filterOptions, _options) {
    var itemId = String(_itemId || "").trim();
    var filterOptions = _filterOptions && typeof _filterOptions === "object" ? _filterOptions : {};
    var valid = _hostAccess.isValidWidgetId(_widgetId) && !!itemId && !!_filterObj && typeof _filterObj === "object";
    return _hostOps.writeOp(_ctx, _options, valid, {
      codes: CODES,
      theme: "visualization",
      method: "getLocalFilters",
      label: "visualization.addOrReplaceLocalFilter",
      info: { widgetId: _widgetId, itemId: itemId },
      okData: true,
      call: function (api) {
        var localFilters = api.getLocalFilters(_widgetId);
        if (!localFilters || typeof localFilters.addFilter !== "function") {
          return _hostOps.hostFail(CODES.HOST_CAPABILITY_MISSING);
        }
        removeExisting(localFilters, itemId, filterOptions.removeSuffix1 !== false);
        return localFilters.addFilter({ itemId: itemId }, filterForAdd(_filterObj, filterOptions));
      }
    });
  }

  function resolveFilterId(_ref) {
    if (_ref == null) {
      return null;
    }
    if (typeof _ref === "object" && _ref.itemId) {
      return { itemId: String(_ref.itemId) };
    }
    return _ref;
  }

  function removeLocalFilter(_ctx, _widgetId, _ref, _options) {
    var filterId = resolveFilterId(_ref);
    return writeLocalFilters(
      _ctx, _options, _hostAccess.isValidWidgetId(_widgetId) && !!filterId, "removeLocalFilter", "removeLocalFilter", { widgetId: _widgetId },
      function (api) {
        return api.removeLocalFilter(_widgetId, filterId);
      }
    );
  }

  function createLocalFilterOps(_ctx) {
    return {
      clearAllLocalFilters: clearAllLocalFilters.bind(null, _ctx),
      addOrReplaceLocalFilter: addOrReplaceLocalFilter.bind(null, _ctx),
      removeLocalFilter: removeLocalFilter.bind(null, _ctx)
    };
  }

  return createLocalFilterOps;
});
