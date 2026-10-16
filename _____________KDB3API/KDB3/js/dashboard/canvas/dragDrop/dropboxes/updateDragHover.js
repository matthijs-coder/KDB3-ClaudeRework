define([
  "./resolveBoundDropbox.js",
  "./resolveDropboxGeometry.js",
  "../avatar/moveDragAvatar.js"
], function (_resolveBoundDropbox, _resolveDropboxGeometry, _moveDragAvatar) {
  "use strict";

  function handleDragEnter(_KDB, _event, _runtime) {
    try {
      const originalEvent = _event && (_event.originalEvent || _event);

      if (!originalEvent) {
        return false;
      }
      originalEvent.preventDefault();
      return handleDragOver(_KDB, originalEvent, _runtime);
    } catch (error) {
      console.error("[dragDrop.updateDragHover] dragenter failed", error);
      return false;
    }
  }

  function handleDragOver(_KDB, _event, _runtime) {
    try {
      const originalEvent = _event && (_event.originalEvent || _event);
      const session = _KDB && _KDB.state && _KDB.state.dragDrop ? _KDB.state.dragDrop.session : null;
      const dropboxEl = resolveDropboxEl(_KDB, originalEvent);

      if (!originalEvent) {
        return false;
      }
      originalEvent.preventDefault();
      _moveDragAvatar(_runtime, originalEvent, session);
      if (!dropboxEl || !isWithinBounds(originalEvent, dropboxEl, session)) {
        clearActiveDropbox(_runtime);
        setDropEffect(originalEvent, "none");
        return false;
      }
      setActiveDropbox(_runtime, dropboxEl);
      setDropEffect(originalEvent, "copy");
      return true;
    } catch (error) {
      console.error("[dragDrop.updateDragHover] dragover failed", error);
      return false;
    }
  }

  function handleDragLeave(_KDB, _event, _runtime) {
    try {
      const originalEvent = _event && (_event.originalEvent || _event);
      const nextTarget = originalEvent ? originalEvent.relatedTarget : null;
      const activeDropboxEl = _runtime && _runtime.domRefs ? _runtime.domRefs.activeDropboxEl : null;

      if (activeDropboxEl && nextTarget && activeDropboxEl.contains && activeDropboxEl.contains(nextTarget)) {
        return false;
      }
      clearActiveDropbox(_runtime);
      return true;
    } catch (error) {
      console.error("[dragDrop.updateDragHover] dragleave failed", error);
      return false;
    }
  }

  function clearActiveDropbox(_runtime) {
    const domRefs = _runtime && _runtime.domRefs ? _runtime.domRefs : {};
    const activeDropboxEl = domRefs.activeDropboxEl || (_runtime ? _runtime.activeDropboxEl : null);

    if (activeDropboxEl && activeDropboxEl.classList) {
      activeDropboxEl.classList.remove("kdb_drag-over");
    }
    domRefs.activeDropboxEl = null;
    if (_runtime) {
      _runtime.activeDropboxEl = null;
    }
  }

  function resolveDropboxEl(_KDB, event) {
    return _resolveBoundDropbox.resolveClosestBoundDropbox(_KDB, event ? event.target : null, {
      currentTarget: event ? event.currentTarget : null
    });
  }

  function isWithinBounds(event, dropboxEl, session) {
    const pointer = _resolveDropboxGeometry.resolvePointerWithinDropbox(event, dropboxEl);
    const dragOffset = { x: session ? session.offsetX || 0 : 0, y: session ? session.offsetY || 0 : 0 };
    const width = (session ? session.defaultWidth || 300 : 300) * (session ? session.scaleX || 1 : 1);
    const height = (session ? session.defaultHeight || 300 : 300) * (session ? session.scaleY || 1 : 1);

    return _resolveDropboxGeometry.isPlacementWithinBounds(pointer, dragOffset, width, height, dropboxEl);
  }

  function setActiveDropbox(_runtime, dropboxEl) {
    if (_runtime.domRefs.activeDropboxEl !== dropboxEl) {
      clearActiveDropbox(_runtime);
      _runtime.domRefs.activeDropboxEl = dropboxEl;
      _runtime.activeDropboxEl = dropboxEl;
    }
    dropboxEl.classList.add("kdb_drag-over");
  }

  function setDropEffect(event, dropEffect) {
    if (event && event.dataTransfer) {
      event.dataTransfer.dropEffect = dropEffect;
    }
  }

  return {
    clearActiveDropbox: clearActiveDropbox,
    handleDragEnter: handleDragEnter,
    handleDragLeave: handleDragLeave,
    handleDragOver: handleDragOver
  };
});
