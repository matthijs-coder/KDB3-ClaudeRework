define([
  "./config.js",
], function (_config) {
  "use strict";

  var COGNOS_VIS_TYPE_CANONICAL_BY_LOWER = {
    line: "Line",
    pie: "Pie",
    list: "List",
    stackedbar: "StackedBar",
    stackedcolumn: "StackedColumn",
  };

  function toCanonicalCognosVisType(_value) {
    var raw = String(_value == null ? "" : _value).trim();
    if (!raw) {
      return "";
    }
    var lower = raw.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(COGNOS_VIS_TYPE_CANONICAL_BY_LOWER, lower)) {
      return COGNOS_VIS_TYPE_CANONICAL_BY_LOWER[lower];
    }
    return raw;
  }

  function resolveDesiredVisType(_plan) {
    var visualization = _plan && _plan.visualization ? _plan.visualization : {};
    return toCanonicalCognosVisType(
      visualization.cognosVisualizationTypeId || visualization.canonicalVisType || visualization.visType
    );
  }

  function isClearOnlyReset(_plan) {
    return !!(_plan && _plan.resetIntent && _plan.resetIntent.rebuildAfterClear === false);
  }

  // True when the widget's slots must be cleared and rebuilt (slotsChanged, a slot/filter reset, or slotsToClear "all").
  function shouldClearSlots(_plan) {
    if (!_plan) {
      return false;
    }
    if (_plan.slotsChanged === true) {
      return true;
    }
    var resetIntent = _plan.resetIntent || {};
    if (resetIntent.enabled === true && (resetIntent.clearAllSlots === true || resetIntent.clearAllLocalFilters === true)) {
      return true;
    }
    var slotsToClear = Array.isArray(_plan.slotsToClear) ? _plan.slotsToClear : [];
    return slotsToClear.indexOf("all") >= 0;
  }

  function resolveEmptyDiagnostics(_plan) {
    var emptyIntent = _plan && _plan.emptyIntent ? _plan.emptyIntent : null;
    if (emptyIntent && emptyIntent.enabled === true) {
      return { emptyMode: "forceEmpty", emptyReason: emptyIntent.reason != null ? emptyIntent.reason : null };
    }
    var filters = Array.isArray(_plan && _plan.localFilters) ? _plan.localFilters : [];
    for (var index = 0; index < filters.length; index += 1) {
      var descriptor = filters[index];
      if (descriptor && descriptor.kind === "emptyData" && descriptor.mode === "forceEmpty") {
        return { emptyMode: "forceEmpty", emptyReason: descriptor.reason != null ? descriptor.reason : null };
      }
    }
    return { emptyMode: null, emptyReason: null };
  }

  function resolveTimeoutMs(_options, _target) {
    if (_options && typeof _options.timeoutMs === "number") {
      return _options.timeoutMs;
    }
    var profile = _options && _options.timeoutProfile ? _options.timeoutProfile : null;
    if (!profile) {
      profile = _target && _target.targetKind === "vis" ? "vis" : "helper";
    }
    return profile === "vis" ? _config.TIMEOUTS.vis : _config.TIMEOUTS.helper;
  }

  function resolveRenderWaitOptions(_options, _target) {
    var renderWait = _options && _options.renderWait ? _options.renderWait : {};
    var defaultsForKind = _target && _target.targetKind === "vis"
      ? _config.RENDER_WAIT_DEFAULTS.vis
      : _config.RENDER_WAIT_DEFAULTS.helper;
    return {
      waitForStart: typeof renderWait.waitForStart === "boolean" ? renderWait.waitForStart : defaultsForKind.waitForStart === true,
      // false = trigger renderWidget but do not await render events; used by writeback restore where
      // widgets bind on inactive tabs (Cognos never fires render events there) and the post-restore traverse renders.
      waitForComplete: renderWait.waitForComplete !== false,
      intervalMs: typeof renderWait.intervalMs === "number" ? renderWait.intervalMs : defaultsForKind.intervalMs || 100,
    };
  }

  function missingFacetMethods(_runtime) {
    var missing = [];
    Object.keys(_config.REQUIRED_FACET_METHODS).forEach(function (facetKey) {
      var facet = _runtime ? _runtime[facetKey] : null;
      _config.REQUIRED_FACET_METHODS[facetKey].forEach(function (method) {
        if (!facet || typeof facet[method] !== "function") {
          missing.push(facetKey + "." + method);
        }
      });
    });
    return missing;
  }

  function invalidInput(_message) {
    return { ok: false, errorCode: "WIDGET_BINDING_APPLY_INVALID_INPUT", errorMessage: _message };
  }

  function invalidPlan(_message) {
    return { ok: false, errorCode: "WIDGET_BINDING_APPLY_INVALID_PLAN", errorMessage: _message };
  }

  // renderWait.js listens on the signal, so a plain { aborted } object is rejected before any Cognos call.
  function isListenableSignal(_signal) {
    return !!_signal && typeof _signal.addEventListener === "function" && typeof _signal.removeEventListener === "function";
  }

  function validateBindingApplyInputs(_runtime, _plan, _options) {
    if (!_plan) {
      return invalidInput("Missing plan.");
    }
    if (_plan.ok !== true || _plan.status !== "success") {
      return invalidPlan("Plan is not successful.");
    }
    if (!_options || !_options.target || !_options.target.widgetId) {
      return invalidInput("Missing target.widgetId.");
    }
    if (!_options.signal) {
      return invalidInput("Missing AbortSignal.");
    }
    if (!isListenableSignal(_options.signal)) {
      return invalidInput("Invalid AbortSignal: addEventListener and removeEventListener are required.");
    }
    if (missingFacetMethods(_runtime).length) {
      return {
        ok: false,
        errorCode: "WIDGET_BINDING_APPLY_COGNOS_SURFACE_MISSING",
        errorMessage: "Required Cognos binding surface is unavailable.",
      };
    }
    if (!_plan.datasource || !_plan.datasource.id) {
      return invalidPlan("Plan missing datasource.id.");
    }
    if (!_plan.visualization) {
      return invalidPlan("Plan missing visualization.");
    }
    if (!resolveDesiredVisType(_plan)) {
      return invalidPlan("Plan missing desired visType.");
    }
    return { ok: true };
  }

  return {
    resolveDesiredVisType: resolveDesiredVisType,
    isClearOnlyReset: isClearOnlyReset,
    shouldClearSlots: shouldClearSlots,
    resolveEmptyDiagnostics: resolveEmptyDiagnostics,
    resolveTimeoutMs: resolveTimeoutMs,
    resolveRenderWaitOptions: resolveRenderWaitOptions,
    missingFacetMethods: missingFacetMethods,
    validateBindingApplyInputs: validateBindingApplyInputs,
  };
});
