define([
  "./runApplyBindingPreSteps.js",
  "./runClearSlotsAndFiltersStep.js",
  "./runRemoveManagedFiltersStep.js",
  "./runApplyBindingRenderSteps.js",
  "./validateBindingApplyInputs.js",
], function (
  _runApplyBindingPreSteps,
  _runClearSlotsAndFiltersStep,
  _runRemoveManagedFiltersStep,
  _runApplyBindingRenderSteps,
  _validateBindingApplyInputs
) {
  "use strict";

  return {
    runApplyBindingPreSteps: _runApplyBindingPreSteps,
    runClearSlotsAndFiltersStep: _runClearSlotsAndFiltersStep,
    runRemoveManagedFiltersStep: _runRemoveManagedFiltersStep,
    runApplyBindingRenderSteps: _runApplyBindingRenderSteps,
    validateBindingApplyInputs: _validateBindingApplyInputs,
  };
});
