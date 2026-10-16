define(["./config.js", "./copyable.js", "./runtime.js"], function (_config, _copyable, _runtime) {
  "use strict";

  var BUTTON_CLASS = "kdb-message-dialog__button";
  var PRIMARY_BUTTON_CLASS = "kdb-message-dialog__button kdb-message-dialog__button--primary";
  var FOCUSABLE_SELECTOR = "button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])";
  var CHOICE_SELECTOR = ".kdb-message-dialog__choice:not([disabled])";

  function appendButton(ownerDocument, parentEl, className, label, action) {
    var buttonEl = ownerDocument.createElement("button");
    buttonEl.type = "button";
    buttonEl.className = className;
    buttonEl.textContent = label;
    buttonEl.setAttribute("data-kdb-message-action", action);
    parentEl.appendChild(buttonEl);
    return buttonEl;
  }

  function appendCloseButton(ownerDocument, headerEl, label) {
    appendButton(ownerDocument, headerEl, "kdb-message-dialog__close", "×", "dismiss").setAttribute("aria-label", label);
  }

  function appendCopyText(ownerDocument, bodyEl, options, requestId, labels) {
    var copyTextEl = ownerDocument.createElement("textarea");
    copyTextEl.id = requestId + "-copy-text";
    copyTextEl.className = "kdb-message-dialog__copy-text";
    copyTextEl.readOnly = true;
    copyTextEl.value = String(options.copyText || "");
    copyTextEl.setAttribute("aria-label", options.copyTextLabel || labels.copyTextLabel || _config.messageLabels.copyTextLabel);
    bodyEl.appendChild(copyTextEl);
    return copyTextEl;
  }

  function appendChoices(ownerDocument, bodyEl, request, titleId) {
    var choices = request.options.choices || [];
    var groupEl = ownerDocument.createElement("div");
    groupEl.className = "kdb-message-dialog__choices";
    groupEl.setAttribute("role", "group");
    groupEl.setAttribute("aria-labelledby", titleId);
    choices.forEach(function (choice) {
      var buttonEl = appendButton(ownerDocument, groupEl, "kdb-message-dialog__choice", String(choice.label || choice.id || ""), "choose");
      buttonEl.setAttribute("data-kdb-message-choice", String(choice.id || ""));
      buttonEl.disabled = choice.disabled === true;
    });
    bodyEl.appendChild(groupEl);
  }

  function appendCopyableActions(ownerDocument, actionsEl, options, labels) {
    var actionLabel = _copyable.readActionLabel(options);
    var closeLabel = options.closeLabel || labels.close;
    var copyLabel = options.copyLabel || labels.copy;
    if (actionLabel) {
      actionsEl.className = "kdb-message-dialog__actions kdb-message-dialog__actions--with-action";
      appendButton(ownerDocument, actionsEl, BUTTON_CLASS, closeLabel, "close");
      appendButton(ownerDocument, actionsEl, BUTTON_CLASS, copyLabel, "copy");
      appendButton(ownerDocument, actionsEl, PRIMARY_BUTTON_CLASS, actionLabel, "action");
    } else {
      appendButton(ownerDocument, actionsEl, BUTTON_CLASS, closeLabel, "close");
      appendButton(ownerDocument, actionsEl, PRIMARY_BUTTON_CLASS, copyLabel, "copy");
    }
  }

  function appendActions(ownerDocument, dialogEl, request, labels) {
    var actionsEl = ownerDocument.createElement("div");
    var options = request.options;
    actionsEl.className = "kdb-message-dialog__actions";
    if (request.kind === "alert") {
      appendButton(ownerDocument, actionsEl, PRIMARY_BUTTON_CLASS, options.acknowledgeLabel || labels.acknowledge, "acknowledge");
    } else if (request.kind === "confirm") {
      appendButton(ownerDocument, actionsEl, BUTTON_CLASS, options.cancelLabel || labels.cancel, "cancel");
      appendButton(ownerDocument, actionsEl, PRIMARY_BUTTON_CLASS, options.confirmLabel || labels.confirm, "confirm");
    } else if (request.kind === "choose") {
      if (options.showCancel !== false) {
        appendButton(ownerDocument, actionsEl, BUTTON_CLASS, options.cancelLabel || labels.cancel, "cancel");
      }
    } else if (request.kind === "copyable") {
      appendCopyableActions(ownerDocument, actionsEl, options, labels);
    }
    if (actionsEl.firstChild) {
      dialogEl.appendChild(actionsEl);
    }
  }

  function buildMessageDialog(ownerDocument, request, labels) {
    var options = request.options || {};
    var titleId = request.id + "-title";
    var messageId = request.id + "-message";
    var backdropEl = ownerDocument.createElement("div");
    var dialogEl = ownerDocument.createElement("section");
    var headerEl = ownerDocument.createElement("div");
    var titleEl = ownerDocument.createElement("h2");
    var bodyEl = ownerDocument.createElement("div");
    var messageEl = ownerDocument.createElement("p");
    var handle = { backdropEl: backdropEl, copyTextEl: null, dialogEl: dialogEl, toggleInputEl: null };
    backdropEl.className = "kdb-message-backdrop";
    dialogEl.className = "kdb-message-dialog kdb-message-dialog--" + (options.severity || "info");
    dialogEl.setAttribute("role", "dialog");
    dialogEl.setAttribute("aria-modal", "true");
    dialogEl.setAttribute("aria-labelledby", titleId);
    dialogEl.setAttribute("aria-describedby", messageId);
    headerEl.className = "kdb-message-dialog__header";
    titleEl.id = titleId;
    titleEl.className = "kdb-message-dialog__title";
    titleEl.textContent = String(options.title || labels.title || _config.messageLabels.title);
    headerEl.appendChild(titleEl);
    if (options.dismissible !== false) {
      appendCloseButton(ownerDocument, headerEl, options.closeLabel || labels.close);
    }
    bodyEl.className = "kdb-message-dialog__body";
    messageEl.id = messageId;
    messageEl.className = "kdb-message-dialog__message";
    messageEl.textContent = String(options.message || "");
    bodyEl.appendChild(messageEl);
    if (request.kind === "choose") {
      appendChoices(ownerDocument, bodyEl, request, titleId);
    }
    if (request.kind === "copyable") {
      handle.toggleInputEl = _copyable.appendCopyableToggle(ownerDocument, bodyEl, options);
      handle.copyTextEl = appendCopyText(ownerDocument, bodyEl, options, request.id, labels);
    }
    dialogEl.appendChild(headerEl);
    dialogEl.appendChild(bodyEl);
    appendActions(ownerDocument, dialogEl, request, labels);
    backdropEl.appendChild(dialogEl);
    return handle;
  }

  function addDialogListener(handle, target, type, handler) {
    target.addEventListener(type, handler, false);
    handle.listeners.push({ target: target, type: type, handler: handler, options: false });
  }

  function selectCopyText(copyTextEl) {
    copyTextEl.focus();
    copyTextEl.select();
  }

  function findActionButton(target, backdropEl) {
    var buttonEl = target && target.closest ? target.closest("[data-kdb-message-action]") : null;
    return buttonEl && backdropEl.contains(buttonEl) ? buttonEl : null;
  }

  function onBackdropClick(context, event) {
    var buttonEl;
    if (event.target === context.handle.backdropEl && context.request.options.dismissible !== false) {
      context.onAction({ action: "dismiss" });
      return;
    }
    buttonEl = findActionButton(event.target, context.handle.backdropEl);
    if (!buttonEl || buttonEl.disabled) {
      return;
    }
    context.onAction({
      action: buttonEl.getAttribute("data-kdb-message-action"),
      choice: buttonEl.getAttribute("data-kdb-message-choice")
    });
  }

  function trapTab(dialogEl, event) {
    var focusable = Array.prototype.slice.call(dialogEl.querySelectorAll(FOCUSABLE_SELECTOR));
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (focusable.length === 0) {
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function moveChoiceFocus(dialogEl, target, direction) {
    var choices = Array.prototype.slice.call(dialogEl.querySelectorAll(CHOICE_SELECTOR));
    var index = choices.indexOf(target);
    if (index < 0 || choices.length === 0) {
      return false;
    }
    choices[(index + direction + choices.length) % choices.length].focus();
    return true;
  }

  function onBackdropKeydown(context, event) {
    var dialogEl = context.handle.dialogEl;
    if (event.key === "Escape" && context.request.options.dismissible !== false) {
      event.preventDefault();
      context.onAction({ action: "dismiss" });
    } else if (event.key === "Tab") {
      trapTab(dialogEl, event);
    } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      if (moveChoiceFocus(dialogEl, event.target, 1)) {
        event.preventDefault();
      }
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      if (moveChoiceFocus(dialogEl, event.target, -1)) {
        event.preventDefault();
      }
    }
  }

  function focusInitialControl(handle, request) {
    var selector;
    var target;
    if (request.kind === "confirm") {
      selector = "[data-kdb-message-action='cancel']";
    } else if (request.kind === "choose") {
      selector = CHOICE_SELECTOR;
    } else if (request.kind === "copyable") {
      selector = ".kdb-message-dialog__copy-text";
    } else {
      selector = "[data-kdb-message-action='acknowledge']";
    }
    target = handle.dialogEl.querySelector(selector) || handle.dialogEl;
    if (!target.hasAttribute("tabindex") && target === handle.dialogEl) {
      target.setAttribute("tabindex", "-1");
    }
    target.focus();
    if (target === handle.copyTextEl) {
      target.select();
    }
  }

  // Mount and bind are separate steps: the caller stores the handle in between, so a failing bind
  // can still be cleaned up (backdrop removed, listeners released).
  function mountDialog(_KDB, request, labels) {
    var runtime = _KDB.runtime.messageService;
    var portalEl = _runtime.ensureMessageRoot(_KDB);
    var handle = buildMessageDialog(portalEl.ownerDocument, request, labels);
    handle.listeners = [];
    handle.previousFocusEl = document.activeElement;
    runtime.listeners.dialog = handle.listeners;
    portalEl.appendChild(handle.backdropEl);
    return handle;
  }

  function bindDialog(handle, request, onAction) {
    var context = { handle: handle, onAction: onAction, request: request };
    addDialogListener(handle, handle.backdropEl, "click", onBackdropClick.bind(null, context));
    addDialogListener(handle, handle.backdropEl, "keydown", onBackdropKeydown.bind(null, context));
    if (handle.copyTextEl) {
      addDialogListener(handle, handle.copyTextEl, "focus", selectCopyText.bind(null, handle.copyTextEl));
      addDialogListener(handle, handle.copyTextEl, "click", selectCopyText.bind(null, handle.copyTextEl));
    }
    _copyable.bindCopyableToggle(addDialogListener.bind(null, handle), handle, request);
    focusInitialControl(handle, request);
  }

  function cleanupDialog(_KDB, handle) {
    var runtime = _KDB.runtime.messageService;
    handle.listeners.forEach(function (record) {
      record.target.removeEventListener(record.type, record.handler, record.options);
    });
    if (runtime.listeners.dialog === handle.listeners) {
      delete runtime.listeners.dialog;
    }
    handle.listeners = [];
    if (handle.backdropEl.parentNode) {
      handle.backdropEl.parentNode.removeChild(handle.backdropEl);
    }
    if (handle.previousFocusEl && handle.previousFocusEl.isConnected && typeof handle.previousFocusEl.focus === "function") {
      handle.previousFocusEl.focus();
    }
  }

  return {
    bindDialog: bindDialog,
    cleanupDialog: cleanupDialog,
    mountDialog: mountDialog
  };
});
