define([], function () {
  "use strict";

  const ATTR_OWNER = "data-connected-vis-widget-id";
  const ATTR_TOKEN = "data-kdb-topn-claim-token";

  function mirrorClaimOnShell(_KDB, _helperWidgetId, _ownerVisId, _claimToken) {
    try {
      const shellEl = resolveHelperShell(_KDB, _helperWidgetId);
      if (!shellEl) {
        return;
      }
      shellEl.setAttribute(ATTR_OWNER, _ownerVisId);
      shellEl.setAttribute(ATTR_TOKEN, _claimToken);
    } catch (err) {
      console.error("[widgetTopN.mirrorTopNHelperClaim] mirror failed", { helperWidgetId: _helperWidgetId }, err);
      throw err;
    }
  }

  function clearMirrorIfMatch(_KDB, _helperWidgetId, _ownerVisId, _claimToken) {
    try {
      const shellEl = resolveHelperShell(_KDB, _helperWidgetId);
      if (!shellEl) {
        return;
      }
      const mirror = readMirrorFromElement(shellEl);
      if (mirror.ownerVisId === _ownerVisId && mirror.claimToken === _claimToken) {
        shellEl.removeAttribute(ATTR_OWNER);
        shellEl.removeAttribute(ATTR_TOKEN);
      }
    } catch (err) {
      console.error("[widgetTopN.mirrorTopNHelperClaim] clear failed", { helperWidgetId: _helperWidgetId }, err);
      throw err;
    }
  }

  function readMirrorFromShell(_KDB, _helperWidgetId) {
    try {
      return readMirrorFromElement(resolveHelperShell(_KDB, _helperWidgetId));
    } catch (err) {
      console.error("[widgetTopN.mirrorTopNHelperClaim] read failed", { helperWidgetId: _helperWidgetId }, err);
      throw err;
    }
  }

  function readMirrorFromElement(shellEl) {
    if (!shellEl) {
      return { ownerVisId: null, claimToken: null };
    }
    return {
      ownerVisId: shellEl.getAttribute(ATTR_OWNER),
      claimToken: shellEl.getAttribute(ATTR_TOKEN)
    };
  }

  function resolveHelperShell(_KDB, helperWidgetId) {
    if (!helperWidgetId) {
      return null;
    }
    const ownerDocument = resolveOwnerDocument(_KDB);
    if (!ownerDocument || typeof ownerDocument.getElementById !== "function") {
      return null;
    }
    return ownerDocument.getElementById(helperWidgetId);
  }

  function resolveOwnerDocument(_KDB) {
    const legacyHostEl = _KDB && _KDB.elements ? _KDB.elements.kdbWidget : null;
    if (legacyHostEl && legacyHostEl.ownerDocument) {
      return legacyHostEl.ownerDocument;
    }
    return typeof document !== "undefined" ? document : null;
  }

  return {
    mirrorClaimOnShell: mirrorClaimOnShell,
    clearMirrorIfMatch: clearMirrorIfMatch,
    readMirrorFromShell: readMirrorFromShell
  };
});
