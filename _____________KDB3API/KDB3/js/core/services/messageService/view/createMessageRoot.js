define([], function () {
  "use strict";

  function createPortalElement(ownerDocument) {
    var portalEl = ownerDocument.createElement("div");
    portalEl.id = "kdb-message-root";
    portalEl.className = "kdb-message-root";
    portalEl.setAttribute("data-kdb-owner", "messageService");
    ownerDocument.body.appendChild(portalEl);
    return portalEl;
  }

  function __controller(_KDB) {
    var runtime = _KDB.runtime.messageService;
    var ownerDocument = typeof document !== "undefined" ? document : null;
    if (!ownerDocument || !ownerDocument.body) {
      throw new Error("MESSAGE_DOCUMENT_UNAVAILABLE");
    }
    if (runtime.domRefs.portalEl && runtime.domRefs.portalEl.isConnected) {
      return runtime.domRefs.portalEl;
    }
    runtime.domRefs.portalEl = createPortalElement(ownerDocument);
    return runtime.domRefs.portalEl;
  }

  return __controller;
});
