define([
  "../../../core/utils/kit/history.js",
  "../../../core/utils/kit/runtime.js",
  "../../launchpad/selectors.js",
  "./state.js",
  "./effects.js",
  "./history.js",
  "./launchpadRoute.js",
  "./view/placement.js",
  "./view/resolveWidgetShell.js"
], function (_historyKit, _runtimeKit, _launchpadSelectors, _state, _effects, _history, _launchpadRoute, _placement, _shellModule) {
  "use strict";

  const normalizeDispatchResult = _state.normalizeDispatchResult;
  const BASE_SHELL_ATTRIBUTES = ["data-kdb-claimed-run"];
  const TEARDOWN_METHODS = ["abort", "unsubscribe", "disconnect", "remove", "off"];

  function resolveWidgetEl(widgetElOrId) {
    if (widgetElOrId && widgetElOrId.nodeType === 1) {
      return widgetElOrId;
    }
    if (typeof document !== "undefined" && typeof document.getElementById === "function") {
      return document.getElementById(widgetElOrId);
    }
    return null;
  }

  function outcomeReady(outcome) {
    return !!(outcome && outcome.ok === true && outcome.data && outcome.data.ready === true);
  }

  // Owner waiters stay Promise<boolean>; the facet wait ops resolve Outcome<{ready}> and have no budget here.
  function waitForCanvasTransferReady(_KDB) {
    const canvasFacet = _effects.readHostFacet(_KDB, "canvasFacet");
    if (!canvasFacet || typeof canvasFacet.whenCanvasReady !== "function") {
      console.warn("[widgetBase.waitForCanvasTransferReady] canvasFacet.whenCanvasReady unavailable");
      return Promise.resolve(false);
    }
    return Promise.resolve(canvasFacet.whenCanvasReady()).then(outcomeReady).catch(function (err) {
      console.warn("[widgetBase.waitForCanvasTransferReady] canvas ready wait failed", err);
      return false;
    });
  }

  function waitForWidgetTransferReady(_KDB, widgetId) {
    if (!widgetId) {
      return Promise.resolve(false);
    }
    const canvasFacet = _effects.readHostFacet(_KDB, "canvasFacet");
    if (!canvasFacet || typeof canvasFacet.whenWidgetReady !== "function") {
      console.warn("[widgetBase.waitForWidgetTransferReady] canvasFacet.whenWidgetReady unavailable", widgetId);
      return Promise.resolve(false);
    }
    return Promise.resolve(canvasFacet.whenWidgetReady(widgetId)).then(outcomeReady).catch(function (err) {
      console.warn("[widgetBase.waitForWidgetTransferReady] widget ready wait failed", widgetId, err);
      return false;
    });
  }

  function teardownHandle(handle) {
    if (!handle || _runtimeKit.cancelTimer(handle)) {
      return;
    }
    if (typeof handle === "function") {
      handle();
      return;
    }
    const method = TEARDOWN_METHODS.find(function (name) { return typeof handle[name] === "function"; });
    if (method) {
      handle[method]();
    }
  }

  function teardownBucket(bucket) {
    Object.keys(bucket || {}).forEach(function (key) {
      teardownHandle(bucket[key]);
      delete bucket[key];
    });
  }

  function teardownWidgetState(_KDB, widgetId) {
    const byId = _KDB && _KDB.runtime && _KDB.runtime.widgetBase && _KDB.runtime.widgetBase.byId;
    const runtime = byId ? byId[widgetId] : null;
    if (runtime) {
      ["listeners", "subscriptions", "observers", "timers", "abortControllers"].forEach(function (name) {
        teardownBucket(runtime[name]);
      });
    }
  }

  function cleanWidgetForTransfer(_KDB, _widgetElOrId) {
    try {
      const widgetEl = resolveWidgetEl(_widgetElOrId);
      const widgetId = widgetEl ? widgetEl.id || widgetEl.getAttribute("id") : _widgetElOrId;
      if (widgetEl) {
        BASE_SHELL_ATTRIBUTES.forEach(function (attribute) { widgetEl.removeAttribute(attribute); });
      }
      return Promise.resolve().then(function () {
        if (widgetId) {
          _effects.dispatchWidgetVisDispose(_KDB, { widgetId: widgetId, reason: "transfer" });
          teardownWidgetState(_KDB, widgetId);
        }
      });
    } catch (err) {
      console.error("[widgetBase.cleanWidgetForTransfer] transfer clean failed", err);
      return Promise.resolve();
    }
  }

  function shouldCleanLiveForPad(padKey) {
    return padKey === "visualization" || padKey === "topN";
  }

  function shouldCleanTextForPad(descriptor, padKey) {
    return padKey === "text" && (descriptor.isTextWidget === true || descriptor.widgetType === "WIDGET.TEXT" || descriptor.kind === "text");
  }

  // Park = dispose point for every pad (adapter-contract §3.7), also when the route misses a clean path
  // (e.g. legacy frames whose kind was overwritten with "other"): a silent no-op without a widgetVis bucket.
  function cleanBeforeTransfer(_KDB, descriptor, route, shellEl) {
    const padKey = route && route.launchpadPad ? route.launchpadPad : null;
    if (shouldCleanTextForPad(descriptor, padKey) || shouldCleanLiveForPad(padKey)) {
      return cleanWidgetForTransfer(_KDB, shellEl);
    }
    _effects.dispatchWidgetVisDispose(_KDB, { widgetId: descriptor.widgetId, reason: "transfer" });
    return Promise.resolve();
  }

  function buildDescriptor(context, widgetId, payload) {
    const frame = context.selectors.readFrame(context._KDB, widgetId);
    return {
      widgetId: widgetId,
      // The frame kind is passed so routes without payload metadata (tab delete/move/slot moves) recognise a vis frame
      // instead of hitting the "other" fallback, which overwrites the frame kind and skips clean/dispose (E0a, 2026-08-20).
      kind: payload.kind || (frame && frame.kind ? frame.kind : null),
      widgetType: payload.widgetType || (frame && frame.kind === "text" ? "WIDGET.TEXT" : null),
      visualType: payload.visualType || payload.visType || payload.visualizationType || null,
      visualTitle: payload.visualTitle || payload.title || payload.visualName || payload.name || null,
      tabId: (frame && frame.tabId) || payload.tabId || null,
      tabHandle: frame && frame.tabHandle != null ? frame.tabHandle : 0,
      isStartupDiscovery: payload.reason === "startup",
      isTopNHelperClaim: payload.isTopNHelperClaim === true,
      isHistoryReplay: payload.isHistoryReplay === true,
      isLiveWidget: payload.isLiveWidget === true,
      isTextWidget: payload.isTextWidget === true,
      isHostWidget: _shellModule.isHostWidget(context._KDB, widgetId)
    };
  }

  function buildExplicitRoute(payload, descriptor) {
    return {
      shouldRoute: true,
      reasonCode: null,
      kind: descriptor.kind || null,
      role: descriptor.role || "primary",
      launchpadPad: payload.targetPad,
      tabId: payload.tabId || descriptor.tabId,
      tabHandle: descriptor.tabHandle || 0
    };
  }

  function buildFramePatch(route, slotMeta) {
    return {
      kind: route.kind,
      role: route.role,
      tabId: route.tabId,
      tabHandle: route.tabHandle,
      launchpadPad: route.launchpadPad,
      launchpadSlotKey: slotMeta.slotKey,
      lifecycle: "ready"
    };
  }

  function maybeCommitTransferHistory(context, payload, widgetId, frame, route, slotMeta) {
    const reason = payload.reason;
    if (payload.isHistoryReplay === true || reason === "startup" || reason === "rollback" || reason === "historyReplay") {
      return;
    }
    if (reason === "user" || reason === "contentRequest") {
      try {
        _historyKit.pushHistoryStep(context._KDB, {
          key: "widget_launchpadTransfer",
          timestamp: Date.now(),
          old: _history.buildTransferHistoryOldFrame(widgetId, frame, payload),
          new: _history.buildTransferHistoryNewFrame(widgetId, frame, route, slotMeta, payload)
        });
      } catch (err) {
        console.error("[widgetBase.routeToLaunchpad] history commit failed", { widgetId: widgetId, error: err });
      }
    }
  }

  function handleRouteToLaunchpad(_context, _action) {
    const payload = (_action && _action.payload) || {};
    const widgetId = _action.widgetId || payload.widgetId;
    const opSeq = _context.ensureOpSeq(widgetId, _action.opSeq);
    if (!widgetId) {
      return Promise.resolve(normalizeDispatchResult({ ok: false, errorCode: "WIDGET_BASE_WIDGET_ID_MISSING" }));
    }
    if (_context.isLaunchpadReady() !== true) {
      return Promise.resolve(normalizeDispatchResult({ ok: false, widgetId: widgetId, errorCode: "WIDGET_BASE_LAUNCHPAD_NOT_READY" }));
    }
    const descriptor = buildDescriptor(_context, widgetId, payload);
    const route = payload.targetPad ? buildExplicitRoute(payload, descriptor) : _launchpadRoute.resolveLaunchpadRoute(descriptor);
    if (route.shouldRoute === false) {
      return Promise.resolve(normalizeDispatchResult({ ok: true, skipped: true, widgetId: widgetId, reasonCode: route.reasonCode || "WIDGET_BASE_WIDGET_SKIPPED" }));
    }
    if (!route.tabId || !route.launchpadPad) {
      return Promise.resolve(normalizeDispatchResult({ ok: false, widgetId: widgetId, errorCode: "WIDGET_BASE_TAB_UNRESOLVED" }));
    }
    const slotMeta = _launchpadSelectors.readLaunchpadSlotMeta(_context._KDB, route.launchpadPad, route.tabId);
    if (!slotMeta) {
      return Promise.resolve(normalizeDispatchResult({ ok: false, widgetId: widgetId, errorCode: "WIDGET_BASE_LAUNCHPAD_TARGET_MISSING" }));
    }
    const preTransferFrame = _context.selectors.readFrame(_context._KDB, widgetId);
    _context.dispatchInternal({ type: _context.actionTypes.REGISTER_FRAME, payload: { widgetId: widgetId, frame: buildFramePatch(route, slotMeta) } });
    return waitForWidgetTransferReady(_context._KDB, widgetId).then(function () {
      const readyShellEl = _shellModule.resolveWidgetShell(_context._KDB, widgetId);
      if (!readyShellEl) {
        return normalizeDispatchResult({ ok: false, widgetId: widgetId, errorCode: "WIDGET_BASE_WIDGET_ID_MISSING" });
      }
      const historySourceFrame = _history.mergeDomLayoutIntoFrame(_context._KDB, preTransferFrame, readyShellEl);
      return cleanBeforeTransfer(_context._KDB, descriptor, route, readyShellEl).then(function () {
        const moveResult = _placement.moveWidgetToLaunchpad(_context._KDB, { widgetId: widgetId, shellEl: readyShellEl, slotMeta: slotMeta });
        if (moveResult.ok !== true) {
          return normalizeDispatchResult({ ok: false, widgetId: widgetId, opSeq: opSeq, errorCode: moveResult.errorCode, errorMessage: moveResult.errorMessage });
        }
        if (_context.isStaleOpSeq(widgetId, opSeq)) {
          return normalizeDispatchResult({ ok: false, stale: true, widgetId: widgetId, opSeq: opSeq });
        }
        _context.dispatchInternal({
          type: _context.actionTypes.ROUTE_TO_LAUNCHPAD_SUCCEEDED,
          widgetId: widgetId,
          payload: {
            launchpadPad: route.launchpadPad,
            launchpadSlotKey: slotMeta.slotKey,
            lastCanvasLayout: _history.resolveCanvasLayoutFromFrame(historySourceFrame)
          }
        });
        maybeCommitTransferHistory(_context, payload, widgetId, historySourceFrame, route, slotMeta);
        return normalizeDispatchResult({ ok: true, widgetId: widgetId, opSeq: opSeq, placement: "inLaunchpad" });
      });
    }).catch(function (err) {
      console.error("[widgetBase.routeToLaunchpad] transfer failed", { widgetId: widgetId, error: err });
      return normalizeDispatchResult({
        ok: false,
        widgetId: widgetId,
        opSeq: opSeq,
        errorCode: "WIDGET_BASE_LAUNCHPAD_APPEND_FAILED",
        errorMessage: "Pre-transfer cleanup failed."
      });
    });
  }

  function resolveTakeDropboxId(_KDB, payload, widgetId) {
    if (typeof payload.dropboxId === "string" && payload.dropboxId !== "") {
      return payload.dropboxId;
    }
    const tabId = payload.tabId;
    if (typeof tabId !== "string" || tabId === "") {
      return tabId;
    }
    try {
      const state = _KDB.api && _KDB.api.tabs && typeof _KDB.api.tabs.getState === "function" ? _KDB.api.tabs.getState() : null;
      const tabTargets = state && state.tabTargets ? state.tabTargets : {};
      const keys = Object.keys(tabTargets);
      for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
        const target = tabTargets[keys[keyIndex]];
        if (target && target.tabId === tabId && typeof target.pageId === "string" && target.pageId !== "" && target.pageId !== target.tabId) {
          return target.pageId;
        }
        if (target && target.pageId === tabId && target.pageId !== target.tabId) {
          return tabId;
        }
      }
      console.warn("[widgetBase.takeFromLaunchpad] no distinct page for tab; placing in tab container", { widgetId: widgetId, tabId: tabId });
      return tabId;
    } catch (err) {
      console.error("[widgetBase.takeFromLaunchpad] page resolve failed", { widgetId: widgetId, tabId: tabId }, err);
      return tabId;
    }
  }

  function resolveTakeFallbackDropboxId(payload, dropboxId) {
    const hasExplicitDropbox = typeof payload.dropboxId === "string" && payload.dropboxId !== "";
    if (!hasExplicitDropbox && typeof payload.tabId === "string" && payload.tabId !== "" && dropboxId !== payload.tabId) {
      return payload.tabId;
    }
    return null;
  }

  function maybeCommitTakeHistory(context, payload, widgetId) {
    if (payload.isHistoryReplay === true || payload.reason === "drop" || payload.reason === "historyReplay" || payload.reason === "restore") {
      return;
    }
    if (payload.reason === "user") {
      _historyKit.pushHistoryStep(context._KDB, {
        key: "widget_launchpadTransfer",
        timestamp: Date.now(),
        old: { widgetId: widgetId, placement: "inLaunchpad" },
        new: { widgetId: widgetId, placement: "onCanvas" }
      });
    }
  }

  function handleTakeFromLaunchpad(_context, _action) {
    const payload = (_action && _action.payload) || {};
    const widgetId = _action.widgetId;
    const opSeq = _context.ensureOpSeq(widgetId, _action.opSeq);
    if (!widgetId) {
      return Promise.resolve(normalizeDispatchResult({ ok: false, errorCode: "WIDGET_BASE_WIDGET_ID_MISSING" }));
    }
    const layout = _history.hasLayout(payload.targetLayout)
      ? _state.normalizeWidgetLayout(payload.targetLayout)
      : _state.normalizeWidgetLayout(_history.resolveCanvasLayoutFromFrame(_context.selectors.readFrame(_context._KDB, widgetId)));
    const dropboxId = resolveTakeDropboxId(_context._KDB, payload, widgetId);
    const placeResult = _placement.placeWidgetOnCanvas(_context._KDB, {
      widgetId: widgetId,
      layout: layout,
      dropboxId: dropboxId,
      fallbackDropboxId: resolveTakeFallbackDropboxId(payload, dropboxId)
    });
    if (placeResult.ok !== true) {
      return Promise.resolve(normalizeDispatchResult({ ok: false, widgetId: widgetId, opSeq: opSeq, errorCode: placeResult.errorCode, errorMessage: placeResult.errorMessage }));
    }
    return _effects.applyWidgetLayout(_context._KDB, widgetId, layout).then(function (layoutResult) {
      if (layoutResult.ok !== true) {
        return normalizeDispatchResult({ ok: false, widgetId: widgetId, opSeq: opSeq, errorCode: layoutResult.errorCode, errorMessage: layoutResult.errorMessage });
      }
      if (_context.isStaleOpSeq(widgetId, opSeq)) {
        return normalizeDispatchResult({ ok: false, stale: true, widgetId: widgetId, opSeq: opSeq });
      }
      const succeededPayload = { layout: layout };
      if (typeof payload.tabId === "string" && payload.tabId !== "") {
        succeededPayload.tabId = payload.tabId;
      }
      _context.dispatchInternal({ type: _context.actionTypes.PLACE_ON_CANVAS_SUCCEEDED, widgetId: widgetId, payload: succeededPayload });
      maybeCommitTakeHistory(_context, payload, widgetId);
      _effects.dispatchWidgetVisEnsureObservers(_context._KDB, { widgetId: widgetId, reason: payload.reason || null });
      return normalizeDispatchResult({ ok: true, widgetId: widgetId, opSeq: opSeq, placement: "onCanvas" });
    });
  }

  return {
    handleRouteToLaunchpad: handleRouteToLaunchpad,
    handleTakeFromLaunchpad: handleTakeFromLaunchpad,
    waitForCanvasTransferReady: waitForCanvasTransferReady
  };
});
