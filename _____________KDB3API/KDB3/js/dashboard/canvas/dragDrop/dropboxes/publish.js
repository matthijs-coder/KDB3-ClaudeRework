define([
  "../config.js",
  "../events.js",
  "../session.js",
  "../state.js",
  "./geometry.js",
  "./hover.js",
  "./lookup.js",
  "./validate.js"
], function (_config, _events, _session, _state, _geometry, _hover, _lookup, _validateDropIntent) {
  "use strict";

  // Boundary: drop handler of a dropbox. The drag session is always finished, also when publishing fails.
  function publishValidatedDrop(_KDB, event, rt, dispatch, completeDrop) {
    const dropEvent = event && (event.originalEvent || event);

    try {
      if (!dropEvent) {
        return false;
      }
      if (typeof dropEvent.preventDefault === "function") {
        dropEvent.preventDefault();
      }
      return publishDrop(_KDB, dropEvent, rt, dispatch);
    } catch (error) {
      console.error("[dragDrop.publishValidatedDrop] publish failed", error);
      return false;
    } finally {
      completeDrop(dropEvent);
    }
  }

  function publishDrop(_KDB, dropEvent, rt, dispatch) {
    const transferPayload = _session.parseTransferPayload(dropEvent);
    const dropboxEl = _lookup.resolveClosestBoundDropbox(_KDB, dropEvent.target, { currentTarget: dropEvent.currentTarget });
    const layout = resolveLayout(dropEvent, dropboxEl, transferPayload || {}, rt);
    const validation = _validateDropIntent(_KDB, dropboxEl, transferPayload, layout);

    _hover.clearActiveDropbox(rt, dropboxEl);
    removeTemporaryCopy(transferPayload, rt);
    dispatch({ type: _state.ACTION_TYPES.DROP_VALIDATED, payload: buildValidationPayload(validation, dropboxEl, transferPayload) });
    if (validation.isValid !== true || !_KDB.events || typeof _KDB.events.emit !== "function") {
      showValidationWarning(_KDB, validation.reason);
      return false;
    }
    markOriginDropped(transferPayload);
    _KDB.events.emit(_events.DROP_VALIDATED, buildEventPayload(_KDB, dropboxEl, transferPayload, layout));
    return true;
  }

  function resolveLayout(event, dropboxEl, transferPayload, rt) {
    const pointer = _geometry.resolvePointerWithinDropbox(event, dropboxEl);

    return {
      defaultHeight: Math.round(transferPayload.defaultHeight || 300),
      defaultWidth: Math.round(transferPayload.defaultWidth || 300),
      dragOffset: {
        x: Math.max(0, Math.round(transferPayload.offsetX || 0)),
        y: Math.max(0, Math.round(transferPayload.offsetY || 0))
      },
      helperTabIds: Array.isArray(rt.helperTabIds) ? rt.helperTabIds.slice() : [],
      pointer: pointer || buildFallbackPointer(event),
      scaleX: Math.max(0, Math.round((transferPayload.scaleX || 1) * 1000) / 1000),
      scaleY: Math.max(0, Math.round((transferPayload.scaleY || 1) * 1000) / 1000)
    };
  }

  function buildFallbackPointer(event) {
    return {
      clientX: Math.round(event.clientX || 0),
      clientY: Math.round(event.clientY || 0),
      dropboxRectHeight: 0,
      dropboxRectWidth: 0,
      offsetX: null,
      offsetY: null
    };
  }

  function buildValidationPayload(validation, dropboxEl, transferPayload) {
    return {
      isValid: validation.isValid === true,
      reason: validation.reason || null,
      dropboxId: dropboxEl && dropboxEl.id ? dropboxEl.id : null,
      draggedElementType: transferPayload ? transferPayload.draggedElementType || null : null,
      validatedAt: Date.now()
    };
  }

  function buildEventPayload(_KDB, dropboxEl, transferPayload, layout) {
    return {
      draggedElementType: transferPayload.draggedElementType,
      dropboxId: dropboxEl.id || null,
      layout: {
        defaultHeight: layout.defaultHeight,
        defaultWidth: layout.defaultWidth,
        dragOffset: layout.dragOffset,
        pointer: layout.pointer,
        scaleX: layout.scaleX,
        scaleY: layout.scaleY
      },
      originId: transferPayload.originId || null,
      padKey: transferPayload.padKey || null,
      payload: transferPayload.payload || {},
      sourceKind: transferPayload.sourceKind || _config.sourceKinds.unknown,
      startedAt: transferPayload.startedAt || Date.now(),
      tabId: resolveTabId(_KDB, dropboxEl)
    };
  }

  function resolveTabId(_KDB, dropboxEl) {
    const tabEl = _lookup.resolveTabElement(_KDB, dropboxEl);

    if (tabEl && tabEl.id) {
      return tabEl.id;
    }
    return _KDB && _KDB.state && _KDB.state.tabs ? _KDB.state.tabs.currentTabId || null : null;
  }

  function removeTemporaryCopy(transferPayload, rt) {
    const copyId = transferPayload ? transferPayload.copyId : null;
    const copyEl = copyId ? document.getElementById(copyId) : null;

    if (copyEl && copyEl.parentNode) {
      copyEl.parentNode.removeChild(copyEl);
    }
    rt.domRefs.sourceCopyEl = null;
  }

  function markOriginDropped(transferPayload) {
    const originId = transferPayload ? transferPayload.originId : null;
    const originEl = originId ? document.getElementById(originId) : null;

    if (originEl && originEl.classList) {
      originEl.classList.add(_config.classNames.droppedOrigin);
    }
  }

  function showValidationWarning(_KDB, reason) {
    const messageService = _KDB && _KDB.services ? _KDB.services.message : null;

    if (!messageService || typeof messageService.notify !== "function") {
      console.warn("[dragDrop.publishValidatedDrop] message service unavailable", reason || "unknown");
      return;
    }
    if (_config.validationMessages[reason]) {
      messageService.notify({ message: _config.validationMessages[reason], severity: "warning" });
    }
  }

  return publishValidatedDrop;
});
