define([
  "../config.js",
  "../avatar.js",
  "../selectors.js",
  "./geometry.js",
  "./lookup.js"
], function (_config, _avatar, _selectors, _geometry, _lookup) {
  "use strict";

  // The three handlers run inside DOM event callbacks; the binding layer wraps them in the boundary try/catch.
  function handleDragEnter(_KDB, event, rt) {
    const dragEvent = event && (event.originalEvent || event);

    if (!dragEvent) {
      return false;
    }
    dragEvent.preventDefault();
    return handleDragOver(_KDB, dragEvent, rt);
  }

  function handleDragOver(_KDB, event, rt) {
    const dragEvent = event && (event.originalEvent || event);
    const session = _selectors.readActiveSession(_KDB);
    const dropboxEl = resolveDropboxEl(_KDB, dragEvent);

    if (!dragEvent) {
      return false;
    }
    dragEvent.preventDefault();
    _avatar.moveDragAvatar(rt, dragEvent, session);
    if (!dropboxEl || !isWithinBounds(dragEvent, dropboxEl, session)) {
      clearActiveDropbox(rt);
      setDropEffect(dragEvent, "none");
      return false;
    }
    setActiveDropbox(rt, dropboxEl);
    setDropEffect(dragEvent, "copy");
    return true;
  }

  function handleDragLeave(_KDB, event, rt) {
    const dragEvent = event && (event.originalEvent || event);
    const nextTarget = dragEvent ? dragEvent.relatedTarget : null;
    const activeDropboxEl = rt.domRefs.activeDropboxEl;

    if (activeDropboxEl && nextTarget && activeDropboxEl.contains && activeDropboxEl.contains(nextTarget)) {
      return false;
    }
    clearActiveDropbox(rt);
    return true;
  }

  // fallbackEl: the element to un-highlight when no active dropbox is recorded (drop target on a drop).
  function clearActiveDropbox(rt, fallbackEl) {
    const targetEl = rt.domRefs.activeDropboxEl || fallbackEl;

    if (targetEl && targetEl.classList) {
      targetEl.classList.remove(_config.classNames.activeDropbox);
    }
    rt.domRefs.activeDropboxEl = null;
  }

  function resolveDropboxEl(_KDB, event) {
    return _lookup.resolveClosestBoundDropbox(_KDB, event ? event.target : null, {
      currentTarget: event ? event.currentTarget : null
    });
  }

  function isWithinBounds(event, dropboxEl, session) {
    const pointer = _geometry.resolvePointerWithinDropbox(event, dropboxEl);
    const dragOffset = { x: session ? session.offsetX || 0 : 0, y: session ? session.offsetY || 0 : 0 };
    const width = (session ? session.defaultWidth || 300 : 300) * (session ? session.scaleX || 1 : 1);
    const height = (session ? session.defaultHeight || 300 : 300) * (session ? session.scaleY || 1 : 1);

    return _geometry.isPlacementWithinBounds(pointer, dragOffset, width, height, dropboxEl);
  }

  function setActiveDropbox(rt, dropboxEl) {
    if (rt.domRefs.activeDropboxEl !== dropboxEl) {
      clearActiveDropbox(rt);
      rt.domRefs.activeDropboxEl = dropboxEl;
    }
    dropboxEl.classList.add(_config.classNames.activeDropbox);
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
