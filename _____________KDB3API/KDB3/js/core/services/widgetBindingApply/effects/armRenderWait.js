define([], function () {
  "use strict";

  function buildCognosRenderWaitOptions(_renderWait) {
    var options = {};
    if (_renderWait && typeof _renderWait.intervalMs === "number") {
      options.intervalMs = _renderWait.intervalMs;
    }
    return options;
  }

  function armRenderWait(_target, _options, _cognosBinding, _signal) {
    try {
      var widgetId = _target && _target.widgetId;
      var renderWait = _options && _options.renderWait ? _options.renderWait : {};
      var waitForStart = renderWait.waitForStart === true;
      var cognosOptions = Object.assign(buildCognosRenderWaitOptions(renderWait), { signal: _signal });
      var armed = {
        waitForStart: waitForStart,
        startPromise: null,
        completePromise: null,
      };

      if (!_cognosBinding || typeof _cognosBinding.whenRenderComplete !== "function") {
        return {
          ok: false,
          errorCode: "WIDGET_BINDING_APPLY_COGNOS_SURFACE_MISSING",
          errorMessage: "whenRenderComplete is unavailable.",
        };
      }

      if (waitForStart && typeof _cognosBinding.whenRenderStart === "function") {
        armed.startPromise = _cognosBinding.whenRenderStart(widgetId, cognosOptions);
      }

      armed.completePromise = _cognosBinding.whenRenderComplete(widgetId, cognosOptions);
      return { ok: true, armed: armed };
    } catch (err) {
      console.error("[widgetBindingApply.armRenderWait] failed", { widgetId: _target && _target.widgetId }, err);
      throw err;
    }
  }

  return armRenderWait;
});
