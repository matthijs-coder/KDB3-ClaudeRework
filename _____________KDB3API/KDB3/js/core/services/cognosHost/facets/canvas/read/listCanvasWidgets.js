define([
  "../resolveCanvasHostApi.js",
  "../normalizeCanvasContentItems.js",
  "../flattenCanvasWidgetDescriptor.js",
  "../buildCanvasOutcome.js",
  "../config/canvasErrorCodes.js"
], function (
  _resolveCanvasHostApi,
  _normalizeCanvasContentItems,
  _flattenCanvasWidgetDescriptor,
  _buildCanvasOutcome,
  _canvasErrorCodes
) {
  "use strict";

  function listNow(_ctx) {
    var canvasApi;
    var items;
    var descriptors;
    var index;
    var descriptor;
    canvasApi = _resolveCanvasHostApi(_ctx._KDB);
    if (!canvasApi) {
      return _buildCanvasOutcome.buildFailed(_canvasErrorCodes.HOST_UNAVAILABLE, []);
    }
    if (typeof canvasApi.findCanvasContent !== "function") {
      return _buildCanvasOutcome.buildFailed(_canvasErrorCodes.HOST_CAPABILITY_MISSING, []);
    }
    items = _normalizeCanvasContentItems(canvasApi.findCanvasContent());
    descriptors = [];
    for (index = 0; index < items.length; index += 1) {
      descriptor = _flattenCanvasWidgetDescriptor(_ctx._KDB, items[index]);
      if (descriptor) {
        descriptors.push(descriptor);
      }
    }
    return _buildCanvasOutcome.buildOk(descriptors);
  }

  function isAborted(_input) {
    return !!(_input && _input.signal && _input.signal.aborted === true);
  }

  async function listAfterHostReady(_ctx, _input) {
    var canvasApi;
    if (_ctx.isDisposed()) {
      return _buildCanvasOutcome.buildDisposed();
    }
    if (isAborted(_input)) {
      return _buildCanvasOutcome.buildAborted("aborted");
    }
    canvasApi = _resolveCanvasHostApi(_ctx._KDB);
    if (!canvasApi) {
      return _buildCanvasOutcome.buildFailed(_canvasErrorCodes.HOST_UNAVAILABLE, []);
    }
    if (typeof canvasApi.getCanvasWhenReady !== "function") {
      return _buildCanvasOutcome.buildFailed(_canvasErrorCodes.HOST_CAPABILITY_MISSING, []);
    }
    try {
      await Promise.resolve(canvasApi.getCanvasWhenReady());
      if (_ctx.isDisposed()) {
        return _buildCanvasOutcome.buildDisposed();
      }
      if (isAborted(_input)) {
        return _buildCanvasOutcome.buildAborted("aborted");
      }
      return listNow(_ctx);
    } catch (error) {
      console.error("[cognosHost.canvas.listCanvasWidgets] waitUntilReady failed", error);
      return _buildCanvasOutcome.buildFailed(_canvasErrorCodes.INVENTORY_FAILED, [
        _buildCanvasOutcome.buildDiagnostic(_canvasErrorCodes.INVENTORY_FAILED, error && error.message)
      ]);
    }
  }

  // Default is synchronous best-effort, matching widgetBase/launchpad.
  // waitUntilReady is tableData's previous getCanvasWhenReady + list: the host
  // promise is discarded. Published whenCanvasReady is a separate wait op.
  function __controller(_ctx, _input) {
    var input = _input || {};
    if (_ctx.isDisposed()) {
      return _buildCanvasOutcome.buildDisposed();
    }
    try {
      if (input.waitUntilReady === true) {
        return listAfterHostReady(_ctx, input);
      }
      return listNow(_ctx);
    } catch (error) {
      console.error("[cognosHost.canvas.listCanvasWidgets] failed", error);
      return _buildCanvasOutcome.buildFailed(_canvasErrorCodes.INVENTORY_FAILED, [
        _buildCanvasOutcome.buildDiagnostic(_canvasErrorCodes.INVENTORY_FAILED, error && error.message)
      ]);
    }
  }

  return __controller;
});
