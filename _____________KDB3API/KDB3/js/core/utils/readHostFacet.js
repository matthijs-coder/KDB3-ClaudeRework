/*
 * One reader for cognosHost facets, replacing the per-feature `read*Facet` copies.
 *
 *   readHostFacet(_KDB, facetName)            -> _KDB.services.cognosHost[facetName] | null
 *   readStampedFacet(_KDB, owner, facetName)  -> _KDB.runtime[owner][facetName] | null
 *                                                (the facet a feature stamped on its own runtime at registration)
 *
 * Anything missing on the path (no _KDB, services, cognosHost, runtime, owner, or a falsy facet) yields null; neither
 * function throws. Both return the stored object itself, not a copy. Pure: reads only, caches nothing.
 */
define([], function () {
  "use strict";

  function readHostFacet(_KDB, _facetName) {
    var service = _KDB && _KDB.services ? _KDB.services.cognosHost : null;
    return service && service[_facetName] ? service[_facetName] : null;
  }

  function readStampedFacet(_KDB, _owner, _facetName) {
    var runtime = _KDB && _KDB.runtime ? _KDB.runtime[_owner] : null;
    return runtime && runtime[_facetName] ? runtime[_facetName] : null;
  }

  return {
    readHostFacet: readHostFacet,
    readStampedFacet: readStampedFacet
  };
});
