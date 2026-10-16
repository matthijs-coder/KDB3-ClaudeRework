define([], function () {
  "use strict";

  var STABILITY_MS = 500;
  var MAX_WAIT_MS = 30000;

  function clearFiltersReadyWatch(_runtime) {
    try {
      var watch = _runtime && _runtime.filtersReadyWatch;
      if (!watch) {
        return;
      }
      if (watch.stabilityId != null) {
        clearTimeout(watch.stabilityId);
      }
      if (watch.maxWaitId != null) {
        clearTimeout(watch.maxWaitId);
      }
      delete _runtime.filtersReadyWatch;
    } catch (error) {
      console.error("[filterDock.clearFiltersReadyWatch] failed", error);
    }
  }

  function isFiltersReady(_KDB, _runtime) {
    return _runtime.filtersReadyDispatched === true ||
      !!(_KDB.state && _KDB.state.filters && _KDB.state.filters.filterDock &&
        _KDB.state.filters.filterDock.filtersReady);
  }

  function readFiltersReadyWatch(_runtime) {
    try {
      if (!_runtime.filtersReadyWatch) {
        _runtime.filtersReadyWatch = {
          lastCount: 0,
          stabilityId: null,
          maxWaitId: null
        };
      }
      return _runtime.filtersReadyWatch;
    } catch (error) {
      console.error("[filterDock.readFiltersReadyWatch] failed", error);
      throw error;
    }
  }

  function onFiltersReadyTimer(_KDB, _runtime, _options, _source, _onReady) {
    try {
      if (_options && _options.isDisposed && _options.isDisposed()) {
        clearFiltersReadyWatch(_runtime);
        return;
      }
      if (!isFiltersReady(_KDB, _runtime)) {
        _onReady(_source);
      }
    } catch (error) {
      console.error("[filterDock.onFiltersReadyTimer] failed", {
        source: _source
      }, error);
      clearFiltersReadyWatch(_runtime);
    }
  }

  function __controller(_KDB, _runtime, _options, _wrapperCount, _onReady) {
    var watch;
    try {
      if (isFiltersReady(_KDB, _runtime)) {
        return false;
      }
      watch = readFiltersReadyWatch(_runtime);
      if (_wrapperCount <= watch.lastCount) {
        return true;
      }
      watch.lastCount = _wrapperCount;
      if (watch.maxWaitId == null) {
        watch.maxWaitId = setTimeout(
          onFiltersReadyTimer.bind(
            null,
            _KDB,
            _runtime,
            _options,
            "filterDockFiltersReadyTimeout",
            _onReady
          ),
          MAX_WAIT_MS
        );
      }
      if (watch.stabilityId != null) {
        clearTimeout(watch.stabilityId);
      }
      watch.stabilityId = setTimeout(
        onFiltersReadyTimer.bind(
          null,
          _KDB,
          _runtime,
          _options,
          "filterDockFiltersReady",
          _onReady
        ),
        STABILITY_MS
      );
      return true;
    } catch (error) {
      console.error("[filterDock.watchFiltersReady] failed", error);
      clearFiltersReadyWatch(_runtime);
      return false;
    }
  }

  __controller.clearFiltersReadyWatch = clearFiltersReadyWatch;

  return __controller;
});
