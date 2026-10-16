define([
  "./buildAbortedApplyResult.js",
  "./resolveBindingApplyOptions.js",
  "./bindingApplyStepHelpers.js",
  "./runCognosPreStep.js",
], function (_buildAbortedApplyResult, _resolveBindingApplyOptions, _bindingApplyStepHelpers, _runCognosPreStep) {
  "use strict";

  async function __controller(_deps, _plan, _options, _diagnosticsBuilder, _signal, _cognosBinding) {
    var widgetId = _options.target.widgetId;
    var currentVisType;
    var desiredVisType;
    var readOutcome;
    var datasourceOutcome;
    var mapped;

    try {
      readOutcome = await _runCognosPreStep(_signal, _plan, _diagnosticsBuilder, "readCurrentVisType", "WIDGET_BINDING_APPLY_GET_VIS_TYPE_FAILED", function () {
        return _cognosBinding.getVisType(widgetId);
      });
      if (readOutcome.aborted) {
        return readOutcome;
      }
      if (!readOutcome.ok) {
        return readOutcome;
      }
      currentVisType = readOutcome.data;
      _diagnosticsBuilder.diagnostics.cognos.currentVisType = currentVisType != null ? currentVisType : null;

      datasourceOutcome = await _runCognosPreStep(_signal, _plan, _diagnosticsBuilder, "setDatasourceInitial", "WIDGET_BINDING_APPLY_SET_DATASOURCE_FAILED", function () {
        return _cognosBinding.setVizDataSource(_plan.datasource.id, widgetId, { signal: _signal });
      });
      if (datasourceOutcome.aborted) {
        return datasourceOutcome;
      }
      if (!datasourceOutcome.ok) {
        return datasourceOutcome;
      }
      _diagnosticsBuilder.diagnostics.cognos.datasourceId = _plan.datasource.id;

      if (_signal && _signal.aborted) {
        return { aborted: true, result: _buildAbortedApplyResult(_plan, _diagnosticsBuilder) };
      }

      desiredVisType = _resolveBindingApplyOptions.resolveDesiredVisType(_plan);
      _diagnosticsBuilder.diagnostics.cognos.desiredVisType = desiredVisType || null;
      if (desiredVisType !== currentVisType) {
        mapped = _bindingApplyStepHelpers.mapFacetOutcome(
          await Promise.resolve(_cognosBinding.setVisType(desiredVisType, widgetId, { signal: _signal }))
        );
        if (mapped.aborted) {
          return { aborted: true, result: _buildAbortedApplyResult(_plan, _diagnosticsBuilder) };
        }
        if (!mapped.ok) {
          _bindingApplyStepHelpers.setStepFailure(
            _diagnosticsBuilder,
            "setVisType",
            mapped.errorCode || "WIDGET_BINDING_APPLY_SET_VIS_TYPE_FAILED",
            mapped.errorMessage || "setVisType failed."
          );
          return { ok: false };
        }
        _diagnosticsBuilder.addCompletedStep("setVisType");
      } else {
        _diagnosticsBuilder.addCompletedStep("setVisType");
      }

      return { ok: true };
    } catch (err) {
      console.error("[widgetBindingApply.runApplyBindingPreSteps] failed", { widgetId: widgetId }, err);
      throw err;
    }
  }

  return __controller;
});
