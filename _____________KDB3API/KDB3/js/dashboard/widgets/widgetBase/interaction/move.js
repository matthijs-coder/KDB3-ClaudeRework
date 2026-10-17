define([
  "../view/resolveWidgetShell.js",
  "./interactionRuntime.js",
  "./pointerGeometry.js"
], function (_resolveWidgetShell, _interactionRuntime, _pointerGeometry) {
  "use strict";

  var MOVE_HANDLE_SELECTOR = "[data-kdb-widget-move-handle], .KDB_widgetMoveHandleHost";
  var MOVE_STOP_DELAY_MS = 50;

  function moveDefaults() {
    return { mode: "default", enabled: false, fromLayout: null };
  }

  function normalizeMoveMode(_mode) {
    var low = String(_mode || "").trim().toLowerCase();
    if (low === "oneshot" || low === "einmalig") {
      return "oneShot";
    }
    if (low === "persistent" || low === "aktiv" || low === "aan") {
      return "persistent";
    }
    return "default";
  }

  function resolveMoveHandle(_shellEl) {
    if (!_shellEl || typeof _shellEl.querySelector !== "function") {
      return false;
    }
    return _shellEl.querySelector(MOVE_HANDLE_SELECTOR) ? MOVE_HANDLE_SELECTOR : false;
  }

  function ensureMoveHandle(_shellEl) {
    if (!_shellEl || typeof _shellEl.querySelector !== "function" || typeof _shellEl.appendChild !== "function") {
      return null;
    }
    var existing = _shellEl.querySelector(MOVE_HANDLE_SELECTOR);
    if (existing) {
      return existing;
    }
    var doc = _shellEl.ownerDocument || document;
    var handle = doc.createElement("div");
    handle.className = "KDB_widgetMoveHandleHost";
    handle.setAttribute("data-kdb-widget-move-handle", "true");
    handle.setAttribute("data-kdb-widget-base-created", "true");
    handle.setAttribute("title", "Widget verschieben");
    handle.setAttribute("aria-label", "Widget verschieben");
    _shellEl.appendChild(handle);
    return handle;
  }

  function removeCreatedMoveHandle(_shellEl) {
    if (!_shellEl || typeof _shellEl.querySelectorAll !== "function") {
      return;
    }
    var handles = _shellEl.querySelectorAll("[data-kdb-widget-move-handle][data-kdb-widget-base-created='true']");
    for (var index = 0; index < handles.length; index += 1) {
      if (handles[index].parentNode) {
        handles[index].parentNode.removeChild(handles[index]);
      }
    }
  }

  function dispatchFinalMove(_KDB, _widgetId, _fromLayout, _toLayout) {
    var api = _KDB && _KDB.api && _KDB.api.widgetBase;
    if (!api) {
      return Promise.resolve({ ok: false, errorCode: "WIDGET_BASE_API_MISSING" });
    }
    return Promise.resolve(api.dispatch({
      type: "widgetBase/move",
      widgetId: _widgetId,
      payload: { fromLayout: _fromLayout, toLayout: _toLayout, isFinal: true, isHistoryReplay: false }
    }));
  }

  // byId[id].timers.moveStop stays a bare timeout id: the widget runtime cleanup cancels it with clearTimeout.
  function scheduleMoveStopTimer(_runtime, _onFire) {
    _runtime.timers = _runtime.timers || {};
    if (_runtime.timers.moveStop != null) {
      window.clearTimeout(_runtime.timers.moveStop);
    }
    var timerId = window.setTimeout(function () {
      if (!_runtime.timers || _runtime.timers.moveStop !== timerId) {
        return;
      }
      delete _runtime.timers.moveStop;
      _onFire();
    }, MOVE_STOP_DELAY_MS);
    _runtime.timers.moveStop = timerId;
  }

  function finishMoveGesture(_KDB, _widgetId, _shellEl, _$widget, _runtime) {
    _$widget.data("kdb-move-dragging", false);
    _interactionRuntime.toggleGridOverlay(_shellEl, false, _KDB);
    var fromLayout = _runtime.interaction.move.fromLayout || _pointerGeometry.readWidgetLayoutFromDom(_KDB, _shellEl);
    var toLayout = _pointerGeometry.readWidgetLayoutFromDom(_KDB, _shellEl);
    _runtime.interaction.move.fromLayout = null;
    var currentMode = normalizeMoveMode(_runtime.interaction.move.mode);
    scheduleMoveStopTimer(_runtime, function () {
      dispatchFinalMove(_KDB, _widgetId, fromLayout, toLayout).then(function () {
        if (currentMode === "oneShot") {
          disableMoveMode(_KDB, _widgetId, { deferUntilStop: false });
        }
      }).catch(function (err) {
        console.error("[widgetBase.finishMoveGesture] final move failed", { widgetId: _widgetId }, err);
      });
    });
  }

  function bindDraggable(_KDB, _widgetId, _shellEl, _$widget, _runtime) {
    _$widget.draggable({
      containment: false,
      disabled: true,
      handle: resolveMoveHandle(_shellEl),
      start: function (event) {
        try {
          _runtime.interaction.move.fromLayout = _pointerGeometry.applyScaledPointerDelta("start", _shellEl, event, null, { kdb: _KDB, $widget: _$widget });
          _$widget.data("kdb-move-dragging", true);
          _interactionRuntime.toggleGridOverlay(_shellEl, true, _KDB);
        } catch (err) {
          console.error("[widgetBase.moveStart] failed", { widgetId: _widgetId }, err);
        }
      },
      drag: function (event, ui) {
        try {
          _pointerGeometry.applyScaledPointerDelta("move", _shellEl, event, ui);
        } catch (err) {
          console.error("[widgetBase.moveDrag] failed", { widgetId: _widgetId }, err);
        }
      },
      stop: function () {
        try {
          finishMoveGesture(_KDB, _widgetId, _shellEl, _$widget, _runtime);
        } catch (err) {
          console.error("[widgetBase.moveStop] failed", { widgetId: _widgetId }, err);
        }
      }
    });
  }

  // Binds jQuery UI draggable once per shell (disabled; setMoveMode enables it). Failures become a result.
  function ensureDraggableInitialized(_KDB, _widgetId, _shellEl, _runtime) {
    try {
      var $ = _interactionRuntime.getJQuery();
      if (!($ && $.fn && typeof $.fn.draggable === "function")) {
        return { ok: false, errorCode: "WIDGET_BASE_JQUERY_UI_DRAGGABLE_MISSING", errorMessage: "jQuery UI draggable is not available." };
      }
      var $widget = $(_shellEl);
      if (!$widget.length) {
        return { ok: false, errorCode: "WIDGET_BASE_SHELL_NOT_FOUND", errorMessage: "Widget shell not found for move interaction." };
      }
      ensureMoveHandle(_shellEl);
      if ($widget.data("kdb-move-bound") !== true) {
        bindDraggable(_KDB, _widgetId, _shellEl, $widget, _runtime);
        $widget.data("kdb-move-bound", true);
      }
      return { ok: true };
    } catch (err) {
      console.error("[widgetBase.ensureDraggableInitialized] failed", _widgetId, err);
      return { ok: false, errorMessage: String(err && err.message ? err.message : err) };
    }
  }

  function setMoveMode(_KDB, _widgetId, _mode, _payload) {
    var normalizedMode = normalizeMoveMode(_mode);
    if (normalizedMode === "default") {
      return disableMoveMode(_KDB, _widgetId, _payload || {});
    }
    var shellEl = _resolveWidgetShell.resolveWidgetShell(_KDB, _widgetId);
    if (!shellEl) {
      return { ok: false, widgetId: _widgetId, errorCode: "WIDGET_BASE_SHELL_NOT_FOUND", errorMessage: "Widget shell not found for move interaction." };
    }
    var runtime = _interactionRuntime.ensureInteractionRuntime(_KDB, _widgetId, "move", moveDefaults());
    var initResult = ensureDraggableInitialized(_KDB, _widgetId, shellEl, runtime);
    if (initResult.ok !== true) {
      return Object.assign({ widgetId: _widgetId }, initResult);
    }
    var $widget = _interactionRuntime.getJQuery()(shellEl);
    if ($widget.hasClass("ui-draggable")) {
      $widget.draggable("option", "containment", false);
      $widget.draggable("enable");
    }
    $widget.addClass("draggable");
    $widget.data("kdb-move-enabled", true);
    runtime.interaction.move.mode = normalizedMode;
    runtime.interaction.move.enabled = true;
    return { ok: true, widgetId: _widgetId, mode: normalizedMode };
  }

  function resetMoveRuntime(_moveRuntime) {
    _moveRuntime.mode = "default";
    _moveRuntime.enabled = false;
    _moveRuntime.fromLayout = null;
  }

  // While a drag is running the disable is deferred until stop, unless options.deferUntilStop === false.
  function disableMoveMode(_KDB, _widgetId, _options) {
    var options = _options || {};
    var shellEl = _resolveWidgetShell.resolveWidgetShell(_KDB, _widgetId);
    var runtime = _interactionRuntime.ensureInteractionRuntime(_KDB, _widgetId, "move", moveDefaults());
    var $ = _interactionRuntime.getJQuery();
    if (shellEl && $) {
      var $widget = $(shellEl);
      if (options.deferUntilStop !== false && $widget.data("kdb-move-dragging") === true) {
        $widget.data("kdb-move-disable-after-stop", true);
        runtime.interaction.move.mode = "default";
        runtime.interaction.move.enabled = false;
        return { ok: true, widgetId: _widgetId, mode: "default", deferred: true };
      }
      if ($widget.hasClass("ui-draggable")) {
        $widget.draggable("disable");
      }
      $widget.removeClass("draggable");
      $widget.data("kdb-move-enabled", false);
      $widget.removeData("kdb-move-disable-after-stop");
      removeCreatedMoveHandle(shellEl);
      _interactionRuntime.toggleGridOverlay(shellEl, false, _KDB);
    }
    resetMoveRuntime(runtime.interaction.move);
    return { ok: true, widgetId: _widgetId, mode: "default" };
  }

  function teardownMoveInteraction(_KDB, _widgetId) {
    var shellEl = _resolveWidgetShell.resolveWidgetShell(_KDB, _widgetId);
    var $ = _interactionRuntime.getJQuery();
    if (!shellEl || !$) {
      return;
    }
    var $widget = $(shellEl);
    if ($widget.hasClass("ui-draggable")) {
      try {
        $widget.draggable("destroy");
      } catch (err) {
        console.warn("[widgetBase.teardownMoveInteraction] draggable destroy failed", { widgetId: _widgetId }, err);
      }
    }
    $widget.removeClass("draggable");
    $widget.removeData("kdb-move-bound");
    $widget.removeData("kdb-move-dragging");
    $widget.removeData("kdb-move-enabled");
    $widget.removeData("kdb-move-disable-after-stop");
    removeCreatedMoveHandle(shellEl);
    _interactionRuntime.toggleGridOverlay(shellEl, false, _KDB);
    var runtime = _interactionRuntime.readInteractionRuntime(_KDB, _widgetId);
    if (runtime && runtime.interaction && runtime.interaction.move) {
      resetMoveRuntime(runtime.interaction.move);
    }
  }

  return {
    normalizeMoveMode: normalizeMoveMode,
    setMoveMode: setMoveMode,
    disableMoveMode: disableMoveMode,
    teardownMoveInteraction: teardownMoveInteraction
  };
});
