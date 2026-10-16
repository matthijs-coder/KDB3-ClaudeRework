define([
  "./composeCognosHostCoreFacets.js",
  "./composeCognosHostEdgeFacets.js"
], function (
  _composeCognosHostCoreFacets,
  _composeCognosHostEdgeFacets
) {
  "use strict";

  // Keeps createCognosHostService.js at four AMD imports (three runtime
  // helpers plus this composer). Facet factories are composed in core and
  // edge so the service file never grows a fifth import.
  //
  // Merge: edge onto core. Edge keys win on collision; there should be none.
  function composeCognosHostFacets(_deps) {
    return Object.assign(
      {},
      _composeCognosHostCoreFacets(_deps),
      _composeCognosHostEdgeFacets(_deps)
    );
  }

  return composeCognosHostFacets;
});
