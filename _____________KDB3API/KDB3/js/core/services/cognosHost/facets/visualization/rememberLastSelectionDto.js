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

  function rememberLastSelectionDto(_ctx, _widgetId, _categories) {
    var runtime;
    var map;
    var copied;
    if (!_ctx || !_ctx._KDB || typeof _widgetId !== "string" || _widgetId === "") {
      return;
    }
    runtime = _ensureCognosHostRuntime(_ctx._KDB);
    map = runtime && runtime.adapters && runtime.adapters.lastSelectionDtoByWidgetId;
    if (!map) {
      return;
    }
    copied = copyCategories(_categories);
    if (copied.length === 0) {
      delete map[_widgetId];
      return;
    }
    map[_widgetId] = {
      widgetId: _widgetId,
      categories: copied
    };
  }

  return rememberLastSelectionDto;
});
