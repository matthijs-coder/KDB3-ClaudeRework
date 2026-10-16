define(["./copyable.js", "./dialog.js"], function (_copyable, _dialog) {
  "use strict";

  function buildClosedResult(request, reason) {
    if (request.kind === "confirm") return { confirmed: false, reason: reason };
    if (request.kind === "choose") return { choice: null, reason: reason };
    if (request.kind === "copyable") return { action: null, reason: reason };
    return null;
  }

  function buildActionResult(request, payload) {
    var action = payload.action;
    var reason = action === "cancel" ? "cancelled" : "dismissed";
    if (request.kind === "confirm") {
      return action === "confirm" ? { confirmed: true, reason: "selected" } : { confirmed: false, reason: reason };
    }
    if (request.kind === "choose") {
      return action === "choose" ? { choice: payload.choice, reason: "selected" } : { choice: null, reason: reason };
    }
    if (request.kind === "copyable") {
      return action === "action" ? { action: "selected", reason: "selected" } : { action: null, reason: "dismissed" };
    }
    return null;
  }

  function buildDestroyedResult(kind) {
    if (kind === "confirm") return { confirmed: false, reason: "destroyed" };
    if (kind === "copyable") return { action: null, reason: "destroyed" };
    return { choice: null, reason: "destroyed" };
  }

  function createRequest(runtime, kind, options) {
    var request = {
      id: "message-request-" + runtime.queues.nextRequestId,
      kind: kind,
      options: options || {},
      viewHandle: null
    };
    runtime.queues.nextRequestId += 1;
    return request;
  }

  function settleActive(context, result) {
    var runtime = context._KDB.runtime.messageService;
    var request = runtime.queues.activeModalRequest;
    var pending;
    if (!request) return;
    runtime.queues.activeModalRequest = null;
    if (request.viewHandle) _dialog.cleanupDialog(context._KDB, request.viewHandle);
    pending = runtime.pendingPromises[request.id];
    delete runtime.pendingPromises[request.id];
    if (pending && typeof pending.resolve === "function") pending.resolve(result);
    processNext(context);
  }

  // Dialog event callback: a failure here must not leave the queue stuck on the active request.
  function handleAction(context, payload) {
    var request;
    try {
      request = context._KDB.runtime.messageService.queues.activeModalRequest;
      if (!request) return;
      if (request.kind === "copyable" && payload.action === "copy") {
        _copyable.copyActiveRequestText(context, request.id);
        return;
      }
      settleActive(context, buildActionResult(request, payload));
    } catch (error) {
      console.error("[messageService.handleAction] failed", error);
    }
  }

  function processNext(context) {
    var runtime = context._KDB.runtime.messageService;
    var request;
    if (runtime.queues.activeModalRequest || runtime.queues.modalRequests.length === 0) return;
    request = runtime.queues.modalRequests.shift();
    runtime.queues.activeModalRequest = request;
    try {
      request.viewHandle = _dialog.mountDialog(context._KDB, request, context.labels);
      _dialog.bindDialog(request.viewHandle, request, handleAction.bind(null, context));
    } catch (error) {
      console.error("[messageService.processNext] render failed", error);
      settleActive(context, buildClosedResult(request, "unavailable"));
    }
  }

  function enqueuePassive(context, kind, options) {
    var runtime = context._KDB.runtime.messageService;
    runtime.queues.modalRequests.push(createRequest(runtime, kind, options));
    processNext(context);
  }

  function enqueueInteractive(context, kind, options) {
    var runtime = context._KDB.runtime.messageService;
    return new Promise(function (resolve) {
      var request = createRequest(runtime, kind, options);
      runtime.pendingPromises[request.id] = { kind: kind, resolve: resolve };
      runtime.queues.modalRequests.push(request);
      processNext(context);
    });
  }

  function enqueueCopyableAction(context, options) {
    var runtime = context._KDB.runtime.messageService;
    var request = createRequest(runtime, "copyable", options);
    var slot = { onSettled: null };
    runtime.pendingPromises[request.id] = {
      kind: "copyable",
      resolve: function (result) {
        try {
          if (typeof slot.onSettled === "function") slot.onSettled(result);
        } catch (error) {
          console.error("[messageService.whenDone] callback failed", error);
        }
      }
    };
    runtime.queues.modalRequests.push(request);
    processNext(context);
    return {
      whenDone: function (callback) {
        if (slot.onSettled) {
          console.warn("[messageService.showCopyable] whenDone already registered");
          return;
        }
        slot.onSettled = callback;
      }
    };
  }

  function destroy(context) {
    var runtime = context._KDB.runtime.messageService;
    var active = runtime.queues.activeModalRequest;
    var pendingPromises = runtime.pendingPromises;
    runtime.queues.activeModalRequest = null;
    runtime.queues.modalRequests = [];
    if (active && active.viewHandle) _dialog.cleanupDialog(context._KDB, active.viewHandle);
    Object.keys(pendingPromises).forEach(function (id) {
      var pending = pendingPromises[id];
      delete pendingPromises[id];
      if (pending && typeof pending.resolve === "function") pending.resolve(buildDestroyedResult(pending.kind));
    });
  }

  function createModalQueue(_KDB, labels, notify) {
    var context = { _KDB: _KDB, labels: labels, notify: notify };
    return {
      destroy: destroy.bind(null, context),
      enqueueCopyableAction: enqueueCopyableAction.bind(null, context),
      enqueueInteractive: enqueueInteractive.bind(null, context),
      enqueuePassive: enqueuePassive.bind(null, context)
    };
  }

  return createModalQueue;
});
