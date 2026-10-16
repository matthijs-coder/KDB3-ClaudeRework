define([
  "../config/defaults.js",
  "../avatar/createDragAvatar.js",
  "../avatar/moveDragAvatar.js",
  "../avatar/suppressNativeDragImage.js",
  "../dropboxes/resolveBoundDropbox.js",
  "./finishDragSession.js",
  "../../../../core/cognosHost/config/pageChromeSelectors.js",
  "../../kdbControl/state/selectors.js",
  "../../../../core/utils/readElementScale.js"
], function (_defaults, _createDragAvatar, _moveDragAvatar, _suppressNativeDragImage, _resolveBoundDropbox, _finishDragSession, _pageChrome, _selectors, _readElementScale) {
  "use strict";
  function __controller(_KDB, _event, _sourceInfo, _runtime, _dispatch) {
    const originalEvent = _event && (_event.originalEvent || _event);
    const sourceInfo = _sourceInfo || {};
    const draggedElementType = normalizeDraggedElementType(sourceInfo.draggedElementType);
    let session;
    let transferPayload;
    let avatarResult;
    try {
      if (!originalEvent || !originalEvent.dataTransfer || !_defaults.acceptedDraggedElementTypes[draggedElementType]) {
        return false;
      }
      session = buildSession(_KDB, originalEvent, sourceInfo, draggedElementType);
      avatarResult = _createDragAvatar(_runtime, sourceInfo.dragSourceEl || originalEvent.target, draggedElementType, session);
      session.copyId = avatarResult.copyId;
      transferPayload = cloneSerializable(session);
      addLayoutGrid(_KDB);
      _moveDragAvatar(_runtime, originalEvent, session);
      bindDocumentDragOver(_KDB, _runtime);
      writeTransferData(originalEvent.dataTransfer, transferPayload);
      _suppressNativeDragImage(originalEvent, _runtime);
      _dispatch({ type: "dragDrop/dragStarted", payload: transferPayload });
      return true;
    } catch (error) {
      console.error("[dragDrop.startDragSession] start failed", error);
      cleanupPartialStart(_runtime);
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
    return { copyId: null, defaultHeight: dimensions.height, defaultWidth: dimensions.width, draggedElementType: draggedElementType, dropboxId: dropboxEl && dropboxEl.id ? dropboxEl.id : null, offsetX: Math.max(0, Math.round(event.clientX - sourceRect.left)), offsetY: Math.max(0, Math.round(event.clientY - sourceRect.top)), originId: payload.originId || sourceInfo.originId || null, padKey: draggedElementType === "text" ? _defaults.fallbackPadKeys.text : _defaults.fallbackPadKeys.visualization, payload: cloneSerializable(payload), scaleX: scale.scaleX, scaleY: scale.scaleY, sourceKind: sourceInfo.sourceKind || _defaults.sourceKinds.unknown, startedAt: Date.now() };
  }
  function normalizeDraggedElementType(rawType) {
    const type = String(rawType || "").trim().toLowerCase();
    if (type === "live") {
      return "visualization";
    }
    return type;
  }
  function resolveDefaultDimensions(_KDB, draggedElementType) {
    try {
      const fallback = _defaults.defaultDimensions[draggedElementType] || _defaults.defaultDimensions.visualization;
      const snapshot = _KDB && _KDB.api && _KDB.api.kdbControl && typeof _KDB.api.kdbControl.getState === "function"
        ? _KDB.api.kdbControl.getState()
        : undefined;
      const isText = draggedElementType === "text";
      const defaults = isText
        ? _selectors.readCommentDefaults(snapshot)
        : _selectors.readVisualizationDefaults(snapshot);
      const widthPx = defaults.width == null || String(defaults.width).trim() === ""
        ? null
        : _KDB.utils.convertUnitToPx(defaults.width);
      const heightPx = defaults.height == null || String(defaults.height).trim() === ""
        ? null
        : _KDB.utils.convertUnitToPx(defaults.height);
      return {
        height: heightPx == null ? fallback.height : heightPx,
        width: widthPx == null ? fallback.width : widthPx
      };
    } catch (error) {
      console.error("[dragDrop.startDragSession] resolveDefaultDimensions failed", error);
      const fallback = _defaults.defaultDimensions[draggedElementType] || _defaults.defaultDimensions.visualization;
      return { height: fallback.height, width: fallback.width };
    }
  }
  function resolveInitialDropbox(_KDB, sourceEl) {
    const dropboxEl = _resolveBoundDropbox.resolveClosestBoundDropbox(_KDB, sourceEl);
    const dropboxes = _resolveBoundDropbox.readDashboardDropboxes(_KDB);
    return dropboxEl || dropboxes[0] || null;
  }

  function readPageTemplateSelector(_KDB) {
    const selectors = _KDB && _KDB.elements && _KDB.elements.selectors
      ? _KDB.elements.selectors.dragDrop
      : null;
    return selectors && selectors.pageTemplateSelector
      ? selectors.pageTemplateSelector
      : _pageChrome.dragDrop.strings.pageTemplateSelector;
  }

  function addLayoutGrid(_KDB) {
    const pageEls = document.querySelectorAll(readPageTemplateSelector(_KDB));
    let index;
    for (index = 0; index < pageEls.length; index += 1) {
      pageEls[index].classList.add(_defaults.classNames.layoutGrid);
    }
  }
  function bindDocumentDragOver(_KDB, _runtime) {
    const listeners = _runtime.listeners || {};
    const handler = onDocumentDragOver.bind(null, _KDB, _runtime);
    if (listeners.documentDragOver) {
      return;
    }
    document.addEventListener("dragover", handler);
    listeners.documentDragOver = { target: document, type: "dragover", handler: handler };
    _runtime.listeners = listeners;
  }
  function onDocumentDragOver(_KDB, _runtime, event) {
    const session = _KDB && _KDB.state && _KDB.state.dragDrop ? _KDB.state.dragDrop.session : null;
    if (_runtime && _runtime.domRefs && _runtime.domRefs.avatarEl && session) {
      _moveDragAvatar(_runtime, event, session);
    }
  }
  function writeTransferData(dataTransfer, transferPayload) {
    const serializedPayload = JSON.stringify(transferPayload);
    dataTransfer.effectAllowed = "copy";
    dataTransfer.setData("application/json", serializedPayload);
    dataTransfer.setData("text/plain", serializedPayload);
  }
  // Full session cleanup: the previous partial variant referenced an
  // undefined removeLayoutGrid (ReferenceError) and skipped marked-source /
  // drag-over cleanup, leaving invisible anchors + grid behind on any
  // failed start (structure-audit.md known gap, fixed 2026-07-13).
  function cleanupPartialStart(_runtime) {
    _finishDragSession(null, null, _runtime);
  }
  function cloneSerializable(value) {
    return JSON.parse(JSON.stringify(value || {}));
  }
  return __controller;
});
