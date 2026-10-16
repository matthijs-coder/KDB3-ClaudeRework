define([], function () {
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
      return {
        emptyMode: "forceEmpty",
        emptyReason: emptyIntent.reason != null ? emptyIntent.reason : null,
      };
    }
    var filters = Array.isArray(_plan && _plan.localFilters) ? _plan.localFilters : [];
    for (var index = 0; index < filters.length; index += 1) {
      var descriptor = filters[index];
      if (descriptor && descriptor.kind === "emptyData" && descriptor.mode === "forceEmpty") {
        return {
          emptyMode: "forceEmpty",
          emptyReason: descriptor.reason != null ? descriptor.reason : null,
        };
      }
    }
    return { emptyMode: null, emptyReason: null };
  }

  function resolveTimeoutMs(_options, _defaults, _target) {
    if (_options && typeof _options.timeoutMs === "number") {
      return _options.timeoutMs;
    }
    var profile = _options && _options.timeoutProfile ? _options.timeoutProfile : null;
    if (!profile) {
      profile = _target && _target.targetKind === "vis" ? "vis" : "helper";
    }
    var timeouts = _defaults && _defaults.timeouts ? _defaults.timeouts : {};
    if (profile === "vis") {
      return timeouts.vis;
    }
    return timeouts.helper;
  }

  function resolveRenderWaitOptions(_options, _defaults, _target) {
    var renderWait = _options && _options.renderWait ? _options.renderWait : {};
    var defaultsForKind =
      _target && _target.targetKind === "vis"
        ? (_defaults.renderWaitDefaults && _defaults.renderWaitDefaults.vis) || {}
        : (_defaults.renderWaitDefaults && _defaults.renderWaitDefaults.helper) || {};
    return {
      waitForStart:
        typeof renderWait.waitForStart === "boolean"
          ? renderWait.waitForStart
          : defaultsForKind.waitForStart === true,
      // false = trigger renderWidget but do not await render events; used by
      // writeback restore where widgets bind on inactive tabs (Cognos never
      // fires render events there) and the post-restore traverse renders.
      waitForComplete: renderWait.waitForComplete !== false,
      intervalMs:
        typeof renderWait.intervalMs === "number"
          ? renderWait.intervalMs
          : defaultsForKind.intervalMs || 100,
    };
  }

  return {
    resolveDesiredVisType: resolveDesiredVisType,
    shouldClearSlots: shouldClearSlots,
    resolveEmptyDiagnostics: resolveEmptyDiagnostics,
    resolveTimeoutMs: resolveTimeoutMs,
    resolveRenderWaitOptions: resolveRenderWaitOptions,
  };
});
