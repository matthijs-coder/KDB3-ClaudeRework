define([], function () {
  const MOVE_HANDLE_SELECTOR = "[data-kdb-widget-move-handle], .KDB_widgetMoveHandleHost";

  function resolveMoveHandle(shellEl) {
    if (!shellEl || typeof shellEl.querySelector !== "function") {
      return false;
    }
    return shellEl.querySelector(MOVE_HANDLE_SELECTOR) ? MOVE_HANDLE_SELECTOR : false;
  }

  function ensureMoveHandle(shellEl) {
    if (!shellEl || typeof shellEl.querySelector !== "function" || typeof shellEl.appendChild !== "function") {
      return null;
    }
    const existing = shellEl.querySelector(MOVE_HANDLE_SELECTOR);
    if (existing) {
      return existing;
    }
    const doc = shellEl.ownerDocument || document;
    const handle = doc.createElement("div");
    handle.className = "KDB_widgetMoveHandleHost";
    handle.setAttribute("data-kdb-widget-move-handle", "true");
    handle.setAttribute("data-kdb-widget-base-created", "true");
    handle.setAttribute("title", "Widget verschieben");
    handle.setAttribute("aria-label", "Widget verschieben");
    shellEl.appendChild(handle);
    return handle;
  }

  function removeCreatedMoveHandle(shellEl) {
    if (!shellEl || typeof shellEl.querySelectorAll !== "function") {
      return;
    }
    const handles = shellEl.querySelectorAll("[data-kdb-widget-move-handle][data-kdb-widget-base-created='true']");
    let index = 0;
    while (index < handles.length) {
      const handle = handles[index];
      if (handle.parentNode) {
        handle.parentNode.removeChild(handle);
      }
      index += 1;
    }
  }

  return { resolveMoveHandle: resolveMoveHandle, ensureMoveHandle: ensureMoveHandle, removeCreatedMoveHandle: removeCreatedMoveHandle };
});
