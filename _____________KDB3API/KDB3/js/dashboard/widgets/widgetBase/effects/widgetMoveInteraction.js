define([
  "../view/resolveWidgetShell.js",
  "./ensureWidgetInteractionRuntime.js",
  "./widgetMoveHandle.js",
  "./widgetMoveDraggableInit.js"
], function (_resolveWidgetShell, _ensureWidgetInteractionRuntime, _widgetMoveHandle, _widgetMoveDraggableInit) {
  function normalizeMoveMode(mode) {
    const low = String(mode || "").trim().toLowerCase();
    if (low === "oneshot" || low === "einmalig") {
      return "oneShot";
    }
    if (low === "persistent" || low === "aktiv" || low === "aan") {
      return "persistent";
    }
    return "default";
  }

  function setMoveMode(_KDB, widgetId, mode, _payload) {
    const normalizedMode = normalizeMoveMode(mode);
    if (normalizedMode === "default") {
      return disableMoveMode(_KDB, widgetId, _payload || {});
    }
    const shellEl = _resolveWidgetShell.resolveWidgetShell(_KDB, widgetId);
    if (!shellEl) {
      return { ok: false, widgetId: widgetId, errorCode: "WIDGET_BASE_SHELL_NOT_FOUND", errorMessage: "Widget shell not found for move interaction." };
    }
    const runtime = _ensureWidgetInteractionRuntime.ensureInteractionRuntime(_KDB, widgetId, "move", { mode: "default", enabled: false, fromLayout: null });
    const initResult = _widgetMoveDraggableInit.ensureDraggableInitialized(_KDB, widgetId, shellEl, runtime, normalizeMoveMode, disableMoveMode);
    if (initResult.ok !== true) {
      return Object.assign({ widgetId: widgetId }, initResult);
    }
    const $ = _ensureWidgetInteractionRuntime.getJQuery();
    const $widget = $(shellEl);
    if ($widget.hasClass("ui-draggable")) {
      $widget.draggable("option", "containment", false);
      $widget.draggable("enable");
    }
    $widget.addClass("draggable");
    $widget.data("kdb-move-enabled", true);
    runtime.interaction.move["mode"] = normalizedMode;
    runtime.interaction.move.enabled = true;
    return { ok: true, widgetId: widgetId, mode: normalizedMode };
  }

  function disableMoveMode(_KDB, widgetId, _options) {
    const options = _options || {};
    const shellEl = _resolveWidgetShell.resolveWidgetShell(_KDB, widgetId);
    const runtime = _ensureWidgetInteractionRuntime.ensureInteractionRuntime(_KDB, widgetId, "move", { mode: "default", enabled: false, fromLayout: null });
    const $ = _ensureWidgetInteractionRuntime.getJQuery();
    if (shellEl && $) {
      const $widget = $(shellEl);
      if (options.deferUntilStop !== false && $widget.data("kdb-move-dragging") === true) {
        $widget.data("kdb-move-disable-after-stop", true);
        runtime.interaction.move["mode"] = "default";
        runtime.interaction.move.enabled = false;
        return { ok: true, widgetId: widgetId, mode: "default", deferred: true };
      }
      if ($widget.hasClass("ui-draggable")) {
        $widget.draggable("disable");
      }
      $widget.removeClass("draggable");
      $widget.data("kdb-move-enabled", false);
      $widget.removeData("kdb-move-disable-after-stop");
      _widgetMoveHandle.removeCreatedMoveHandle(shellEl);
      _ensureWidgetInteractionRuntime.toggleGridOverlay(shellEl, false, _KDB);
    }
    runtime.interaction.move["mode"] = "default";
    runtime.interaction.move.enabled = false;
    runtime.interaction.move.fromLayout = null;
    return { ok: true, widgetId: widgetId, mode: "default" };
  }

  function teardownMoveInteraction(_KDB, widgetId) {
    const shellEl = _resolveWidgetShell.resolveWidgetShell(_KDB, widgetId);
    const $ = _ensureWidgetInteractionRuntime.getJQuery();
    if (!shellEl || !$) {
      return;
    }
    const $widget = $(shellEl);
    if ($widget.hasClass("ui-draggable")) {
      try {
        $widget.draggable("destroy");
      } catch (_err) {
        /* noop */
      }
    }
    $widget.removeClass("draggable");
    $widget.removeData("kdb-move-bound");
    $widget.removeData("kdb-move-dragging");
    $widget.removeData("kdb-move-enabled");
    $widget.removeData("kdb-move-disable-after-stop");
    _widgetMoveHandle.removeCreatedMoveHandle(shellEl);
    _ensureWidgetInteractionRuntime.toggleGridOverlay(shellEl, false, _KDB);
    const runtime = _KDB.runtime && _KDB.runtime.widgetBase && _KDB.runtime.widgetBase.byId
      ? _KDB.runtime.widgetBase.byId[widgetId]
      : null;
    if (runtime && runtime.interaction && runtime.interaction.move) {
      runtime.interaction.move["mode"] = "default";
      runtime.interaction.move.enabled = false;
      runtime.interaction.move.fromLayout = null;
    }
  }

  return {
    normalizeMoveMode: normalizeMoveMode,
    setMoveMode: setMoveMode,
    disableMoveMode: disableMoveMode,
    teardownMoveInteraction: teardownMoveInteraction
  };
});
