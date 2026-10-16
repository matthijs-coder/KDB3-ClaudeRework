define(["../../utils/kit/runtime.js", "./config.js"], function (_rt, _config) {
  "use strict";

  function createQueues() {
    return { activeModalRequest: null, modalRequests: [], nextRequestId: 1 };
  }

  function ensureMessageRuntime(_KDB) {
    var runtime = _rt.ensureRuntime(_KDB, "messageService");
    var domRefs = runtime.domRefs;
    domRefs.anchoredNotifications = domRefs.anchoredNotifications || [];
    domRefs.globalNotifications = domRefs.globalNotifications || [];
    domRefs.nextNotificationId = domRefs.nextNotificationId || 1;
    domRefs.portalEl = domRefs.portalEl || null;
    runtime.queues = runtime.queues || createQueues();
    return runtime;
  }

  function clearMessageRuntime(_KDB) {
    var runtime = ensureMessageRuntime(_KDB);
    var portalEl = runtime.domRefs.portalEl;
    var errors = _rt.disposeRuntimeBuckets(runtime);
    if (errors.length) {
      console.error("[messageService.destroy] cleanup errors", errors);
    }
    if (portalEl && portalEl.parentNode) {
      portalEl.parentNode.removeChild(portalEl);
    }
    runtime.queues = createQueues();
    return ensureMessageRuntime(_KDB);
  }

  function ensureMessageRoot(_KDB) {
    var runtime = _KDB.runtime.messageService;
    var ownerDocument = typeof document !== "undefined" ? document : null;
    var portalEl;
    if (!ownerDocument || !ownerDocument.body) {
      throw new Error("MESSAGE_DOCUMENT_UNAVAILABLE");
    }
    if (runtime.domRefs.portalEl && runtime.domRefs.portalEl.isConnected) {
      return runtime.domRefs.portalEl;
    }
    portalEl = ownerDocument.createElement("div");
    portalEl.id = _config.ROOT_ID;
    portalEl.className = "kdb-message-root";
    portalEl.setAttribute("data-kdb-owner", "messageService");
    ownerDocument.body.appendChild(portalEl);
    runtime.domRefs.portalEl = portalEl;
    return portalEl;
  }

  return {
    clearMessageRuntime: clearMessageRuntime,
    ensureMessageRoot: ensureMessageRoot,
    ensureMessageRuntime: ensureMessageRuntime
  };
});
