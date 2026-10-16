define([
  "./applyResult.js",
  "./gates.js",
  "./spec.js",
  "../config.js",
  "../legend/sweep.js",
  "../render/title.js",
  "../render/visProperties.js",
  "../runtime.js",
  "../topN/gate.js",
  "../visTypes.js"
], function (_applyResult, _gates, _spec, _config, _legendSweep, _title, _visProperties, _visRuntime, _topNGate, _visTypes) {
  "use strict";

  function validateSettings(_settings, _input) {
    var settings = _settings || {};
    if (settings.dimension === undefined || settings.visType === undefined || settings.topNChoice === undefined
      || settings.visType == null || settings.visType === "") {
      return _gates.blockedResult("error", "WIDGET_VIS_SETTINGS_SNAPSHOT_INCOMPLETE", "settings_incomplete", _input);
    }
    return null;
  }

  function decodeGateFailure(_input, _err) {
    if (_err && _err.destroyed) {
      return _gates.blockedResult("error", "WIDGET_VIS_DESTROY_FAILED", "destroyed", _input);
    }
    if (_err && _err.timedOut) {
      return _gates.blockedResult("timeout", "WIDGET_VIS_BINDING_PREREQUISITE_TIMEOUT",
        _err.kind === "topN" ? "awaiting_topN" : "awaiting_dienststelle", _input);
    }
    if (_err && _err.cancelled) {
      return _applyResult.abortedStaleResult(_input.widgetId, _input.opSeq);
    }
    if (_err && _err.prerequisiteFailed) {
      return _gates.blockedResult("error", _err.errorCode || "WIDGET_VIS_BINDING_PREREQUISITE_FAILED", "prerequisite_failed", _input, {
        errorMessage: _err.errorMessage || null,
        kind: _err.kind || null
      });
    }
    return _gates.blockedResult("error", "WIDGET_VIS_BINDING_PREREQUISITE_FAILED", "prerequisite_failed", _input);
  }

  // Resolves to {ok:true, input, spec} when the dienststelle and TopN prerequisites are met, else a blocked result.
  // spec is the TopN gate's spec (null when no TopN request was needed).
  function resolveBindingPrerequisites(_context, _input) {
    var input = Object.assign({}, _input || {});
    var settingsBlock;
    if (_applyResult.isCleanupInput(input)) {
      return Promise.resolve({ ok: true, input: Object.assign({}, input, { helperTableResult: null }), spec: null });
    }
    settingsBlock = validateSettings(input.settings, input);
    if (settingsBlock) {
      return Promise.resolve(settingsBlock);
    }
    return _gates.resolveDienststellePrerequisite(_context._KDB, input).then(function (_hierarchySnapshot) {
      return _topNGate.resolveTopNPrerequisite(_context, input, input.settings, _hierarchySnapshot).then(function (_outcome) {
        if (_outcome.blocked === true) {
          return _outcome.result;
        }
        return {
          ok: true,
          input: Object.assign({}, input, { settings: input.settings, hierarchySnapshot: _hierarchySnapshot, helperTableResult: _outcome.helperTableResult }),
          spec: _outcome.spec
        };
      });
    }).catch(decodeGateFailure.bind(null, input));
  }

  function planFailedResult(_ctx, _plan, _propertyDiagnostics) {
    var planDiagnostics = Object.assign({}, _plan && _plan.diagnostics ? _plan.diagnostics : {});
    if (_propertyDiagnostics) {
      planDiagnostics.visualizationProperties = _propertyDiagnostics;
    }
    return {
      ok: false, widgetId: _ctx.widgetId, opSeq: _ctx.opSeq, status: "error",
      errorCode: "WIDGET_VIS_BINDING_PLAN_FAILED",
      errorMessage: _plan && _plan.errorMessage ? _plan.errorMessage : "Binding plan failed.",
      diagnostics: Object.keys(planDiagnostics).length ? planDiagnostics : null,
      propertyDiagnostics: _propertyDiagnostics
    };
  }

  // Only reachable while widgetBindingApply is not registered (never in production): keeps the old order
  // plan failure > stale > skipped / cleanup error, which `run` cannot give because it checks availability first.
  function settleWithoutApplyService(_context, _input, _ctx, _spec, _propertyDiagnostics) {
    var plan = _ctx.planService.buildPlan(_spec);
    if (!plan || plan.ok !== true || plan.status !== "success") {
      return planFailedResult(_ctx, plan, _propertyDiagnostics);
    }
    if (_context.isStaleOpSeq(_ctx.widgetId, _ctx.opSeq)) {
      return _applyResult.abortedStaleResult(_ctx.widgetId, _ctx.opSeq);
    }
    if (_applyResult.isCleanupInput(_input)) {
      return {
        ok: false, widgetId: _ctx.widgetId, opSeq: _ctx.opSeq, status: "error",
        errorCode: plan.emptyIntent && plan.emptyIntent.enabled === true ? "WIDGET_VIS_EMPTY_APPLY_FAILED" : "WIDGET_VIS_BINDING_APPLY_FAILED",
        errorMessage: "widgetBindingApply.applyBinding is not registered."
      };
    }
    return {
      ok: true, widgetId: _ctx.widgetId, opSeq: _ctx.opSeq, status: "skipped", skipped: true,
      diagnostics: { propertyDiagnostics: _propertyDiagnostics }
    };
  }

  function buildApplyOptions(_input, _ctx, _plan) {
    var options = {
      target: { widgetId: _ctx.widgetId, targetKind: "vis", ownerWidgetId: null, opSeq: _ctx.opSeq, reason: _plan.reason },
      signal: _ctx.abortController.signal,
      previousManagedFilterItemIds: _ctx.runtime.managedFilterItemIds || [],
      timeoutProfile: _config.applyTimeoutProfile
    };
    if (_input.payload && _input.payload.deferRenderWait === true) {
      options.renderWait = { waitForStart: false, waitForComplete: false };
    }
    return options;
  }

  function installLegendObserver(_context, _input, _ctx) {
    var legendSettings = _input.settings || {};
    _legendSweep.installLegendObserverBeforeApply(_ctx.runtime, _ctx.widgetId, {
      opSeq: _ctx.opSeq,
      mode: _input.mode,
      isStaleOpSeq: _context.isStaleOpSeq,
      dimension: legendSettings.dimension,
      visType: legendSettings.visType
    });
  }

  // Plan failure > stale > apply, as before. Only a failure of applyBinding or of the result handlers becomes a
  // result envelope; a throw before the apply (buildPlan, stale check, legend install) still rejects.
  async function applyPlan(_context, _input, _ctx, _propertyResult) {
    var widgetId = _ctx.widgetId;
    var opSeq = _ctx.opSeq;
    var propertyDiagnostics = _propertyResult && _propertyResult.diagnostics ? _propertyResult.diagnostics : null;
    var spec = _spec.resolvePipelineSpec(_ctx._KDB, Object.assign({}, _input, { widgetId: widgetId, opSeq: opSeq }), _ctx.spec);
    var reachedApply = false;
    var outcome;
    try {
      outcome = await _ctx._KDB.services.widgetBinding.run(spec, {
        beforeApply: function () {
          if (_context.isStaleOpSeq(widgetId, opSeq)) {
            return false;
          }
          if (!_applyResult.isCleanupInput(_input)) {
            installLegendObserver(_context, _input, _ctx);
          }
          return true;
        },
        applyOptions: function (plan) {
          var options = buildApplyOptions(_input, _ctx, plan);
          reachedApply = true;
          return options;
        }
      });
      if (outcome.stage === "unavailable") {
        return settleWithoutApplyService(_context, _input, _ctx, spec, propertyDiagnostics);
      }
      if (outcome.stage === "plan") {
        return planFailedResult(_ctx, outcome.plan, propertyDiagnostics);
      }
      if (outcome.stage === "cancelled" || _applyResult.isAbortedApply(_context, _ctx)) {
        return _applyResult.abortedStaleResult(widgetId, opSeq);
      }
      return await _applyResult.handleApplyBindingSuccess(_context, _ctx, _input, outcome.plan, outcome.applyResult, _propertyResult);
    } catch (err) {
      if (!reachedApply) {
        throw err;
      }
      return _applyResult.handleApplyBindingFailure(_ctx, err);
    }
  }

  async function continueBindingPipeline(_context, _input, _ctx) {
    var widgetId = _ctx.widgetId;
    var opSeq = _ctx.opSeq;
    var settings = _input.settings || {};
    var signal = _ctx.abortController.signal;
    var propertyResult;
    var propertyDiagnostics;
    var propertyBlockers;
    var titleResult;
    if (_applyResult.isCleanupInput(_input)) {
      return applyPlan(_context, _input, _ctx, null);
    }
    propertyResult = await _visProperties.applyVisualizationProperties(_ctx._KDB, {
      widgetId: widgetId,
      visualizationType: settings.visType || _visTypes.resolveDefaultVisualizationType(_ctx._KDB),
      runtime: _ctx.runtime,
      input: _input,
      signal: signal,
      phase: "preBinding"
    });
    if (_context.isStaleOpSeq(widgetId, opSeq) || (propertyResult && propertyResult.aborted === true)) {
      return _applyResult.abortedStaleResult(widgetId, opSeq);
    }
    propertyDiagnostics = propertyResult && propertyResult.diagnostics;
    propertyBlockers = (propertyDiagnostics && propertyDiagnostics.blockers) || [];
    if (propertyBlockers.length > 0) {
      return {
        ok: false,
        widgetId: widgetId,
        opSeq: opSeq,
        status: "error",
        errorCode: "WIDGET_VIS_VISUALIZATION_PROPERTY_BLOCKED",
        errorMessage: "Visualization property apply blocked: " + propertyBlockers.join(", "),
        diagnostics: propertyDiagnostics,
        propertyDiagnostics: propertyDiagnostics
      };
    }
    // Cognos setTitle runs once before the render; the post-render title sync is DOM-only.
    titleResult = await _title.applyPreRenderTitle({
      _KDB: _ctx._KDB, widgetId: widgetId, metric: _input.metric || {}, settings: settings, runtime: _ctx.runtime, signal: signal
    });
    if (titleResult && titleResult.aborted === true) {
      return _applyResult.abortedStaleResult(widgetId, opSeq);
    }
    return applyPlan(_context, _input, _ctx, propertyResult);
  }

  function runBindingPipeline(_context, _input) {
    var _KDB = _context._KDB;
    var widgetId = _input.widgetId;
    var opSeq = _context.ensureOpSeq(widgetId, _input.opSeq);
    var runtime = _visRuntime.ensureWidgetRuntime(_KDB, widgetId);
    var abortController;
    var planService;
    _visRuntime.abortActiveApply(runtime);

    if (typeof AbortController !== "function") {
      console.error("[widgetVis.runBindingPipeline] AbortController unavailable");
      return Promise.resolve({
        ok: false,
        widgetId: widgetId,
        opSeq: opSeq,
        status: "error",
        errorCode: "WIDGET_VIS_ABORT_SIGNAL_UNAVAILABLE",
        errorMessage: "AbortController is unavailable; binding apply requires a valid AbortSignal."
      });
    }
    abortController = new AbortController();
    runtime.abortControllers.applyBinding = abortController;

    planService = _KDB.services && _KDB.services.widgetBindingPlan;
    if (!planService || typeof planService.buildPlan !== "function") {
      console.error("[widgetVis.runBindingPipeline] widgetBindingPlan service missing");
      return Promise.resolve({
        ok: false,
        widgetId: widgetId,
        opSeq: opSeq,
        errorCode: "WIDGET_VIS_BINDING_PLAN_FAILED",
        errorMessage: "widgetBindingPlan.buildPlan is not registered."
      });
    }
    return resolveBindingPrerequisites(_context, Object.assign({}, _input, { widgetId: widgetId, opSeq: opSeq })).then(function (_gateResult) {
      if (_gateResult.ok !== true) {
        return _gateResult;
      }
      return continueBindingPipeline(_context, _gateResult.input, {
        _KDB: _KDB,
        widgetId: widgetId,
        opSeq: opSeq,
        runtime: runtime,
        abortController: abortController,
        planService: planService,
        spec: _gateResult.spec
      });
    });
  }

  return {
    runBindingPipeline: runBindingPipeline,
    resolveBindingPrerequisites: resolveBindingPrerequisites
  };
});
