define([], function () {
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
      addStylesheetLink(cssLinks, _cssHrefList[index]);
    }
  }

  function ensureCssLinkBucket(_KDB) {
    _KDB.runtime.core.domRefs.cssLinks = _KDB.runtime.core.domRefs.cssLinks || [];
    return _KDB.runtime.core.domRefs.cssLinks;
  }

  function addStylesheetLink(_cssLinks, _href) {
    if (!_href || hasStylesheetLink(_href)) {
      return;
    }
    const linkEl = document.createElement("link");
    linkEl.rel = "stylesheet";
    linkEl.href = _href;
    document.head.appendChild(linkEl);
    _cssLinks.push(linkEl);
  }

  function hasStylesheetLink(_href) {
    const stylesheetLinks = document.head.querySelectorAll('link[rel="stylesheet"]');
    let index;
    for (index = 0; index < stylesheetLinks.length; index += 1) {
      if (stylesheetLinks[index].getAttribute("href") === _href) {
        return true;
      }
    }
    return false;
  }

  return addCssLinks;
});
