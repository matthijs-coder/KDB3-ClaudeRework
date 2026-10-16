define([
  "./buildMessageResult.js",
  "./handleCopyableCopy.js",
  "../view/renderMessageDialog.js"
], function (_buildMessageResult, _handleCopyableCopy, _renderMessageDialog) {
  "use strict";

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
    if (request.viewHandle) _renderMessageDialog.cleanup(context._KDB, request.viewHandle);
    pending = runtime.pendingPromises[request.id];
    delete runtime.pendingPromises[request.id];
    if (pending && typeof pending.resolve === "function") pending.resolve(result);
    processNext(context);
  }

  function handleAction(context, actionPayload) {
    try {
      var request = context._KDB.runtime.messageService.queues.activeModalRequest;
      if (!request) return;
      if (request.kind === "copyable" && actionPayload.action === "copy") {
        _handleCopyableCopy(context, request.id);
        return;
      }
      settleActive(context, _buildMessageResult.buildActionResult(request, actionPayload));
    } catch (err) {
      console.error("[messageService.handleAction] failed", err);
    }
  }

  function processNext(context) {
    var runtime = context._KDB.runtime.messageService;
    var request;
    if (runtime.queues.activeModalRequest || runtime.queues.modalRequests.length === 0) return;
    request = runtime.queues.modalRequests.shift();
    runtime.queues.activeModalRequest = request;
    try {
      request.viewHandle = _renderMessageDialog.render(
        context._KDB,
        request,
        context.labels,
        handleAction.bind(null, context)
      );
    } catch (error) {
      console.error("[messageService.modalQueue] render failed", error);
      settleActive(context, _buildMessageResult.buildClosedResult(request, "unavailable"));
    }
  }

  function enqueuePassive(context, kind, options) {
    var runtime = context._KDB.runtime.messageService;
    runtime.queues.modalRequests.push(createRequest(runtime, kind, options));
    processNext(context);
  }

  function registerInteractive(context, kind, options, resolve) {
    var runtime = context._KDB.runtime.messageService;
    var request = createRequest(runtime, kind, options);
    runtime.pendingPromises[request.id] = { kind: kind, resolve: resolve };
    runtime.queues.modalRequests.push(request);
    processNext(context);
  }

  function enqueueInteractive(context, kind, options) {
    return new Promise(registerInteractive.bind(null, context, kind, options));
  }

  function registerCopyableWhenDone(_handle, _fn) {
    try {
      if (_handle.onSettled) {
        console.warn("[messageService.showCopyable] whenDone already registered");
        return;
      }
      _handle.onSettled = _fn;
    } catch (err) {
      console.error("[messageService.registerCopyableWhenDone] failed", err);
    }
  }

  function invokeCopyableWhenDone(_handle, _result) {
    try {
      if (typeof _handle.onSettled === "function") _handle.onSettled(_result);
    } catch (err) {
      console.error("[messageService.invokeCopyableWhenDone] failed", err);
    }
  }

  function enqueueCopyableAction(context, options) {
    try {
      var runtime = context._KDB.runtime.messageService;
      var request = createRequest(runtime, "copyable", options);
      var slot = { onSettled: null };
      var handle = { whenDone: registerCopyableWhenDone.bind(null, slot) };
      runtime.pendingPromises[request.id] = { kind: "copyable", resolve: invokeCopyableWhenDone.bind(null, slot) };
      runtime.queues.modalRequests.push(request);
      processNext(context);
      return handle;
    } catch (err) {
      console.error("[messageService.enqueueCopyableAction] failed", err);
      throw err;
    }
  }

  function destroy(context) {
    var runtime = context._KDB.runtime.messageService;
    var active = runtime.queues.activeModalRequest;
    var keys = Object.keys(runtime.pendingPromises);
    var index;
    var pending;
    runtime.queues.activeModalRequest = null;
    runtime.queues.modalRequests = [];
    if (active && active.viewHandle) _renderMessageDialog.cleanup(context._KDB, active.viewHandle);
    for (index = 0; index < keys.length; index += 1) {
      pending = runtime.pendingPromises[keys[index]];
      if (pending && typeof pending.resolve === "function") {
        pending.resolve(_buildMessageResult.buildDestroyedResult(pending.kind));
      }
      delete runtime.pendingPromises[keys[index]];
    }
  }

  function __controller(_KDB, _labels, _notify) {
    var context = { _KDB: _KDB, labels: _labels, notify: _notify };
    return {
      destroy: destroy.bind(null, context),
      enqueueCopyableAction: enqueueCopyableAction.bind(null, context),
      enqueueInteractive: enqueueInteractive.bind(null, context),
      enqueuePassive: enqueuePassive.bind(null, context)
    };
  }

  return __controller;
});
