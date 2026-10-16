define([], function () {
  "use strict";

  // Maps one getTabsContainers layout item to a TabDescriptor. Only scalars
  // leave this function: never items[], never host objects, never DOM nodes.
  function flattenTabDescriptor(_layoutItem, _index) {
    var id = readScalarId(_layoutItem);
    var pageId;
    if (!id) {
      return null;
    }
    pageId = readChildId(_layoutItem) || id;
    return {
      id: id,
      tabId: id,
      pageId: pageId,
      index: _index,
      scopeId: id,
      hasContent: hasLayoutContent(_layoutItem)
    };
  }

  function readScalarId(_hostObject) {
    if (!_hostObject || _hostObject.id == null || _hostObject.id === "") {
      return null;
    }
    return String(_hostObject.id);
  }

  function readChildId(_layoutItem) {
    var items = _layoutItem && _layoutItem.items;
    var child = items && items[0];
    return readScalarId(child);
  }

  function hasLayoutContent(_layoutItem) {
    var items = _layoutItem && _layoutItem.items;
    return !!(items && typeof items.length === "number" && items.length > 0);
  }

  return flattenTabDescriptor;
});
