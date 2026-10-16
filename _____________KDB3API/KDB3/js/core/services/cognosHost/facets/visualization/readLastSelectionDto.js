define(["../../runtime/ensureCognosHostRuntime.js"], function (_ensureCognosHostRuntime) {
  "use strict";

  var CATEGORY_KEYS = ["columnId", "label", "dataItemId", "name", "value"];

  function copyWhenPresent(_dto, _category, _key) {
    if (_category[_key] !== undefined) {
      _dto[_key] = _category[_key];
    }
  }

  function copyCategory(_category) {
    var dto;
    var index;
    if (!_category || typeof _category !== "object") {
      return null;
    }
    dto = {};
    for (index = 0; index < CATEGORY_KEYS.length; index += 1) {
      copyWhenPresent(dto, _category, CATEGORY_KEYS[index]);
    }
    return dto;
  }

  function copyCategories(_categories) {
    var copied;
    var index;
    var dto;
    if (!Array.isArray(_categories)) {
      return [];
    }
    copied = [];
    for (index = 0; index < _categories.length; index += 1) {
      dto = copyCategory(_categories[index]);
      if (dto) {
        copied.push(dto);
      }
    }
    return copied;
  }

  function readLastSelectionDto(_ctx, _widgetId) {
    var runtime;
    var map;
    var stored;
    var copied;
    if (!_ctx || !_ctx._KDB || typeof _widgetId !== "string" || _widgetId === "") {
      return null;
    }
    runtime = _ensureCognosHostRuntime(_ctx._KDB);
    map = runtime && runtime.adapters && runtime.adapters.lastSelectionDtoByWidgetId;
    stored = map && map[_widgetId];
    if (!stored || !Array.isArray(stored.categories)) {
      return null;
    }
    copied = copyCategories(stored.categories);
    if (copied.length === 0) {
      return null;
    }
    return {
      widgetId: typeof stored.widgetId === "string" && stored.widgetId !== "" ? stored.widgetId : _widgetId,
      categories: copied
    };
  }

  return readLastSelectionDto;
});
