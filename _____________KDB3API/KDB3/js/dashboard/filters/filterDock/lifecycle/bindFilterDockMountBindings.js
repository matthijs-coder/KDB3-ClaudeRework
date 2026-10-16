define([
  "../observation/bindDockObserver.js",
  "../effects/bindDockClickListener.js",
  "../observation/detectAndDispatchFiltersReady.js"
], function (
  _bindDockObserver,
  _bindDockClickListener,
  _detectAndDispatchFiltersReady
) {
  "use strict";

  function bindMountBindings(_KDB, _runtime, _dispatch, _mountOptions, _readDockRoot) {
    if (!_bindDockClickListener(_KDB, _runtime, _dispatch, _mountOptions)) {
      return false;
    }
    if (!_bindDockObserver(_KDB, _runtime, _dispatch, _mountOptions)) {
      return false;
    }
    if (_KDB.elements && _KDB.elements.selectors && _KDB.elements.selectors.filterDock) {
      _detectAndDispatchFiltersReady(
        _KDB,
        _runtime,
        _dispatch,
        _readDockRoot(_KDB),
        _KDB.elements.selectors.filterDock,
        _mountOptions
      );
    }
    return true;
  }

  return {
    bindMountBindings: bindMountBindings
  };
});
