define([], function () {
  "use strict";

  function shouldAddTopBottom(_spec, _parsedTopN, _slotName) {
    return _spec && _spec.targetKind === "topNHelper"
      && _slotName === "grid_cols"
      && _parsedTopN
      && _parsedTopN.kind === "count"
      && typeof _parsedTopN.n === "number"
      && _parsedTopN.n > 0;
  }

  function addTopBottomOption(_slotItem, _parsedTopN) {
    var columnIds = Array.isArray(_slotItem.columnIds) ? _slotItem.columnIds : [];
    var valueItemId = columnIds.length ? columnIds[columnIds.length - 1] : null;
    if (!valueItemId) {
      return;
    }
    _slotItem.options = Object.assign({}, _slotItem.options || {}, {
      topBottom: {
        type: "topcount",
        value: _parsedTopN.n,
        rank: false,
        valueItemId: valueItemId,
      },
    });
  }

  return {
    shouldAddTopBottom: shouldAddTopBottom,
    addTopBottomOption: addTopBottomOption,
  };
});
