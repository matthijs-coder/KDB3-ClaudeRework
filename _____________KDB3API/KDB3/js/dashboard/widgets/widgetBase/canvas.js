define([
  "../../../core/utils/kit/history.js",
  "../../../core/utils/kit/runtime.js",
  "../../launchpad/state/selectors.js",
  "./state.js",
  "./effects.js",
  "./launchpadRoute.js",
  "./view/placement.js",
  "./view/resolveWidgetShell.js",
  "./interaction/move.js",
  "./interaction/resize.js"
], function (
  _historyKit, _runtimeKit, _launchpadSelectors, _state, _effects, _launchpadRoute, _placement, _shellModule,
  _moveInteraction, _resizeInteraction
) {
  "use strict";

  const normalizeDispatchResult = _state.normalizeDispatchResult;

  function cleanupWidgetRuntime(_KDB, _widgetId) {
    const runtime = _KDB.runtime && _KDB.runtime.widgetBase ? _KDB.runtime.widgetBase : null;
    if (!runtime || !_widgetId) {
      return { ok: false };
    }
    try {
      const widgetRuntime = runtime.byId && runtime.byId[_widgetId] ? runtime.byId[_widgetId] : null;
      if (widgetRuntime) {
        _moveInteraction.teardownMoveInteraction(_KDB, _widgetId);
        _resizeInteraction.teardownResizeInteraction(_KDB, _widgetId);
        _runtimeKit.disposeRuntimeBuckets(widgetRuntime).forEach(function (err) {
          console.error("[widgetBase.cleanupWidgetRuntime] release failed", _widgetId, err);
        });
        widgetRuntime.domRefs = { shellEl: null, canvasParentEl: null, launchpadSlotEl: null };
      }
      if (runtime.byId) {
        delete runtime.byId[_widgetId];
      }
      return { ok: true };
    } catch (err) {
      console.error("[widgetBase.cleanupWidgetRuntime] cleanup failed", _widgetId, err);
      return { ok: false };
    }
  }

  function buildHistoryFrame(frame) {
    return frame ? {
      widgetId: frame.widgetId,
      placement: frame.placement,
      layout: frame.layout,
      launchpadPad: frame.launchpadPad,
      launchpadSlotKey: frame.launchpadSlotKey,
      tabId: frame.tabId,
      kind: frame.kind
    } : null;
  }

  function buildReplayDropRequest(dropRequest) {
    return {
      draggedElementType: dropRequest.draggedElementType || null,
      dropboxId: dropRequest.dropboxId || null,
      layout: dropRequest.layout || null,
      originId: dropRequest.originId || null,
      padKey: dropRequest.padKey || null,
      payload: dropRequest.payload || {},
      sourceKind: dropRequest.sourceKind || "unknown",
      startedAt: dropRequest.startedAt || null,
      tabId: dropRequest.tabId || null
    };
  }

  function buildDropHistoryFrame(widgetId, route, layout, dropRequest) {
    return {
      widgetId: widgetId,
      placement: "onCanvas",
      layout: layout,
      kind: route.kind,
      launchpadPad: route.launchpadPad,
      tabId: route.tabId,
      dropboxId: dropRequest.dropboxId || null,
      dropRequest: buildReplayDropRequest(dropRequest)
    };
  }

  function storeWidgetRuntime(_KDB, widgetId, shellEl, opSeq) {
    const runtime = _KDB.runtime.widgetBase;
    runtime.byId = runtime.byId || {};
    runtime.byId[widgetId] = runtime.byId[widgetId] || {};
    runtime.byId[widgetId].domRefs = { shellEl: shellEl, canvasParentEl: shellEl.parentNode, launchpadSlotEl: null };
    runtime.byId[widgetId].opSeq = opSeq;
  }

  function rollbackWidgetBaseOperation(_context, _rollbackRequest) {
    const request = _rollbackRequest || {};
    const widgetId = request.widgetId;
    _effects.dispatchWidgetVisDispose(_context._KDB, { widgetId: widgetId, reason: "rollback" });
    cleanupWidgetRuntime(_context._KDB, widgetId);
    return Promise.resolve(_placement.moveWidgetToLaunchpad(_context._KDB, {
      widgetId: widgetId,
      shellEl: request.shellEl,
      slotMeta: request.slotMeta,
      slotEl: request.slotEl
    })).then(function (moveResult) {
      if (moveResult.ok !== true) {
        _context.dispatchInternal({
          type: _context.actionTypes.ERROR_RECORDED,
          widgetId: widgetId,
          payload: { errorCode: "WIDGET_BASE_ROLLBACK_FAILED", errorMessage: moveResult.errorMessage || "Rollback route-back failed." }
        });
        return normalizeDispatchResult({ ok: false, rolledBack: false, widgetId: widgetId, errorCode: "WIDGET_BASE_ROLLBACK_FAILED", errorMessage: moveResult.errorMessage });
      }
      if (request.previousFrame) {
        _context.dispatchInternal({ type: _context.actionTypes.REGISTER_FRAME, payload: { widgetId: widgetId, frame: request.previousFrame } });
      } else {
        _context.dispatchInternal({
          type: _context.actionTypes.ROUTE_TO_LAUNCHPAD_SUCCEEDED,
          widgetId: widgetId,
          payload: {
            launchpadPad: request.launchpadPad,
            launchpadSlotKey: request.launchpadSlotKey,
            lastCanvasLayout: request.lastCanvasLayout || null
          }
        });
      }
      return normalizeDispatchResult({ ok: false, rolledBack: true, widgetId: widgetId, errorCode: request.errorCode || "WIDGET_BASE_DROP_FAILED" });
    });
  }

  function buildDropDescriptor(context, dropRequest, widgetId) {
    const payload = dropRequest.payload || {};
    return {
      widgetId: widgetId,
      draggedElementType: dropRequest.draggedElementType,
      sourceKind: dropRequest.sourceKind || null,
      visualType: payload.visualType || payload.visType || payload.visualizationType || null,
      visualTitle: payload.visualTitle || payload.title || payload.visualName || payload.name || payload.display || payload.langtext || null,
      widgetType: dropRequest.draggedElementType === "text" || dropRequest.sourceKind === "toolboxTextButton" ? "WIDGET.TEXT" : null,
      tabId: dropRequest.tabId,
      tabHandle: 0,
      isHostWidget: _shellModule.isHostWidget(context._KDB, widgetId)
    };
  }

  function rollbackDrop(context, widgetId, claim, route, previousFrame, errorCode) {
    if (route.kind === "text" || route.kind === "vis") {
      _effects.dispatchWidgetSettingsCleanup(context._KDB, { widgetId: widgetId });
    }
    const slotMeta = _launchpadSelectors.readLaunchpadSlotMeta(context._KDB, route.launchpadPad, route.tabId);
    return rollbackWidgetBaseOperation(context, {
      widgetId: widgetId,
      shellEl: claim.shellEl,
      slotMeta: slotMeta,
      launchpadPad: route.launchpadPad,
      launchpadSlotKey: slotMeta ? slotMeta.slotKey : null,
      lastCanvasLayout: previousFrame ? previousFrame.lastCanvasLayout : null,
      previousFrame: previousFrame,
      errorCode: errorCode || "WIDGET_BASE_DROP_FAILED"
    });
  }

  function finalizeDrop(context, action, dropRequest, widgetId, opSeq, route, layout, previousFrame, claim) {
    if (context.isStaleOpSeq(widgetId, opSeq)) {
      return Promise.resolve(normalizeDispatchResult({ ok: false, stale: true, widgetId: widgetId, opSeq: opSeq }));
    }
    const succeededPayload = { layout: layout };
    if (route.tabId != null && String(route.tabId) !== "") {
      succeededPayload.tabId = String(route.tabId);
    }
    context.dispatchInternal({ type: context.actionTypes.PLACE_ON_CANVAS_SUCCEEDED, widgetId: widgetId, payload: succeededPayload });
    if (((action && action.payload) || {}).isHistoryReplay !== true) {
      _historyKit.pushHistoryStep(context._KDB, {
        key: "widget_canvasDrop",
        timestamp: Date.now(),
        old: buildHistoryFrame(previousFrame),
        new: buildDropHistoryFrame(widgetId, route, layout, dropRequest)
      });
    }
    storeWidgetRuntime(context._KDB, widgetId, claim.shellEl, opSeq);
    return Promise.resolve(normalizeDispatchResult({ ok: true, widgetId: widgetId, opSeq: opSeq, placement: "onCanvas" }));
  }

  function startWidgetSettingsAfterContentCreate(context, widgetId, route, claim, layout, dropRequest, dropResult) {
    if (!dropResult || dropResult.ok !== true || (route.kind !== "text" && route.kind !== "vis")) {
      return;
    }
    _effects.dispatchWidgetSettingsPlaceControls(context._KDB, {
      widgetId: widgetId,
      kind: route.kind,
      shellEl: claim.shellEl,
      layout: layout,
      dropRequest: dropRequest
    });
  }

  function runDropWorkflow(context, action, dropRequest, claim) {
    const widgetId = claim.widgetId;
    const opSeq = context.ensureOpSeq(widgetId, action.opSeq);
    const route = _launchpadRoute.resolveLaunchpadRoute(buildDropDescriptor(context, dropRequest, widgetId));
    if (route.shouldRoute === false) {
      return Promise.resolve(normalizeDispatchResult({ ok: true, skipped: true, widgetId: widgetId, reasonCode: route.reasonCode }));
    }
    const previousFrame = context.selectors.readFrame(context._KDB, widgetId);
    context.dispatchInternal({
      type: context.actionTypes.REGISTER_FRAME,
      payload: { widgetId: widgetId, frame: { kind: route.kind, role: route.role, tabId: route.tabId, tabHandle: route.tabHandle, lifecycle: "loading" } }
    });
    context.dispatchInternal({ type: context.actionTypes.MARK_PENDING, widgetId: widgetId, payload: { kind: "dropCreate", opSeq: opSeq, lifecycle: "loading" } });
    const placeResult = _placement.placeWidgetOnCanvas(context._KDB, {
      widgetId: widgetId,
      shellEl: claim.shellEl,
      dropboxId: dropRequest.dropboxId,
      dropLayout: dropRequest.layout,
      draggedElementType: dropRequest.draggedElementType
    });
    if (placeResult.ok !== true) {
      return rollbackDrop(context, widgetId, claim, route, previousFrame, placeResult.errorCode);
    }
    return _effects.applyWidgetLayout(context._KDB, widgetId, placeResult.layout).then(function (layoutResult) {
      if (layoutResult.ok !== true) {
        return rollbackDrop(context, widgetId, claim, route, previousFrame, layoutResult.errorCode);
      }
      if (route.kind === "other" || route.kind === "topN") {
        return finalizeDrop(context, action, dropRequest, widgetId, opSeq, route, placeResult.layout, previousFrame, claim);
      }
      return _effects.dispatchContentCreate(context._KDB, {
        kind: route.kind,
        widgetId: widgetId,
        payload: { dropRequest: dropRequest, payload: dropRequest.payload || {}, sourceKind: dropRequest.sourceKind || "unknown" }
      }).then(function (contentResult) {
        if (contentResult.ok !== true) {
          return rollbackDrop(context, widgetId, claim, route, previousFrame, contentResult.errorCode);
        }
        return finalizeDrop(context, action, dropRequest, widgetId, opSeq, route, placeResult.layout, previousFrame, claim).then(function (dropResult) {
          startWidgetSettingsAfterContentCreate(context, widgetId, route, claim, placeResult.layout, dropRequest, dropResult);
          return dropResult;
        });
      });
    });
  }

  function handleDropCreate(_context, _action) {
    const payload = (_action && _action.payload) || {};
    const dropRequest = payload.dropRequest || {};
    if (_action.widgetId && payload.widgetId && _action.widgetId !== payload.widgetId) {
      return Promise.resolve(normalizeDispatchResult({ ok: false, errorCode: "WIDGET_BASE_WIDGET_ID_CONFLICT" }));
    }
    return _launchpadRoute.resolveClaimedWidget(_context, dropRequest).then(function (claim) {
      if (claim.ok !== true) {
        return normalizeDispatchResult(claim);
      }
      return runDropWorkflow(_context, _action, dropRequest, claim);
    });
  }

  function detachShell(_KDB, widgetId) {
    const shellEl = _shellModule.resolveWidgetShell(_KDB, widgetId);
    if (shellEl && shellEl.parentNode) {
      shellEl.parentNode.removeChild(shellEl);
    }
  }

  // Text widgets and TopN helpers never own a helper claim; an unknown frame is cleaned up, which is a no-op.
  function ownsTopNClaim(_frame) {
    return !_frame || (_frame.kind === "vis" && _frame.role !== "topNHelper");
  }

  function handleRemove(_context, _action) {
    const payload = (_action && _action.payload) || {};
    const widgetId = _action.widgetId;
    if (!widgetId) {
      return Promise.resolve(normalizeDispatchResult({ ok: false, errorCode: "WIDGET_BASE_WIDGET_ID_MISSING" }));
    }
    _effects.dispatchWidgetVisDispose(_context._KDB, { widgetId: widgetId, reason: "remove" });
    _effects.dispatchWidgetSettingsCleanup(_context._KDB, { widgetId: widgetId });
    detachShell(_context._KDB, widgetId);
    cleanupWidgetRuntime(_context._KDB, widgetId);
    const frame = _context.selectors.readFrame(_context._KDB, widgetId);
    _context.dispatchInternal({ type: _context.actionTypes.REMOVE_SUCCEEDED, widgetId: widgetId });
    if (ownsTopNClaim(frame)) {
      _effects.dispatchWidgetTopNCleanup(_context._KDB, { widgetId: widgetId, reason: payload.reason === "destroy" ? "destroy" : "remove" });
    }
    if (payload.reason === "user" && payload.isHistoryReplay !== true) {
      _historyKit.pushHistoryStep(_context._KDB, {
        key: "widget_removed",
        timestamp: Date.now(),
        old: { widgetId: widgetId, placement: "onCanvas" },
        new: { widgetId: widgetId, placement: "removed" }
      });
    }
    return Promise.resolve(normalizeDispatchResult({ ok: true, widgetId: widgetId, placement: "removed" }));
  }

  function handleSetColour(_context, _action) {
    const payload = (_action && _action.payload) || {};
    const widgetId = _action.widgetId;
    const opSeq = _context.ensureOpSeq(widgetId, _action.opSeq);
    const applyInput = {
      optionValue: payload.optionValue != null ? payload.optionValue : payload.toColour,
      toColour: payload.toColour,
      widgetType: payload.widgetType || payload.kind || null,
      source: payload.source || null,
      isHistoryReplay: payload.isHistoryReplay === true
    };
    return _effects.applyWidgetColour(_context._KDB, widgetId, applyInput).then(function (colourResult) {
      if (colourResult.ok !== true) {
        return normalizeDispatchResult({ ok: false, widgetId: widgetId, opSeq: opSeq, errorCode: colourResult.errorCode, errorMessage: colourResult.errorMessage });
      }
      if (_context.isStaleOpSeq(widgetId, opSeq)) {
        return normalizeDispatchResult({ ok: false, stale: true, widgetId: widgetId, opSeq: opSeq });
      }
      _context.dispatchInternal({
        type: _context.actionTypes.REGISTER_FRAME,
        payload: { widgetId: widgetId, frame: { colour: colourResult.colour, lifecycle: "ready" } }
      });
      return normalizeDispatchResult({ ok: true, widgetId: widgetId, opSeq: opSeq, colour: colourResult.colour });
    });
  }

  function layoutHistoryFrame(widgetId, layout) {
    const normalized = _state.normalizeWidgetLayout(layout);
    return { widgetId: widgetId, x: normalized.x, y: normalized.y, width: normalized.width, height: normalized.height };
  }

  function handleMoveOrResize(_context, _action) {
    const payload = (_action && _action.payload) || {};
    const widgetId = _action.widgetId;
    if (payload.isFinal !== true) {
      return Promise.resolve(normalizeDispatchResult({ ok: true, widgetId: widgetId, skipped: true, reasonCode: "NON_FINAL_PREVIEW" }));
    }
    const opSeq = _context.ensureOpSeq(widgetId, _action.opSeq);
    const layout = _state.normalizeWidgetLayout(payload.toLayout);
    return _effects.applyWidgetLayout(_context._KDB, widgetId, layout).then(function (layoutResult) {
      if (layoutResult.ok !== true) {
        return normalizeDispatchResult({ ok: false, widgetId: widgetId, opSeq: opSeq, errorCode: layoutResult.errorCode, errorMessage: layoutResult.errorMessage });
      }
      if (_context.isStaleOpSeq(widgetId, opSeq)) {
        return normalizeDispatchResult({ ok: false, stale: true, widgetId: widgetId, opSeq: opSeq });
      }
      _context.dispatchInternal({ type: _context.actionTypes.PLACE_ON_CANVAS_SUCCEEDED, widgetId: widgetId, payload: { layout: layout } });
      if (payload.isHistoryReplay !== true) {
        _historyKit.pushHistoryStep(_context._KDB, {
          key: _action.type === "widgetBase/resize" ? "widget_layoutResize" : "widget_layoutMove",
          timestamp: Date.now(),
          old: layoutHistoryFrame(widgetId, payload.fromLayout),
          new: layoutHistoryFrame(widgetId, layout)
        });
      }
      return normalizeDispatchResult({ ok: true, widgetId: widgetId, opSeq: opSeq, placement: "onCanvas" });
    });
  }

  function handleMoveMode(_context, _action) {
    const payload = (_action && _action.payload) || {};
    const widgetId = _action.widgetId;
    const mode = _action.type === "widgetBase/enableMove"
      ? _moveInteraction.normalizeMoveMode(payload.mode || "oneShot")
      : _moveInteraction.normalizeMoveMode(payload.mode);
    const result = _moveInteraction.setMoveMode(_context._KDB, widgetId, mode, payload);
    return Promise.resolve(normalizeDispatchResult(Object.assign({ widgetId: widgetId }, result)));
  }

  function handleResizeToggle(_context, _action) {
    const payload = (_action && _action.payload) || {};
    const widgetId = _action.widgetId;
    const widgetType = payload.widgetType === "text" ? "text" : "live";
    const result = payload.enabled !== false
      ? _resizeInteraction.setResizeEnabled(_context._KDB, widgetId, true, widgetType)
      : _resizeInteraction.disableResizeMode(_context._KDB, widgetId);
    return Promise.resolve(normalizeDispatchResult(Object.assign({ widgetId: widgetId }, result)));
  }

  return {
    cleanupWidgetRuntime: cleanupWidgetRuntime,
    handleDropCreate: handleDropCreate,
    handleRemove: handleRemove,
    handleSetColour: handleSetColour,
    handleMoveOrResize: handleMoveOrResize,
    handleMoveMode: handleMoveMode,
    handleResizeToggle: handleResizeToggle
  };
});
