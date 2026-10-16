define(["./cssLinkRegistry.js"], function (_registry) {
  function addCssLinks(_KDB, _cssHrefList) {
    if (!Array.isArray(_cssHrefList)) {
      return;
    }
    addStylesheetLinks(_KDB, _cssHrefList);
  }

  function addStylesheetLinks(_KDB, _cssHrefList) {
    const cssLinks = ensureCssLinkBucket(_KDB);
    let index;
    for (index = 0; index < _cssHrefList.length; index += 1) {
      addStylesheetLink(_KDB, cssLinks, _cssHrefList[index]);
    }
  }

  function ensureCssLinkBucket(_KDB) {
    _KDB.runtime.core.domRefs.cssLinks = _KDB.runtime.core.domRefs.cssLinks || [];
    return _KDB.runtime.core.domRefs.cssLinks;
  }

  // A link another instance already created is shared (this instance becomes a co-owner); a foreign
  // link is left alone.
  function addStylesheetLink(_KDB, _cssLinks, _href) {
    if (!_href) {
      return;
    }
    const existing = findStylesheetLink(_href);
    if (existing) {
      if (_registry.joinOwnedLink(_KDB, existing)) {
        _cssLinks.push(existing);
      }
      return;
    }
    _cssLinks.push(_registry.createOwnedLink(_KDB, _href));
  }

  function findStylesheetLink(_href) {
    const stylesheetLinks = document.head.querySelectorAll('link[rel="stylesheet"]');
    let index;
    for (index = 0; index < stylesheetLinks.length; index += 1) {
      if (stylesheetLinks[index].getAttribute("href") === _href) {
        return stylesheetLinks[index];
      }
    }
    return null;
  }

  return addCssLinks;
});
