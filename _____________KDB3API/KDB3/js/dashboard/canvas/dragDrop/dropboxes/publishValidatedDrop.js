define([
  "../events/eventNames.js",
  "../session/parseTransferPayload.js",
  "./resolveBoundDropbox.js",
  "./resolveDropboxGeometry.js",
  "./validateDropIntent.js"
], function (_eventNames, _parseTransferPayload, _resolveBoundDropbox, _resolveDropboxGeometry, _validateDropIntent) {
  "use strict";
  function __controller(_KDB, _event, _runtime, _dispatch, _completeDrop) {
    const originalEvent = _event && (_event.originalEvent || _event);
    let didPublish = false;
    try {
      if (!originalEvent) {
        return false;
      }
      preventDefault(originalEvent);
      didPublish = publishDrop(_KDB, originalEvent, _runtime, _dispatch);
      return didPublish;
    } catch (error) {
      console.error("[dragDrop.publishValidatedDrop] publish failed", error);
      return false;
    } finally {
      if (typeof _completeDrop === "function") {
        _completeDrop(originalEvent);
      }
    }
  }
  function publishDrop(_KDB, originalEvent, _runtime, _dispatch) {
    const transferPayload = _parseTransferPayload(originalEvent);
    const dropboxEl = resolveDropboxEl(_KDB, originalEvent);
    const layout = resolveLayout(originalEvent, dropboxEl, transferPayload || {}, _runtime);
    const validation = _validateDropIntent(_KDB, dropboxEl, transferPayload, layout);
    clearActiveDropbox(_runtime, dropboxEl);
    removeTemporaryCopy(transferPayload, _runtime);
    _dispatch({ type: "dragDrop/dropValidated", payload: buildValidationPayload(validation, dropboxEl, transferPayload) });
    if (validation.isValid !== true || !_KDB.events || typeof _KDB.events.emit !== "function") {
      showValidationWarning(_KDB, validation.reason);
      return false;
    }
    markOriginDropped(transferPayload);
    _KDB.events.emit(_eventNames.DROP_VALIDATED, buildEventPayload(_KDB, dropboxEl, transferPayload, layout));
    return true;
  }
  function resolveDropboxEl(_KDB, event) {
    return _resolveBoundDropbox.resolveClosestBoundDropbox(_KDB, event ? event.target : null, {
      currentTarget: event ? event.currentTarget : null
    });
  }
  function resolveLayout(event, dropboxEl, transferPayload, _runtime) {
    const pointer = _resolveDropboxGeometry.resolvePointerWithinDropbox(event, dropboxEl);
    return { defaultHeight: Math.round(transferPayload.defaultHeight || 300), defaultWidth: Math.round(transferPayload.defaultWidth || 300), dragOffset: { x: Math.max(0, Math.round(transferPayload.offsetX || 0)), y: Math.max(0, Math.round(transferPayload.offsetY || 0)) }, helperTabIds: _runtime && Array.isArray(_runtime.helperTabIds) ? _runtime.helperTabIds.slice() : [], pointer: pointer || buildFallbackPointer(event), scaleX: Math.max(0, Math.round((transferPayload.scaleX || 1) * 1000) / 1000), scaleY: Math.max(0, Math.round((transferPayload.scaleY || 1) * 1000) / 1000) };
  }
  function buildFallbackPointer(event) {
    return { clientX: Math.round(event.clientX || 0), clientY: Math.round(event.clientY || 0), dropboxRectHeight: 0, dropboxRectWidth: 0, offsetX: null, offsetY: null };
  }
  function buildValidationPayload(validation, dropboxEl, transferPayload) {
    return { isValid: validation.isValid === true, reason: validation.reason || null, dropboxId: dropboxEl && dropboxEl.id ? dropboxEl.id : null, draggedElementType: transferPayload ? transferPayload.draggedElementType || null : null, validatedAt: Date.now() };
  }
  function buildEventPayload(_KDB, dropboxEl, transferPayload, layout) {
    return { draggedElementType: transferPayload.draggedElementType, dropboxId: dropboxEl.id || null, layout: stripValidationOnlyLayout(layout), originId: transferPayload.originId || null, padKey: transferPayload.padKey || null, payload: transferPayload.payload || {}, sourceKind: transferPayload.sourceKind || "unknown", startedAt: transferPayload.startedAt || Date.now(), tabId: resolveTabId(_KDB, dropboxEl) };
  }
  function stripValidationOnlyLayout(layout) {
    return { defaultHeight: layout.defaultHeight, defaultWidth: layout.defaultWidth, dragOffset: layout.dragOffset, pointer: layout.pointer, scaleX: layout.scaleX, scaleY: layout.scaleY };
  }
  function resolveTabId(_KDB, dropboxEl) {
    const tabEl = resolveTabElement(_KDB, dropboxEl);

    if (tabEl && tabEl.id) {
      return tabEl.id;
    }
    return _KDB && _KDB.state && _KDB.state.tabs ? _KDB.state.tabs.currentTabId || null : null;
  }
  function resolveTabElement(_KDB, dropboxEl) {
    var dragDrop = _KDB && _KDB.elements && _KDB.elements.selectors && _KDB.elements.selectors.dragDrop;
    var pageContainerSelector = dragDrop && dragDrop.pageContainerSelector;
    if (!dropboxEl) {
      return null;
    }
    if (dropboxEl.parentNode && dropboxEl.parentNode.id) {
      return dropboxEl.parentNode;
    }
    return dropboxEl.closest && pageContainerSelector ? dropboxEl.closest(pageContainerSelector) : null;
  }
  function clearActiveDropbox(_runtime, dropboxEl) {
    const activeDropboxEl = _runtime && _runtime.domRefs ? _runtime.domRefs.activeDropboxEl : null;
    const targetEl = activeDropboxEl || dropboxEl;
    if (targetEl && targetEl.classList) {
      targetEl.classList.remove("kdb_drag-over");
    }
    if (_runtime && _runtime.domRefs) {
      _runtime.domRefs.activeDropboxEl = null;
    }
  }
  function removeTemporaryCopy(transferPayload, _runtime) {
    const copyId = transferPayload ? transferPayload.copyId : null;
    const copyEl = copyId ? document.getElementById(copyId) : null;
    if (copyEl && copyEl.parentNode) {
      copyEl.parentNode.removeChild(copyEl);
    }
    if (_runtime && _runtime.domRefs) {
      _runtime.domRefs.sourceCopyEl = null;
    }
  }
  function markOriginDropped(transferPayload) {
    const originId = transferPayload ? transferPayload.originId : null;
    const originEl = originId ? document.getElementById(originId) : null;
    if (originEl && originEl.classList) {
      originEl.classList.add("dropped");
    }
  }
  function showValidationWarning(_KDB, reason) {
    const messageService = _KDB && _KDB.services ? _KDB.services.message : null;
    if (!messageService || typeof messageService.notify !== "function") {
      console.warn("[dragDrop.publishValidatedDrop] message service unavailable", reason || "unknown");
      return;
    }
    if (reason === "name-conflicts-with-filter") {
      messageService.notify({ message: "Der Widget-Name kollidiert mit einer vorhandenen Filterbezeichnung.", severity: "warning" });
    } else if (reason === "helper-tab") {
      messageService.notify({ message: "Auf dem Helper-Tab kann nicht gedroppt werden.", severity: "warning" });
    } else if (reason === "out-of-bounds") {
      messageService.notify({ message: "Das Widget passt an dieser Position nicht vollständig in den Canvas.", severity: "warning" });
    }
  }
  function preventDefault(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
  }
  return __controller;
});
