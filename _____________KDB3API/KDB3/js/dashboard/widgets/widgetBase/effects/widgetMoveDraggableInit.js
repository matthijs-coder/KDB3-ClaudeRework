define([
  "./readWidgetLayoutFromDom.js",
  "./ensureWidgetInteractionRuntime.js",
  "./widgetMoveHandle.js",
  "./applyScaledPointerDelta.js"
], function (_readWidgetLayoutFromDom, _ensureWidgetInteractionRuntime, _widgetMoveHandle, _applyScaledPointerDelta) {
  function hasDraggable($) {
    return $ && $.fn && typeof $.fn.draggable === "function";
  }

  function dispatchFinalMove(_KDB, widgetId, fromLayout, toLayout) {
    const api = _KDB && _KDB.api && _KDB.api.widgetBase;
    if (!api || typeof api.dispatch !== "function") {
      return Promise.resolve({ ok: false, errorCode: "WIDGET_BASE_API_MISSING" });
    }
    return Promise.resolve(api.dispatch({
      type: "widgetBase/move",
      widgetId: widgetId,
      payload: { fromLayout: fromLayout, toLayout: toLayout, isFinal: true, isHistoryReplay: false }
    }));
  }

  function clearMoveStopTimer(runtime) {
    if (runtime && runtime.timers && runtime.timers.moveStop != null) {
      window.clearTimeout(runtime.timers.moveStop);
    }
  }

  function onMoveStopTimer(runtime, timerId, onFire) {
    if (!runtime.timers || runtime.timers.moveStop !== timerId) {
      return;
    }
    delete runtime.timers.moveStop;
    onFire();
  }

  function scheduleMoveStopTimer(runtime, onFire) {
    runtime.timers = runtime.timers || {};
    clearMoveStopTimer(runtime);
    const timerId = window.setTimeout(function () {
      onMoveStopTimer(runtime, timerId, onFire);
    }, 50);
    runtime.timers.moveStop = timerId;
  }

  function ensureDraggableInitialized(_KDB, widgetId, shellEl, runtime, normalizeMoveMode, disableMoveMode) {
    try {
      const $ = _ensureWidgetInteractionRuntime.getJQuery();
      if (!hasDraggable($)) {
        return { ok: false, errorCode: "WIDGET_BASE_JQUERY_UI_DRAGGABLE_MISSING", errorMessage: "jQuery UI draggable is not available." };
      }
      const $widget = $(shellEl);
      if (!$widget.length) {
        return { ok: false, errorCode: "WIDGET_BASE_SHELL_NOT_FOUND", errorMessage: "Widget shell not found for move interaction." };
      }
      _widgetMoveHandle.ensureMoveHandle(shellEl);
      if ($widget.data("kdb-move-bound") === true) {
        return { ok: true };
      }
      const moveHandle = _widgetMoveHandle.resolveMoveHandle(shellEl);
      $widget.draggable({
        containment: false,
        disabled: true,
        handle: moveHandle,
        start: function (event) {
          runtime.interaction.move.fromLayout = _applyScaledPointerDelta("start", shellEl, event, null, { kdb: _KDB, $widget: $widget });
          $widget.data("kdb-move-dragging", true);
          _ensureWidgetInteractionRuntime.toggleGridOverlay(shellEl, true, _KDB);
        },
        drag: function (event, ui) {
          _applyScaledPointerDelta("move", shellEl, event, ui);
        },
        stop: function () {
          $widget.data("kdb-move-dragging", false);
          _ensureWidgetInteractionRuntime.toggleGridOverlay(shellEl, false, _KDB);
          const fromLayout = runtime.interaction.move.fromLayout || _readWidgetLayoutFromDom(_KDB, shellEl);
          const toLayout = _readWidgetLayoutFromDom(_KDB, shellEl);
          runtime.interaction.move.fromLayout = null;
          const currentMode = normalizeMoveMode(runtime.interaction.move["mode"]);
          scheduleMoveStopTimer(runtime, function () {
            dispatchFinalMove(_KDB, widgetId, fromLayout, toLayout).then(function () {
              if (currentMode === "oneShot") {
                disableMoveMode(_KDB, widgetId, { deferUntilStop: false });
              }
            });
          });
        }
      });
      $widget.data("kdb-move-bound", true);
      return { ok: true };
    } catch (err) {
      console.error("[widgetBase.ensureDraggableInitialized] failed", widgetId, err);
      return { ok: false, errorMessage: String(err && err.message ? err.message : err) };
    }
  }

  return { ensureDraggableInitialized: ensureDraggableInitialized };
});
