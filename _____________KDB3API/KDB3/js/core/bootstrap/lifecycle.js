define(["./registerReplayHandlers.js"], function (_registerReplayHandlers) {
  "use strict";

  function registerAll(_KDB, _manifest) {
    _manifest.entries.forEach(function (entry) {
      entry.register(_KDB);
    });
  }

  function mountPhaseOf(_entry) {
    return _entry.mount && _entry.mount.phase ? _entry.mount.phase : "boot";
  }

  // Mounts the entries of one phase in manifest order; a throwing mount stops the sequence.
  function mountPhase(_KDB, _manifest, _phase) {
    _manifest.entries.forEach(function (entry) {
      if (!entry.mount || mountPhaseOf(entry) !== _phase) {
        return;
      }
      _KDB.api[entry.api].mount(Object.assign({}, entry.mount.options));
    });
  }

  function mountBootModules(_KDB, _manifest, _renderOptions) {
    const domRefs = _KDB.runtime.core.domRefs;
    if (_renderOptions && _renderOptions.parent) {
      domRefs.renderParentEl = _renderOptions.parent;
    }
    // Replay handlers are registered even when a mount throws, for the owners that stamped by then: undo/redo on a
    // half-booted page then still works (the removed early bind used to cover that case).
    try {
      mountPhase(_KDB, _manifest, "boot");
    } finally {
      _registerReplayHandlers(_KDB, _manifest);
    }
  }

  function destroyFeatureApi(_api) {
    if (_api && typeof _api.destroy === "function") {
      _api.destroy();
    }
  }

  function indexEntries(_manifest) {
    const byName = {};
    _manifest.entries.forEach(function (entry) {
      byName[entry.name] = entry;
    });
    return byName;
  }

  function destroyEntry(_KDB, _entry) {
    if (!_entry) {
      return;
    }
    if (typeof _entry.destroy === "function") {
      _entry.destroy(_KDB);
      return;
    }
    destroyFeatureApi((_KDB.api || {})[_entry.api]);
  }

  // Every step runs even when an earlier one throws; the first error is rethrown at the end.
  function destroyFeatures(_KDB, _manifest) {
    const byName = indexEntries(_manifest);
    let firstError = null;
    _manifest.destroyOrder.forEach(function (name) {
      try {
        destroyEntry(_KDB, byName[name]);
      } catch (error) {
        firstError = firstError || error;
        console.error("[core.destroy] feature cleanup failed", error);
      }
    });
    if (firstError) throw firstError;
  }

  function destroyServices(_KDB, _manifest) {
    const services = _KDB.services || {};
    let firstError = null;
    _manifest.serviceDestroyOrder.forEach(function (name) {
      try {
        destroyFeatureApi(services[name]);
      } catch (error) {
        firstError = firstError || error;
        console.error("[core.destroy] service cleanup failed", error);
      }
    });
    if (firstError) throw firstError;
  }

  return {
    registerAll: registerAll,
    mountPhase: mountPhase,
    mountBootModules: mountBootModules,
    destroyFeatures: destroyFeatures,
    destroyServices: destroyServices
  };
});
