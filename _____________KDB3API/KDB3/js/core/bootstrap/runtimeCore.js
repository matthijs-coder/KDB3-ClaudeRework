define([], function () {
  "use strict";

  // runtime.core keeps only what other modules read: the render parent (`domRefs.renderParentEl`), the CSS link
  // registry (`domRefs.cssLinks`, created by core/css) and the Cognos content adapter (`adapters.content`, read by
  // core/properties).
  function createRuntimeCore(_options) {
    const options = _options || {};
    return {
      domRefs: { renderParentEl: options.parent || options.content || null },
      adapters: { content: options.content || null }
    };
  }

  function clearRuntimeCore(_KDB) {
    _KDB.runtime.core = {};
  }

  return {
    createRuntimeCore: createRuntimeCore,
    clearRuntimeCore: clearRuntimeCore
  };
});
