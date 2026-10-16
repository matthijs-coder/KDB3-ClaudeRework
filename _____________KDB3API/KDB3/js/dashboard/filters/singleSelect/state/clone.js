define([], function () {
  "use strict";

  function cloneSelection(_selection) {
    return _selection ? Object.assign({}, _selection) : null;
  }

  function cloneInstance(_instance) {
    if (!_instance) { return undefined; }
    var cloned = Object.assign({}, _instance, {
      timestamps: _instance.timestamps ? Object.assign({}, _instance.timestamps) : null
    });
    ["currentSelection", "backupSelection", "pendingSelection"].forEach(function (_key) {
      if (Object.prototype.hasOwnProperty.call(_instance, _key)) {
        cloned[_key] = cloneSelection(_instance[_key]);
      } else {
        delete cloned[_key];
      }
    });
    return cloned;
  }

  return {
    cloneSelection: cloneSelection,
    cloneInstance: cloneInstance
  };
});
