define([], function () {
  "use strict";

  function readActionLabel(options) {
    var raw = options.actionLabel;
    return String(raw == null ? "" : raw).replace(/^\s+|\s+$/g, "");
  }

  function isCopyableToggleValid(toggle) {
    if (!toggle || typeof toggle !== "object") return false;
    if (typeof toggle.label !== "string" || toggle.label === "") return false;
    if (typeof toggle.title !== "string") return false;
    if (typeof toggle.isChecked !== "boolean") return false;
    if (typeof toggle.copyTextChecked !== "string" || toggle.copyTextChecked === "") return false;
    return typeof toggle.copyTextUnchecked === "string" && toggle.copyTextUnchecked !== "";
  }

  function appendCopyableToggle(ownerDocument, bodyEl, options) {
    var toggle = (options || {}).toggle;
    var wrapperEl;
    var labelEl;
    var labelTextEl;
    var trackEl;
    var inputEl;
    var sliderEl;
    if (!isCopyableToggleValid(toggle)) {
      if (toggle !== undefined) {
        console.warn("[messageService.appendCopyableToggle] invalid toggle ignored");
      }
      return null;
    }
    wrapperEl = ownerDocument.createElement("div");
    wrapperEl.className = "kdb-message-dialog__toggle";
    labelEl = ownerDocument.createElement("label");
    labelEl.className = "kdb-control_switch-row KDB_ToggleButton";
    labelEl.setAttribute("title", toggle.title || toggle.label);
    labelTextEl = ownerDocument.createElement("span");
    labelTextEl.className = "kdb-control_switch-label";
    labelTextEl.textContent = toggle.label;
    trackEl = ownerDocument.createElement("span");
    trackEl.className = "kdb-control_switch-track";
    inputEl = ownerDocument.createElement("input");
    inputEl.type = "checkbox";
    inputEl.className = "kdb-control_switch-input";
    inputEl.checked = toggle.isChecked === true;
    inputEl.setAttribute("aria-label", toggle.label);
    sliderEl = ownerDocument.createElement("span");
    sliderEl.className = "KDB_ToggleButton_slider KDB_ToggleButton_round";
    trackEl.appendChild(inputEl);
    trackEl.appendChild(sliderEl);
    labelEl.appendChild(labelTextEl);
    labelEl.appendChild(trackEl);
    wrapperEl.appendChild(labelEl);
    bodyEl.appendChild(wrapperEl);
    return inputEl;
  }

  function syncCopyTextFromToggle(handle, request) {
    var toggle = request.options.toggle;
    var text = handle.toggleInputEl.checked === true ? toggle.copyTextChecked : toggle.copyTextUnchecked;
    request.options.copyText = text;
    handle.copyTextEl.value = text;
  }

  function bindCopyableToggle(addDialogListener, handle, request) {
    if (!handle.toggleInputEl || !handle.copyTextEl) {
      return;
    }
    addDialogListener(handle.toggleInputEl, "change", syncCopyTextFromToggle.bind(null, handle, request));
  }

  function copyMessageText(text) {
    var clipboard = typeof navigator !== "undefined" ? navigator.clipboard : null;
    if (typeof window === "undefined" || window.isSecureContext !== true) {
      return Promise.resolve(false);
    }
    if (!clipboard || typeof clipboard.writeText !== "function") {
      return Promise.resolve(false);
    }
    try {
      return clipboard.writeText(String(text || "")).then(function () { return true; }, function () { return false; });
    } catch (_error) {
      return Promise.resolve(false);
    }
  }

  function readActiveCopyableRequest(context, requestId) {
    var request = context._KDB.runtime.messageService.queues.activeModalRequest;
    return request && request.id === requestId && request.kind === "copyable" ? request : null;
  }

  function applyCopyResult(context, requestId, copied) {
    var request = readActiveCopyableRequest(context, requestId);
    var options;
    if (!request) {
      return;
    }
    options = request.options;
    if (copied) {
      context.notify({ message: options.copiedMessage || context.labels.copied, severity: "success" });
      return;
    }
    if (request.viewHandle.copyTextEl) {
      request.viewHandle.copyTextEl.focus();
      request.viewHandle.copyTextEl.select();
    }
    context.notify({ message: options.copyFallbackMessage || context.labels.copyFallback, severity: "warning" });
  }

  function copyActiveRequestText(context, requestId) {
    var request = readActiveCopyableRequest(context, requestId);
    if (!request) {
      return;
    }
    copyMessageText(request.options.copyText)
      .then(applyCopyResult.bind(null, context, requestId))
      .catch(function (error) {
        console.error("[messageService.copyActiveRequestText] failed", error);
      });
  }

  function showCopyable(modalQueue, _options) {
    var options = _options || {};
    var actionLabel = readActionLabel(options);
    if (!actionLabel) {
      modalQueue.enqueuePassive("copyable", options);
      return undefined;
    }
    options.actionLabel = actionLabel;
    return modalQueue.enqueueCopyableAction(options);
  }

  return {
    appendCopyableToggle: appendCopyableToggle,
    bindCopyableToggle: bindCopyableToggle,
    copyActiveRequestText: copyActiveRequestText,
    readActionLabel: readActionLabel,
    showCopyable: showCopyable
  };
});
