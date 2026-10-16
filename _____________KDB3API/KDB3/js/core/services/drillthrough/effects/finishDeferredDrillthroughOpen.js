define([
  "../buildDrillthroughUrl.js",
  "./writeDrillthroughWaitDocument.js"
], function (_buildDrillthroughUrl, _writeDrillthroughWaitDocument) {
  "use strict";

  function labelText(_labels, _key) {
    var value = _labels && _labels[_key];
    return typeof value === "string" ? value : "";
  }

  function isHandleClosed(_ctx) {
    return !_ctx || !_ctx.handle || _ctx.handle.closed === true;
  }

  function closeIfOpen(_handle) {
    if (_handle && _handle.closed !== true) {
      _handle.close();
    }
  }

  function writeBody(_ctx, _key) {
    if (isHandleClosed(_ctx)) {
      return;
    }
    _writeDrillthroughWaitDocument.replaceDrillthroughWaitBody(_ctx.handle, _ctx.labels, labelText(_ctx.labels, _key));
  }

  function navigateReady(_ctx, _url) {
    try {
      if (isHandleClosed(_ctx)) {
        return;
      }
      _ctx.handle.location.replace(_url);
    } catch (error) {
      console.error("[drillthrough.finishDeferredDrillthroughOpen]", error);
      try {
        writeBody(_ctx, "loadFailedBody");
      } catch (writeError) {
        console.error("[drillthrough.finishDeferredDrillthroughOpen]", writeError);
      }
    }
  }

  function showRebuildFailure(_ctx, _built) {
    var key = _built && _built.errorCode === "DRILLTHROUGH_ORG_TREE_MISSING" ? "treeMissingBody" : "loadFailedBody";
    writeBody(_ctx, key);
  }

  function onFulfilled(_ctx, _value) {
    var record;
    var built;
    try {
      if (isHandleClosed(_ctx)) {
        return;
      }
      record = _ctx.deps.readTableState([{ tableName: _ctx.tableKey }]);
      if (!record || record.lifecycle !== "ready") {
        closeIfOpen(_ctx.handle);
        return;
      }
      built = _buildDrillthroughUrl(_ctx.spec, _ctx.deps);
      if (built && built.ok === true) {
        navigateReady(_ctx, built.url);
        return;
      }
      showRebuildFailure(_ctx, built);
    } catch (error) {
      console.error("[drillthrough.finishDeferredDrillthroughOpen]", error);
    }
  }

  function onRejected(_ctx, _error) {
    try {
      console.error("[drillthrough.finishDeferredDrillthroughOpen]", _error);
      if (isHandleClosed(_ctx)) {
        return;
      }
      writeBody(_ctx, "loadFailedBody");
    } catch (error) {
      console.error("[drillthrough.finishDeferredDrillthroughOpen]", error);
    }
  }

  function finishDeferredDrillthroughOpen(_ctx) {
    try {
      _ctx.pending.then(onFulfilled.bind(null, _ctx), onRejected.bind(null, _ctx));
    } catch (error) {
      console.error("[drillthrough.finishDeferredDrillthroughOpen]", error);
      throw error;
    }
  }

  return finishDeferredDrillthroughOpen;
});
