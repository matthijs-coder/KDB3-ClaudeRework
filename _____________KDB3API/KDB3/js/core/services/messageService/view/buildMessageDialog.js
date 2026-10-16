define(["./appendCopyableToggle.js"], function (_appendCopyableToggle) {
  "use strict";

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
    var closeButton = appendButton(
      ownerDocument,
      headerEl,
      "kdb-message-dialog__close",
      "×",
      "dismiss"
    );
    closeButton.setAttribute("aria-label", label);
  }

  function appendCopyableContent(ownerDocument, bodyEl, options, requestId) {
    var copyTextEl = ownerDocument.createElement("textarea");
    copyTextEl.id = requestId + "-copy-text";
    copyTextEl.className = "kdb-message-dialog__copy-text";
    copyTextEl.readOnly = true;
    copyTextEl.value = String(options.copyText || "");
    copyTextEl.setAttribute("aria-label", options.copyTextLabel || "Zu kopierender Text");
    bodyEl.appendChild(copyTextEl);
    return copyTextEl;
  }

  function shouldShowChooseCancel(_options) {
    return !(_options && _options.showCancel === false);
  }

  function appendChoices(ownerDocument, bodyEl, request, titleId) {
    var choices = request.options.choices || [];
    var groupEl = ownerDocument.createElement("div");
    var index;
    var buttonEl;
    groupEl.className = "kdb-message-dialog__choices";
    groupEl.setAttribute("role", "group");
    groupEl.setAttribute("aria-labelledby", titleId);
    for (index = 0; index < choices.length; index += 1) {
      buttonEl = appendButton(
        ownerDocument,
        groupEl,
        "kdb-message-dialog__choice",
        String(choices[index].label || choices[index].id || ""),
        "choose"
      );
      buttonEl.setAttribute("data-kdb-message-choice", String(choices[index].id || ""));
      buttonEl.disabled = choices[index].disabled === true;
    }
    bodyEl.appendChild(groupEl);
  }

  function appendActions(ownerDocument, dialogEl, request, labels) {
    var actionsEl = ownerDocument.createElement("div");
    var options = request.options;
    var raw;
    var trimmed;
    actionsEl.className = "kdb-message-dialog__actions";
    if (request.kind === "alert") {
      appendButton(ownerDocument, actionsEl, "kdb-message-dialog__button kdb-message-dialog__button--primary", options.acknowledgeLabel || labels.acknowledge, "acknowledge");
    } else if (request.kind === "confirm") {
      appendButton(ownerDocument, actionsEl, "kdb-message-dialog__button", options.cancelLabel || labels.cancel, "cancel");
      appendButton(ownerDocument, actionsEl, "kdb-message-dialog__button kdb-message-dialog__button--primary", options.confirmLabel || labels.confirm, "confirm");
    } else if (request.kind === "choose") {
      if (shouldShowChooseCancel(options)) {
        appendButton(ownerDocument, actionsEl, "kdb-message-dialog__button", options.cancelLabel || labels.cancel, "cancel");
      }
    } else if (request.kind === "copyable") {
      raw = options.actionLabel;
      trimmed = String(raw == null ? "" : raw).replace(/^\s+|\s+$/g, "");
      if (trimmed) {
        actionsEl.className = "kdb-message-dialog__actions kdb-message-dialog__actions--with-action";
        appendButton(ownerDocument, actionsEl, "kdb-message-dialog__button", options.closeLabel || labels.close, "close");
        appendButton(ownerDocument, actionsEl, "kdb-message-dialog__button", options.copyLabel || labels.copy, "copy");
        appendButton(ownerDocument, actionsEl, "kdb-message-dialog__button kdb-message-dialog__button--primary", trimmed, "action");
      } else {
        appendButton(ownerDocument, actionsEl, "kdb-message-dialog__button", options.closeLabel || labels.close, "close");
        appendButton(ownerDocument, actionsEl, "kdb-message-dialog__button kdb-message-dialog__button--primary", options.copyLabel || labels.copy, "copy");
      }
    }
    if (actionsEl.firstChild) dialogEl.appendChild(actionsEl);
  }

  function __controller(_ownerDocument, _request, _labels) {
    var options = _request.options || {};
    var severity = options.severity || "info";
    var titleId = _request.id + "-title";
    var messageId = _request.id + "-message";
    var backdropEl = _ownerDocument.createElement("div");
    var dialogEl = _ownerDocument.createElement("section");
    var headerEl = _ownerDocument.createElement("div");
    var titleEl = _ownerDocument.createElement("h2");
    var bodyEl = _ownerDocument.createElement("div");
    var messageEl = _ownerDocument.createElement("p");
    var copyTextEl = null;
    var toggleInputEl = null;
    backdropEl.className = "kdb-message-backdrop";
    dialogEl.className = "kdb-message-dialog kdb-message-dialog--" + severity;
    dialogEl.setAttribute("role", "dialog");
    dialogEl.setAttribute("aria-modal", "true");
    dialogEl.setAttribute("aria-labelledby", titleId);
    dialogEl.setAttribute("aria-describedby", messageId);
    headerEl.className = "kdb-message-dialog__header";
    titleEl.id = titleId;
    titleEl.className = "kdb-message-dialog__title";
    titleEl.textContent = String(options.title || _labels.title || "Meldung");
    headerEl.appendChild(titleEl);
    if (options.dismissible !== false) appendCloseButton(_ownerDocument, headerEl, options.closeLabel || _labels.close);
    bodyEl.className = "kdb-message-dialog__body";
    messageEl.id = messageId;
    messageEl.className = "kdb-message-dialog__message";
    messageEl.textContent = String(options.message || "");
    bodyEl.appendChild(messageEl);
    if (_request.kind === "choose") appendChoices(_ownerDocument, bodyEl, _request, titleId);
    if (_request.kind === "copyable") {
      toggleInputEl = _appendCopyableToggle(_ownerDocument, bodyEl, options);
      copyTextEl = appendCopyableContent(_ownerDocument, bodyEl, options, _request.id);
    }
    dialogEl.appendChild(headerEl);
    dialogEl.appendChild(bodyEl);
    appendActions(_ownerDocument, dialogEl, _request, _labels);
    backdropEl.appendChild(dialogEl);
    return { backdropEl: backdropEl, copyTextEl: copyTextEl, dialogEl: dialogEl, toggleInputEl: toggleInputEl };
  }

  return __controller;
});
