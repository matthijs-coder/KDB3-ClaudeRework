define([], function () {
  "use strict";

  function __controller(_record) {
    if (!_record) { return null; }
    var selection = _record.selectionOwner === "singleSelect" && _record.currentSelection
      ? _record.currentSelection : null;
    return {
      filterInstanceId: _record.filterInstanceId,
      scopeType: _record.scopeType,
      scopeId: _record.scopeId,
      filterLabel: _record.filterLabel,
      itemName: _record.itemName,
      itemId: _record.itemId == null ? null : _record.itemId,
      semanticInstanceKey: _record.semanticInstanceKey,
      filterType: _record.filterType,
      selectionOwner: _record.selectionOwner,
      identityQuality: _record.identityQuality,
      displayValue: selection ? selection.displayValue : null,
      useValue: selection ? selection.useValue : null,
      displaySource: selection ? selection.displaySource || null : null,
      status: _record.status,
      hostStatus: _record.hostStatus
    };
  }

  return __controller;
});
