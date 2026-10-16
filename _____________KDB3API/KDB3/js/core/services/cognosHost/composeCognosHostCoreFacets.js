define([
  "./facets/filters/createFiltersAdapter.js",
  "./facets/widgets/createWidgetsAdapter.js",
  "./facets/canvas/createCanvasAdapter.js",
  "./facets/visualization/createVisualizationAdapter.js",
  "./facets/dataQuery/createDataQueryAdapter.js"
], function (
  _createFiltersAdapter,
  _createWidgetsAdapter,
  _createCanvasAdapter,
  _createVisualizationAdapter,
  _createDataQueryAdapter
) {
  "use strict";

  // Existing five cognosHost facet factories. Slice-5 edge adapters
  // (dashboard / messages / tabs) stay out of this file so it remains at
  // AMD 5, under the cap of 6.
  function composeCognosHostCoreFacets(_deps) {
    return {
      filters: _createFiltersAdapter(_deps),
      widgets: _createWidgetsAdapter(_deps),
      canvas: _createCanvasAdapter(_deps),
      visualization: _createVisualizationAdapter(_deps),
      dataQuery: _createDataQueryAdapter(_deps)
    };
  }

  return composeCognosHostCoreFacets;
});
