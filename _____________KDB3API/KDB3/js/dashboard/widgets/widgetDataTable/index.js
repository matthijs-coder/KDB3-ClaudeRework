define([
  "../../../core/utils/kit/data.js",
  "../../../core/utils/kit/errors.js"
], function (_data, _errors) {
  "use strict";
  // Lifecycle terms for widgetDataTable: idle, ready, error, disposed. Every dispatch is a scaffold no-op.

  function createInitialState() {
    return { lifecycle: "idle", byId: {}, errorCode: null, errorMessage: null };
  }

  function writeLifecycle(_KDB, _lifecycle, _error) {
    var state = _KDB.state.widgets.dataTable;
    state.lifecycle = _lifecycle;
    state.errorCode = _error ? "WIDGET_DATATABLE_LIFECYCLE_FAILED" : null;
    state.errorMessage = _error ? String(_error.message || _error) : null;
  }

  function createWidgetDataTableController(_KDB) {
    var guard = _errors.createDisposedGuard("widgetDataTable");

    function mount() {
      if (guard.blocked("mount")) {
        return false;
      }
      try {
        writeLifecycle(_KDB, "ready");
        return true;
      } catch (err) {
        console.error("[widgetDataTable.mount] failed", err);
        return false;
      }
    }

    function destroy() {
      if (guard.isDisposed()) {
        return;
      }
      guard.dispose();
      try {
        writeLifecycle(_KDB, "disposed");
      } catch (err) {
        console.error("[widgetDataTable.destroy] failed", err);
      }
    }

    function dispatch(_action) {
      if (guard.blocked("dispatch")) {
        return { ok: false, outcome: "aborted", reason: "disposed", skipped: true, status: "aborted" };
      }
      return { ok: true, skipped: true, reasonCode: "SCAFFOLD_NOOP", actionType: _action && _action.type ? _action.type : null };
    }

    function getState() {
      if (guard.isDisposed()) {
        return undefined;
      }
      try {
        return _data.cloneJson(_KDB.state.widgets.dataTable);
      } catch (err) {
        console.error("[widgetDataTable.getState] failed", err);
        return undefined;
      }
    }

    return { mount: mount, destroy: destroy, dispatch: dispatch, getState: getState };
  }

  function registerWidgetDataTable(_KDB) {
    _KDB.state = _KDB.state || {};
    _KDB.api = _KDB.api || {};
    _KDB.state.widgets = _KDB.state.widgets || {};
    if (!_KDB.state.widgets.dataTable) {
      _KDB.state.widgets.dataTable = createInitialState();
    }
    var controller = createWidgetDataTableController(_KDB);
    _KDB.api.widgetDataTable = controller;
    return controller;
  }

  return registerWidgetDataTable;
});
