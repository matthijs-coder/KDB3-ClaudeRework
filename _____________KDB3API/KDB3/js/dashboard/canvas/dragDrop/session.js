define([
  "./config.js",
  "./avatar.js",
  "./selectors.js",
  "./state.js",
  "./dropboxes/hover.js",
  "./dropboxes/lookup.js",
  "../kdbControl/state/selectors.js",
  "../../../core/utils/readElementScale.js",
  "../../../core/utils/kit/data.js",
  "../../../core/utils/kit/runtime.js"
], function (_config, _avatar, _selectors, _state, _hover, _lookup, _kdbControlSelectors, _readElementScale, _data, _rt) {
  "use strict";

  // Boundary: called from the dragstart handlers of the toolbox and the metrics tree (api.dragDrop.startDrag).
  function startDragSession(_KDB, event, sourceInfo, rt, dispatch) {
    const dragEvent = event && (event.originalEvent || event);
    const source = sourceInfo || {};
    const draggedElementType = normalizeDraggedElementType(source.draggedElementType);

    try {
      if (!dragEvent || !dragEvent.dataTransfer || !_config.acceptedDraggedElementTypes[draggedElementType]) {
        return false;
      }
      const session = buildSession(_KDB, dragEvent, source, draggedElementType);
      const avatarResult = _avatar.createDragAvatar(rt, source.dragSourceEl || dragEvent.target, draggedElementType, session);
      session.copyId = avatarResult.copyId;
      const transferPayload = _data.cloneJson(session);
      setLayoutGrid(_KDB, true);
      _avatar.moveDragAvatar(rt, dragEvent, session);
      bindDocumentDragOver(_KDB, rt);
      writeTransferData(dragEvent.dataTransfer, transferPayload);
      _avatar.suppressNativeDragImage(dragEvent, rt);
      dispatch({ type: _state.ACTION_TYPES.DRAG_STARTED, payload: transferPayload });
      return true;
    } catch (error) {
      console.error("[dragDrop.startDragSession] start failed", error);
      finishDragSession(null, null, rt);
      return false;
    }
  }

  function buildSession(_KDB, event, sourceInfo, draggedElementType) {
    const payload = sourceInfo.payload || {};
    const sourceEl = sourceInfo.dragSourceEl || event.target;
    const dropboxEl = resolveInitialDropbox(_KDB, sourceEl);
    const scale = _readElementScale(dropboxEl);
    const dimensions = resolveDefaultDimensions(_KDB, draggedElementType);
    const sourceRect = sourceEl && typeof sourceEl.getBoundingClientRect === "function"
      ? sourceEl.getBoundingClientRect()
      : { left: event.clientX, top: event.clientY };

    return {
      copyId: null,
      defaultHeight: dimensions.height,
      defaultWidth: dimensions.width,
      draggedElementType: draggedElementType,
      dropboxId: dropboxEl && dropboxEl.id ? dropboxEl.id : null,
      offsetX: Math.max(0, Math.round(event.clientX - sourceRect.left)),
      offsetY: Math.max(0, Math.round(event.clientY - sourceRect.top)),
      originId: payload.originId || sourceInfo.originId || null,
      padKey: draggedElementType === "text" ? _config.fallbackPadKeys.text : _config.fallbackPadKeys.visualization,
      payload: _data.cloneJson(payload),
      scaleX: scale.scaleX,
      scaleY: scale.scaleY,
      sourceKind: sourceInfo.sourceKind || _config.sourceKinds.unknown,
      startedAt: Date.now()
    };
  }

  function normalizeDraggedElementType(rawType) {
    const type = String(rawType || "").trim().toLowerCase();

    return type === "live" ? "visualization" : type;
  }

  function resolveDefaultDimensions(_KDB, draggedElementType) {
    const fallback = _config.defaultDimensions[draggedElementType] || _config.defaultDimensions.visualization;

    try {
      const kdbControlApi = _KDB && _KDB.api ? _KDB.api.kdbControl : null;
      const snapshot = kdbControlApi && typeof kdbControlApi.getState === "function" ? kdbControlApi.getState() : undefined;
      const defaults = draggedElementType === "text"
        ? _kdbControlSelectors.readCommentDefaults(snapshot)
        : _kdbControlSelectors.readVisualizationDefaults(snapshot);
      const widthPx = convertDefaultToPx(_KDB, defaults.width);
      const heightPx = convertDefaultToPx(_KDB, defaults.height);

      return {
        height: heightPx == null ? fallback.height : heightPx,
        width: widthPx == null ? fallback.width : widthPx
      };
    } catch (error) {
      console.error("[dragDrop.startDragSession] resolveDefaultDimensions failed", error);
      return { height: fallback.height, width: fallback.width };
    }
  }

  function convertDefaultToPx(_KDB, value) {
    return value == null || String(value).trim() === "" ? null : _KDB.utils.convertUnitToPx(value);
  }

  function resolveInitialDropbox(_KDB, sourceEl) {
    return _lookup.resolveClosestBoundDropbox(_KDB, sourceEl) || _lookup.readDashboardDropboxes(_KDB)[0] || null;
  }

  function setLayoutGrid(_KDB, isEnabled) {
    const pageEls = document.querySelectorAll(_lookup.readDragDropSelector(_KDB, "pageTemplateSelector"));

    Array.prototype.forEach.call(pageEls, function (pageEl) {
      pageEl.classList.toggle(_config.classNames.layoutGrid, isEnabled);
    });
  }

  function bindDocumentDragOver(_KDB, rt) {
    if (rt.listeners.documentDragOver) {
      return;
    }
    _rt.addListener(rt.listeners, "documentDragOver", document, "dragover", function (event) {
      const session = _selectors.readActiveSession(_KDB);

      if (rt.domRefs.avatarEl && session) {
        _avatar.moveDragAvatar(rt, event, session);
      }
    });
  }

  function removeDocumentDragOver(rt) {
    const record = rt.listeners.documentDragOver;

    if (record) {
      record.target.removeEventListener(record.type, record.handler, record.options);
      delete rt.listeners.documentDragOver;
    }
  }

  function writeTransferData(dataTransfer, transferPayload) {
    const serializedPayload = JSON.stringify(transferPayload);

    dataTransfer.effectAllowed = "copy";
    dataTransfer.setData("application/json", serializedPayload);
    dataTransfer.setData("text/plain", serializedPayload);
  }

  // Idempotent session cleanup. Also used for a failed start (no _KDB: grid selector falls back to the catalog)
  // and during destroy; never throws so that the remaining teardown still runs.
  function finishDragSession(_KDB, _event, rt) {
    try {
      _avatar.removeRuntimeElement(rt, "avatarEl");
      _hover.clearActiveDropbox(rt);
      clearMarkedSources(rt);
      setLayoutGrid(_KDB, false);
      removeDocumentDragOver(rt);
      _avatar.removeRuntimeElement(rt, "sourceCopyEl");
      _avatar.removeRuntimeElement(rt, "nativeDragImageEl");
      _rt.clearTimer(rt.timers, "nativeDragImage");
      rt.sourceRuntime = null;
      return true;
    } catch (error) {
      console.error("[dragDrop.finishDragSession] cleanup failed", error);
      return false;
    }
  }

  function clearMarkedSources(rt) {
    const markedEls = Array.isArray(rt.domRefs.sourceMarkedEls) ? rt.domRefs.sourceMarkedEls : [];

    markedEls.forEach(function (markedEl) {
      if (markedEl && markedEl.classList) {
        markedEl.classList.remove(_config.classNames.activeSource);
      }
    });
    rt.domRefs.sourceMarkedEls = [];
  }

  // The drag payload travels as JSON in dataTransfer; anything else is not ours.
  function parseTransferPayload(event) {
    const dragEvent = event && (event.originalEvent || event);
    const dataTransfer = dragEvent ? dragEvent.dataTransfer : null;

    if (!dataTransfer || typeof dataTransfer.getData !== "function") {
      return null;
    }
    return parseJson(dataTransfer.getData("application/json")) || parseJson(dataTransfer.getData("text/plain"));
  }

  function parseJson(rawValue) {
    if (!rawValue) {
      return null;
    }
    try {
      return JSON.parse(rawValue);
    } catch (error) {
      return null;
    }
  }

  return {
    finishDragSession: finishDragSession,
    parseTransferPayload: parseTransferPayload,
    startDragSession: startDragSession
  };
});
