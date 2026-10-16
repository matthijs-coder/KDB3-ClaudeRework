define([
  "../view/resolveWidgetShell.js",
  "./interactionRuntime.js",
  "./pointerGeometry.js"
], function (_resolveWidgetShell, _interactionRuntime, _pointerGeometry) {
  "use strict";

  function resizeDefaults() {
    return { enabled: false, fromLayout: null };
  }

  function dispatchFinalResize(_KDB, _widgetId, _fromLayout, _toLayout) {
    var api = _KDB && _KDB.api && _KDB.api.widgetBase;
    if (!api || typeof api.dispatch !== "function") {
      return Promise.resolve({ ok: false, errorCode: "WIDGET_BASE_API_MISSING" });
    }
    return Promise.resolve(api.dispatch({
      type: "widgetBase/resize",
      widgetId: _widgetId,
      payload: { fromLayout: _fromLayout, toLayout: _toLayout, isFinal: true, isHistoryReplay: false }
    }));
  }

  function finishResizeGesture(_KDB, _widgetId, _shellEl, _$widget, _runtime) {
    _$widget.data("kdb-resize-dragging", false);
    _interactionRuntime.toggleGridOverlay(_shellEl, false, _KDB);
    var fromLayout = _runtime.interaction.resize.fromLayout || _pointerGeometry.readWidgetLayoutFromDom(_KDB, _shellEl);
    var toLayout = _pointerGeometry.readWidgetLayoutFromDom(_KDB, _shellEl);
    _runtime.interaction.resize.fromLayout = null;
    dispatchFinalResize(_KDB, _widgetId, fromLayout, toLayout).catch(function (err) {
      console.error("[widgetBase.finishResizeGesture] final resize failed", { widgetId: _widgetId }, err);
    });
  }

  function bindResizable(_KDB, _widgetId, _shellEl, _$widget, _runtime, _mins) {
    _$widget.resizable({
      handles: "n, e, s, w, ne, se, sw, nw",
      containment: false,
      minWidth: 0,
      minHeight: 0,
      disabled: true,
      start: function (event) {
        try {
          _runtime.interaction.resize.fromLayout = _pointerGeometry.applyScaledPointerDelta("start", _shellEl, event, null, { kdb: _KDB });
          _$widget.data("kdb-resize-dragging", true);
          _interactionRuntime.toggleGridOverlay(_shellEl, true, _KDB);
        } catch (err) {
          console.error("[widgetBase.resizeStart] failed", { widgetId: _widgetId }, err);
        }
      },
      resize: function (event, ui) {
        try {
          _pointerGeometry.applyScaledPointerDelta("resize", _shellEl, event, ui, { $widget: _$widget, minWidth: _mins.minWidth, minHeight: _mins.minHeight });
        } catch (err) {
          console.error("[widgetBase.resize] failed", { widgetId: _widgetId }, err);
        }
      },
      stop: function () {
        try {
          finishResizeGesture(_KDB, _widgetId, _shellEl, _$widget, _runtime);
        } catch (err) {
          console.error("[widgetBase.resizeStop] failed", { widgetId: _widgetId }, err);
        }
      }
    });
  }

  // Binds jQuery UI resizable once per shell (disabled; setResizeEnabled enables it).
  function ensureResizableInitialized(_KDB, _widgetId, _shellEl, _widgetType, _runtime) {
    var $ = _interactionRuntime.getJQuery();
    if (!($ && $.fn && typeof $.fn.resizable === "function")) {
      return { ok: false, errorCode: "WIDGET_BASE_JQUERY_UI_RESIZABLE_MISSING", errorMessage: "jQuery UI resizable is not available." };
    }
    var $widget = $(_shellEl);
    if (!$widget.length) {
      return { ok: false, errorCode: "WIDGET_BASE_SHELL_NOT_FOUND", errorMessage: "Widget shell not found for resize interaction." };
    }
    var mins = _interactionRuntime.resolveMinSize(_widgetType);
    if ($widget.data("kdb-resize-bound") !== true) {
      bindResizable(_KDB, _widgetId, _shellEl, $widget, _runtime, mins);
      $widget.data("kdb-resize-bound", true);
    }
    return { ok: true, mins: mins };
  }

  function setResizeEnabled(_KDB, _widgetId, _enabled, _widgetType) {
    if (_enabled === false) {
      return disableResizeMode(_KDB, _widgetId);
    }
    var shellEl = _resolveWidgetShell.resolveWidgetShell(_KDB, _widgetId);
    if (!shellEl) {
      return { ok: false, widgetId: _widgetId, errorCode: "WIDGET_BASE_SHELL_NOT_FOUND", errorMessage: "Widget shell not found for resize interaction." };
    }
    var runtime = _interactionRuntime.ensureInteractionRuntime(_KDB, _widgetId, "resize", resizeDefaults());
    var initResult = ensureResizableInitialized(_KDB, _widgetId, shellEl, _widgetType, runtime);
    if (initResult.ok !== true) {
      return Object.assign({ widgetId: _widgetId }, initResult);
    }
    var $widget = _interactionRuntime.getJQuery()(shellEl);
    if ($widget.hasClass("ui-resizable")) {
      $widget.resizable("option", "containment", false);
      $widget.resizable("option", "minWidth", 0);
      $widget.resizable("option", "minHeight", 0);
      $widget.resizable("enable");
    }
    $widget.addClass("resizable-div resizable-active");
    $widget.data("kdb-resize-enabled", true);
    runtime.interaction.resize.enabled = true;
    return { ok: true, widgetId: _widgetId, enabled: true };
  }

  // While a resize is running the disable is deferred, unless options.deferUntilStop === false.
  function disableResizeMode(_KDB, _widgetId, _options) {
    var options = _options || {};
    var shellEl = _resolveWidgetShell.resolveWidgetShell(_KDB, _widgetId);
    var runtime = _interactionRuntime.ensureInteractionRuntime(_KDB, _widgetId, "resize", resizeDefaults());
    var $ = _interactionRuntime.getJQuery();
    if (shellEl && $) {
      var $widget = $(shellEl);
      if (options.deferUntilStop !== false && $widget.data("kdb-resize-dragging") === true) {
        return { ok: true, widgetId: _widgetId, enabled: false, deferred: true };
      }
      if ($widget.hasClass("ui-resizable")) {
        $widget.resizable("disable");
      }
      $widget.removeClass("resizable-div resizable-active");
      $widget.data("kdb-resize-enabled", false);
      $widget.data("kdb-resize-dragging", false);
      _interactionRuntime.toggleGridOverlay(shellEl, false, _KDB);
    }
    runtime.interaction.resize.enabled = false;
    runtime.interaction.resize.fromLayout = null;
    return { ok: true, widgetId: _widgetId, enabled: false };
  }

  function teardownResizeInteraction(_KDB, _widgetId) {
    var shellEl = _resolveWidgetShell.resolveWidgetShell(_KDB, _widgetId);
    var $ = _interactionRuntime.getJQuery();
    if (!shellEl || !$) {
      return;
    }
    var $widget = $(shellEl);
    if ($widget.hasClass("ui-resizable")) {
      try {
        $widget.resizable("destroy");
      } catch (err) {
        console.warn("[widgetBase.teardownResizeInteraction] resizable destroy failed", { widgetId: _widgetId }, err);
      }
    }
    $widget.removeClass("resizable-div resizable-active");
    $widget.removeData("kdb-resize-bound");
    $widget.removeData("kdb-resize-enabled");
    $widget.removeData("kdb-resize-dragging");
    _interactionRuntime.toggleGridOverlay(shellEl, false, _KDB);
    var runtime = _interactionRuntime.readInteractionRuntime(_KDB, _widgetId);
    if (runtime && runtime.interaction && runtime.interaction.resize) {
      runtime.interaction.resize.enabled = false;
      runtime.interaction.resize.fromLayout = null;
    }
  }

  return {
    setResizeEnabled: setResizeEnabled,
    disableResizeMode: disableResizeMode,
    teardownResizeInteraction: teardownResizeInteraction,
    resolveMinSize: _interactionRuntime.resolveMinSize
  };
});
