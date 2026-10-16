define(["./cssLinkRegistry.js"], function (_registry) {
  "use strict";

  // Releases every link this instance uses; the DOM node goes only when no other instance still uses it.
  function removeCssLinks(_KDB) {
    var domRefs = _KDB.runtime && _KDB.runtime.core && _KDB.runtime.core.domRefs;
    var cssLinks = domRefs && domRefs.cssLinks;
    var index;
    if (!Array.isArray(cssLinks)) {
      return;
    }
    for (index = 0; index < cssLinks.length; index += 1) {
      _registry.releaseLink(_KDB, cssLinks[index]);
    }
    domRefs.cssLinks = [];
  }

  return removeCssLinks;
});
