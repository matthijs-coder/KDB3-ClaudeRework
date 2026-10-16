/*
 * Published module: the Cognos visualization-property apply that widgetTopN runs on its helper chart (a widget
 * without a vis record). It stays a function import because it is a command with non-serialisable arguments (the
 * live owner runtime it records `lastAppliedVisPropertiesType` on, an abort signal) and an unnormalised result
 * ({ ok, skipped, aborted, diagnostics }): `api.widgetVis.dispatch` would reshape the result. It cannot live in
 * selectors.js (selectors.js is imported by runtime.js, which render/visProperties.js imports).
 * Transitional: goes away when the helper property apply moves behind a visualization service.
 *
 *   applyVisualizationProperties(_KDB, { widgetId, visualizationType, runtime, input, signal, phase, force, omitTitleMode })
 */
define(["./render/visProperties.js"], function (_visProperties) {
  "use strict";

  return { applyVisualizationProperties: _visProperties.applyVisualizationProperties };
});
