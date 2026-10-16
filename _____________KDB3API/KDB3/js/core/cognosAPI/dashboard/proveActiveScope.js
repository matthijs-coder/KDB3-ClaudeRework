define([
  "./resolveRelatedPageRoots.js",
  "./resolveTabPageRoots.js",
  "./proveScopeResolution.js"
], function (_resolveRelatedPageRoots, _resolveTabPageRoots, _proveScopeResolution) {
  "use strict";

  return {
    page: function (_nodes) { return _proveScopeResolution(_nodes, _resolveRelatedPageRoots); },
    tab: function (_nodes) { return _proveScopeResolution(_nodes, _resolveTabPageRoots); }
  };
});
