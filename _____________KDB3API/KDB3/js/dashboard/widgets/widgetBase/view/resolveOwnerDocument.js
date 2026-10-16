define([], function () {
  function resolveOwnerDocument(_KDB) {
    const legacyHostEl = _KDB && _KDB.elements ? _KDB.elements.kdbWidget : null;
    if (legacyHostEl && legacyHostEl.ownerDocument) {
      return legacyHostEl.ownerDocument;
    }
    const hostSelector = readHostSelector(_KDB);
    const hostEl = hostSelector && typeof document !== "undefined" && typeof document.querySelector === "function" ? document.querySelector(hostSelector) : null;
    if (hostEl && hostEl.ownerDocument) {
      return hostEl.ownerDocument;
    }
    return typeof document !== "undefined" ? document : null;
  }

  function readHostSelector(_KDB) {
    const rootSelectors = _KDB && _KDB.elements && _KDB.elements.selectors ? _KDB.elements.selectors.root : null;
    if (!rootSelectors) {
      return null;
    }
    return rootSelectors.kdbWidget || null;
  }

  return resolveOwnerDocument;
});
