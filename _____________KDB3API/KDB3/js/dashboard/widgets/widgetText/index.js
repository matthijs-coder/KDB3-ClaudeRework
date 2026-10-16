define([
  "./config/actionTypes.js",
  "./dispatchResult.js",
  "./effects.js",
  "./history.js",
  "./restore.js",
  "./selectors.js",
  "./state.js",
  "./textEdit.js",
  "./widgetRuntime.js",
  "../../../core/utils/kit/data.js",
  "../../../core/utils/kit/errors.js",
  "../../../core/utils/kit/runtime.js"
], function (
  _actionTypes,
  _dispatchResult,
  _effects,
  _history,
  _restore,
  _selectors,
  _state,
  _textEdit,
  _widgetRuntime,
  _data,
  _errors,
  _rt
) {
  "use strict";
  // Lifecycle terms: idle, mounted, disposed.

  var UNKNOWN_ACTION = "WIDGET_TEXT_UNKNOWN_ACTION";

  // One table for routing and validation: perWidget routes require action.widgetId.
  var ROUTES = {};
  ROUTES[_actionTypes.CONTENT_CREATE] = { handler: _effects.handleContentCreate, perWidget: true, failCode: "WIDGET_TEXT_CONTENT_CREATE_FAILED" };
  ROUTES[_actionTypes.COMMIT_TEXT_EDIT] = { handler: _textEdit.handleCommitTextEdit, perWidget: true, failCode: "WIDGET_TEXT_EDIT_COMMIT_FAILED" };
  ROUTES[_actionTypes.APPLY_FONT_SIZE] = { handler: _effects.handleApplyFontSize, perWidget: true, failCode: "WIDGET_TEXT_FONT_APPLY_FAILED" };
  ROUTES[_actionTypes.APPLY_RESTYLE] = { handler: _effects.handleApplyRestyle, perWidget: true, failCode: "WIDGET_TEXT_RESTYLE_APPLY_FAILED" };
  ROUTES[_actionTypes.APPLY_TITLE] = { handler: handleApplyTitle, perWidget: true, failCode: "WIDGET_TEXT_EDIT_COMMIT_FAILED" };
  ROUTES[_actionTypes.APPLY_READABLE_TEXT_COLOR] = {
    handler: _effects.handleApplyReadableTextColor, perWidget: true, failCode: "WIDGET_TEXT_COLOR_APPLY_FAILED"
  };
  ROUTES[_actionTypes.CLEANUP_CONTENT] = { handler: _effects.handleCleanupContent, perWidget: true, failCode: "WIDGET_TEXT_CLEANUP_FAILED" };
  ROUTES[_actionTypes.PARAMETER_SET_RESET] = { handler: _restore.handleParameterSetReset, perWidget: false, failCode: UNKNOWN_ACTION };
  ROUTES[_actionTypes.PARAMETER_SET_RESTORE] = { handler: _restore.handleParameterSetRestore, perWidget: false, failCode: UNKNOWN_ACTION };

  function handleApplyTitle(_context, _action) {
    return {
      ok: true,
      widgetId: _action.widgetId,
      opSeq: _action.opSeq,
      skipped: true,
      reasonCode: "WIDGET_TEXT_TITLE_DROPDOWN_DISPLAY_ONLY"
    };
  }

  function validateAction(_action) {
    var action = _action || {};
    if (!action.type) {
      return { errorCode: UNKNOWN_ACTION };
    }
    var route = ROUTES[action.type];
    if (route && route.perWidget && !action.widgetId) {
      return { errorCode: "WIDGET_TEXT_WIDGET_ID_MISSING" };
    }
    if (action.widgetId && action.payload && action.payload.widgetId && action.widgetId !== action.payload.widgetId) {
      return { errorCode: "WIDGET_TEXT_WIDGET_ID_CONFLICT" };
    }
    return action;
  }

  function createWidgetTextController(_KDB, _initialOptions) {
    var guard = _errors.createDisposedGuard("widgetText");
    var context = {
      _KDB: _KDB,
      options: _initialOptions || {},
      selectors: _selectors,
      dispatchInternal: dispatchInternal
    };

    function dispatchInternal(_action) {
      _KDB.state.widgets.text = _state.reduceWidgetText(_KDB.state.widgets.text, _action);
    }

    function ensureTextState() {
      _KDB.state.widgets = _KDB.state.widgets || {};
      if (!_KDB.state.widgets.text) {
        _KDB.state.widgets.text = _state.createInitialWidgetTextState();
      }
    }

    function recordModuleError(_errorCode, _err) {
      dispatchInternal({
        type: _actionTypes.ERROR_RECORDED,
        payload: { moduleLevel: true, errorCode: _errorCode, errorMessage: String(_err && _err.message ? _err.message : _err) }
      });
    }

    function mount(_options) {
      if (guard.blocked("mount")) {
        return false;
      }
      try {
        context.options = Object.assign({}, context.options, _options || {});
        ensureTextState();
        _widgetRuntime.readRuntimeRoot(_KDB);
        dispatchInternal({ type: _actionTypes.MOUNT_STARTED });
        dispatchInternal({ type: _actionTypes.MOUNT_SUCCEEDED });
        return true;
      } catch (err) {
        console.error("[widgetText.mount] failed", err);
        recordModuleError("WIDGET_TEXT_MOUNT_FAILED", err);
        return false;
      }
    }

    async function runRoute(_route, _action) {
      try {
        return _dispatchResult.normalizeDispatchResult(await _route.handler(context, _action));
      } catch (err) {
        console.error("[widgetText.dispatch] " + _action.type + " failed", { widgetId: _action.widgetId }, err);
        dispatchInternal({
          type: _actionTypes.ERROR_RECORDED,
          widgetId: _action.widgetId,
          payload: { moduleLevel: !_action.widgetId, errorCode: _route.failCode, errorMessage: String(err && err.message ? err.message : err) }
        });
        return _dispatchResult.normalizeDispatchResult(
          _dispatchResult.failureResult(_action.widgetId, _action.opSeq, _route.failCode, err)
        );
      }
    }

    function dispatch(_action) {
      if (guard.blocked("dispatch")) {
        return Promise.resolve(_dispatchResult.normalizeDispatchResult(
          { ok: false, outcome: "aborted", reason: "disposed", skipped: true, status: "aborted" }
        ));
      }
      ensureTextState();
      var action = validateAction(_action);
      if (action.errorCode) {
        return Promise.resolve(_dispatchResult.normalizeDispatchResult({ ok: false, errorCode: action.errorCode }));
      }
      var route = ROUTES[action.type];
      if (!route) {
        return Promise.resolve(_dispatchResult.normalizeDispatchResult(
          { ok: false, widgetId: action.widgetId, errorCode: UNKNOWN_ACTION }
        ));
      }
      return runRoute(route, action);
    }

    function getState() {
      return guard.isDisposed() ? undefined : _data.cloneJson(_KDB.state.widgets.text);
    }

    function destroy() {
      if (guard.isDisposed()) {
        return;
      }
      guard.dispose();
      try {
        var runtime = _widgetRuntime.readRuntimeRoot(_KDB);
        _effects.cleanupAllWidgetRuntimes(_KDB);
        var errors = _rt.disposeRuntimeBuckets(runtime);
        if (errors.length) {
          console.error("[widgetText.destroy] cleanup errors", errors);
        }
        runtime.byId = {};
        runtime.historyReplayHandlerContribution = null;
        delete runtime.parameterSetRunId;
        dispatchInternal({ type: _actionTypes.DESTROY });
      } catch (err) {
        console.error("[widgetText.destroy] failed", err);
        recordModuleError("WIDGET_TEXT_DESTROY_FAILED", err);
      }
    }

    return { mount: mount, destroy: destroy, dispatch: dispatch, getState: getState };
  }

  function registerWidgetText(_KDB, _options) {
    _KDB.state.widgets = _KDB.state.widgets || {};
    if (!_KDB.state.widgets.text) {
      _KDB.state.widgets.text = _state.createInitialWidgetTextState();
    }
    var runtime = _widgetRuntime.readRuntimeRoot(_KDB);
    runtime.historyReplayHandlerContribution = _history.createWidgetTextReplayHandler();
    var cognosHost = _KDB.services ? _KDB.services.cognosHost : null;
    runtime.widgetsFacet = cognosHost && cognosHost.widgets ? cognosHost.widgets : null;
    var controller = createWidgetTextController(_KDB, _options);
    _KDB.api.widgetText = controller;
    return controller;
  }

  return registerWidgetText;
});
