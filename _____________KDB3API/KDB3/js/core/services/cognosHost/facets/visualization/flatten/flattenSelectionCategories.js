define([], function () {
  "use strict";

  function copyWhenPresent(_dto, _category, _key) {
    if (_category[_key] !== undefined) {
      _dto[_key] = _category[_key];
    }
  }

  function flattenCategory(_category) {
    var dto;
    if (!_category || typeof _category !== "object") {
      return null;
    }
    dto = {};
    copyWhenPresent(dto, _category, "columnId");
    copyWhenPresent(dto, _category, "label");
    copyWhenPresent(dto, _category, "dataItemId");
    copyWhenPresent(dto, _category, "name");
    copyWhenPresent(dto, _category, "value");
    return dto;
  }

  // Host shapes: getSelections()[0].categories and event.info.value[0].categories.
  // Only columnId, label, dataItemId, name, value cross the boundary.
  function flattenSelectionCategories(_hostPayload) {
    var first;
    var rawCategories;
    var flattened;
    var dto;
    var index;
    if (_hostPayload == null) {
      return [];
    }
    first = Array.isArray(_hostPayload) ? _hostPayload[0] : _hostPayload;
    if (!first || typeof first !== "object") {
      return [];
    }
    rawCategories = first.categories;
    if (!Array.isArray(rawCategories)) {
      return [];
    }
    flattened = [];
    for (index = 0; index < rawCategories.length; index += 1) {
      dto = flattenCategory(rawCategories[index]);
      if (dto) {
        flattened.push(dto);
      }
    }
    return flattened;
  }

  return flattenSelectionCategories;
});
