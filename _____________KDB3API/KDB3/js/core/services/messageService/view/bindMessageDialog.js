define(["./bindCopyableToggle.js"], function (_bindCopyableToggle) {
  "use strict";

  function registerListener(runtime, handle, target, type, handler) {
    var record = { target: target, type: type, handler: handler, options: false };
    target.addEventListener(type, handler, false);
    runtime.listeners.push(record);
    handle.listeners.push(record);
  }

  function removeListener(runtime, record) {
    var index = runtime.listeners.indexOf(record);
    record.target.removeEventListener(record.type, record.handler, record.options);
    if (index >= 0) runtime.listeners.splice(index, 1);
  }

  function selectCopyText(copyTextEl) {
    copyTextEl.focus();
    copyTextEl.select();
  }

  function findActionButton(target, backdropEl) {
    var buttonEl = target && target.closest ? target.closest("[data-kdb-message-action]") : null;
    return buttonEl && backdropEl.contains(buttonEl) ? buttonEl : null;
  }

  function handleClick(context, event) {
    var buttonEl;
    if (event.target === context.handle.backdropEl && context.request.options.dismissible !== false) {
      context.onAction({ action: "dismiss" });
      return;
    }
    buttonEl = findActionButton(event.target, context.handle.backdropEl);
    if (!buttonEl || buttonEl.disabled) return;
    context.onAction({
      action: buttonEl.getAttribute("data-kdb-message-action"),
      choice: buttonEl.getAttribute("data-kdb-message-choice")
    });
  }

  function readFocusable(dialogEl) {
    return Array.prototype.slice.call(
      dialogEl.querySelectorAll("button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])")
    );
  }

  function trapTab(dialogEl, event) {
    var focusable = readFocusable(dialogEl);
    var first;
    var last;
    if (focusable.length === 0) return;
    first = focusable[0];
    last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function moveChoiceFocus(dialogEl, target, direction) {
    var choices = Array.prototype.slice.call(
      dialogEl.querySelectorAll(".kdb-message-dialog__choice:not([disabled])")
    );
    var index = choices.indexOf(target);
    if (index < 0 || choices.length === 0) return false;
    index = (index + direction + choices.length) % choices.length;
    choices[index].focus();
    return true;
  }

  function handleKeydown(context, event) {
    if (event.key === "Escape" && context.request.options.dismissible !== false) {
      event.preventDefault();
      context.onAction({ action: "dismiss" });
    } else if (event.key === "Tab") {
      trapTab(context.handle.dialogEl, event);
    } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      if (moveChoiceFocus(context.handle.dialogEl, event.target, 1)) event.preventDefault();
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      if (moveChoiceFocus(context.handle.dialogEl, event.target, -1)) event.preventDefault();
    }
  }

  function focusInitialControl(handle, request) {
    var selector;
    var target;
    if (request.kind === "confirm") selector = "[data-kdb-message-action='cancel']";
    else if (request.kind === "choose") selector = ".kdb-message-dialog__choice:not([disabled])";
    else if (request.kind === "copyable") selector = ".kdb-message-dialog__copy-text";
    else selector = "[data-kdb-message-action='acknowledge']";
    target = handle.dialogEl.querySelector(selector) || handle.dialogEl;
    if (!target.hasAttribute("tabindex") && target === handle.dialogEl) target.setAttribute("tabindex", "-1");
    target.focus();
    if (target === handle.copyTextEl) target.select();
  }

  function bindCopySelection(runtime, handle) {
    if (!handle.copyTextEl) return;
    registerListener(runtime, handle, handle.copyTextEl, "focus", selectCopyText.bind(null, handle.copyTextEl));
    registerListener(runtime, handle, handle.copyTextEl, "click", selectCopyText.bind(null, handle.copyTextEl));
  }

  function __controller(_runtime, _handle, _request, _onAction) {
    var context = { handle: _handle, onAction: _onAction, request: _request };
    _handle.listeners = [];
    _handle.previousFocusEl = document.activeElement;
    registerListener(_runtime, _handle, _handle.backdropEl, "click", handleClick.bind(null, context));
    registerListener(_runtime, _handle, _handle.backdropEl, "keydown", handleKeydown.bind(null, context));
    bindCopySelection(_runtime, _handle);
    _bindCopyableToggle(registerListener, _runtime, _handle, _request);
    focusInitialControl(_handle, _request);
    return _handle;
  }

  function cleanup(_runtime, _handle) {
    var index;
    for (index = 0; index < _handle.listeners.length; index += 1) {
      removeListener(_runtime, _handle.listeners[index]);
    }
    if (_handle.backdropEl.parentNode) _handle.backdropEl.parentNode.removeChild(_handle.backdropEl);
    if (_handle.previousFocusEl && _handle.previousFocusEl.isConnected && typeof _handle.previousFocusEl.focus === "function") {
      _handle.previousFocusEl.focus();
    }
  }

  return { bind: __controller, cleanup: cleanup };
});
