define([
  "../view/resolveWidgetShell.js",
  "./readWidgetLayoutFromDom.js",
  "./ensureWidgetInteractionRuntime.js",
  "./applyScaledPointerDelta.js"
], function (_resolveWidgetShell, _readWidgetLayoutFromDom, _ensureWidgetInteractionRuntime, _applyScaledPointerDelta) {
  function hasResizable($) {
    return $ && $.fn && typeof $.fn.resizable === "function";
  }

  function dispatchFinalResize(_KDB, widgetId, fromLayout, toLayout) {
    const api = _KDB && _KDB.api && _KDB.api.widgetBase;
    if (!api || typeof api.dispatch !== "function") {
      return Promise.resolve({ ok: false, errorCode: "WIDGET_BASE_API_MISSING" });
    }
    return Promise.resolve(api.dispatch({
      type: "widgetBase/resize",
      widgetId: widgetId,
      payload: { fromLayout: fromLayout, toLayout: toLayout, isFinal: true, isHistoryReplay: false }
    }));
  }
  function ensureResizableInitialized(_KDB, widgetId, shellEl, widgetType, runtime) {
    const $ = _ensureWidgetInteractionRuntime.getJQuery();
    if (!hasResizable($)) {
      return { ok: false, errorCode: "WIDGET_BASE_JQUERY_UI_RESIZABLE_MISSING", errorMessage: "jQuery UI resizable is not available." };
    }
    const $widget = $(shellEl);
    if (!$widget.length) {
      return { ok: false, errorCode: "WIDGET_BASE_SHELL_NOT_FOUND", errorMessage: "Widget shell not found for resize interaction." };
    }
    const mins = _ensureWidgetInteractionRuntime.resolveMinSize(widgetType);
    if ($widget.data("kdb-resize-bound") === true) {
      return { ok: true, mins: mins };
    }
    $widget.resizable({
      handles: "n, e, s, w, ne, se, sw, nw",
      containment: false,
      minWidth: 0,
      minHeight: 0,
      disabled: true,
      start: function (event) {
        runtime.interaction.resize.fromLayout = _applyScaledPointerDelta("start", shellEl, event, null, { kdb: _KDB });
        $widget.data("kdb-resize-dragging", true);
        _ensureWidgetInteractionRuntime.toggleGridOverlay(shellEl, true, _KDB);
      },
      resize: function (event, ui) {
        _applyScaledPointerDelta("resize", shellEl, event, ui, { $widget: $widget, minWidth: mins.minWidth, minHeight: mins.minHeight });
      },
      stop: function () {
        $widget.data("kdb-resize-dragging", false);
        _ensureWidgetInteractionRuntime.toggleGridOverlay(shellEl, false, _KDB);
        const fromLayout = runtime.interaction.resize.fromLayout || _readWidgetLayoutFromDom(_KDB, shellEl);
        const toLayout = _readWidgetLayoutFromDom(_KDB, shellEl);
        runtime.interaction.resize.fromLayout = null;
        dispatchFinalResize(_KDB, widgetId, fromLayout, toLayout);
      }
    });
    $widget.data("kdb-resize-bound", true);
    return { ok: true, mins: mins };
  }

  function setResizeEnabled(_KDB, widgetId, enabled, widgetType) {
    if (enabled === false) {
      return disableResizeMode(_KDB, widgetId);
    }
    const shellEl = _resolveWidgetShell.resolveWidgetShell(_KDB, widgetId);
    if (!shellEl) {
      return { ok: false, widgetId: widgetId, errorCode: "WIDGET_BASE_SHELL_NOT_FOUND", errorMessage: "Widget shell not found for resize interaction." };
    }
    const runtime = _ensureWidgetInteractionRuntime.ensureInteractionRuntime(_KDB, widgetId, "resize", { enabled: false, fromLayout: null });
    const initResult = ensureResizableInitialized(_KDB, widgetId, shellEl, widgetType, runtime);
    if (initResult.ok !== true) {
      return Object.assign({ widgetId: widgetId }, initResult);
    }
    const $ = _ensureWidgetInteractionRuntime.getJQuery();
    const $widget = $(shellEl);
    if ($widget.hasClass("ui-resizable")) {
      $widget.resizable("option", "containment", false);
      $widget.resizable("option", "minWidth", 0);
      $widget.resizable("option", "minHeight", 0);
      $widget.resizable("enable");
    }
    $widget.addClass("resizable-div resizable-active");
    $widget.data("kdb-resize-enabled", true);
    runtime.interaction.resize.enabled = true;
    return { ok: true, widgetId: widgetId, enabled: true };
  }

  function disableResizeMode(_KDB, widgetId, _options) {
    const options = _options || {};
    const shellEl = _resolveWidgetShell.resolveWidgetShell(_KDB, widgetId);
    const runtime = _ensureWidgetInteractionRuntime.ensureInteractionRuntime(_KDB, widgetId, "resize", { enabled: false, fromLayout: null });
    const $ = _ensureWidgetInteractionRuntime.getJQuery();
    if (shellEl && $) {
      const $widget = $(shellEl);
      if (options.deferUntilStop !== false && $widget.data("kdb-resize-dragging") === true) {
        return { ok: true, widgetId: widgetId, enabled: false, deferred: true };
      }
      if ($widget.hasClass("ui-resizable")) {
        $widget.resizable("disable");
      }
      $widget.removeClass("resizable-div resizable-active");
      $widget.data("kdb-resize-enabled", false);
      $widget.data("kdb-resize-dragging", false);
      _ensureWidgetInteractionRuntime.toggleGridOverlay(shellEl, false, _KDB);
    }
    runtime.interaction.resize.enabled = false;
    runtime.interaction.resize.fromLayout = null;
    return { ok: true, widgetId: widgetId, enabled: false };
  }

  function teardownResizeInteraction(_KDB, widgetId) {
    const shellEl = _resolveWidgetShell.resolveWidgetShell(_KDB, widgetId);
    const $ = _ensureWidgetInteractionRuntime.getJQuery();
    if (!shellEl || !$) {
      return;
    }
    const $widget = $(shellEl);
    if ($widget.hasClass("ui-resizable")) {
      try {
        $widget.resizable("destroy");
      } catch (_err) {
        /* noop */
      }
    }
    $widget.removeClass("resizable-div resizable-active");
    $widget.removeData("kdb-resize-bound");
    $widget.removeData("kdb-resize-enabled");
    $widget.removeData("kdb-resize-dragging");
    _ensureWidgetInteractionRuntime.toggleGridOverlay(shellEl, false, _KDB);
    const runtime = _KDB.runtime && _KDB.runtime.widgetBase && _KDB.runtime.widgetBase.byId
      ? _KDB.runtime.widgetBase.byId[widgetId]
      : null;
    if (runtime && runtime.interaction && runtime.interaction.resize) {
      runtime.interaction.resize.enabled = false;
      runtime.interaction.resize.fromLayout = null;
    }
  }

  return {
    setResizeEnabled: setResizeEnabled,
    disableResizeMode: disableResizeMode,
    teardownResizeInteraction: teardownResizeInteraction,
    resolveMinSize: _ensureWidgetInteractionRuntime.resolveMinSize
  };
});
