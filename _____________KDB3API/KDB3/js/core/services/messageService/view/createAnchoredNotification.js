define([], function () {
  "use strict";

  function normalizeSeverity(value) {
    return value === "success" || value === "warning" || value === "error" ? value : "info";
  }

  function __controller(_ownerDocument, _options) {
    var severity = normalizeSeverity(_options.severity);
    var notificationEl = _ownerDocument.createElement("div");
    var messageEl = _ownerDocument.createElement("div");
    var closeButton;
    notificationEl.className = "kdb-message-notification kdb-message-notification--" + severity;
    notificationEl.setAttribute("role", severity === "error" ? "alert" : "status");
    notificationEl.setAttribute("aria-live", severity === "error" ? "assertive" : "polite");
    notificationEl.setAttribute("aria-atomic", "true");
    messageEl.className = "kdb-message-notification__text";
    messageEl.textContent = String(_options.message || "");
    notificationEl.appendChild(messageEl);
    if (_options.dismissible !== false) {
      closeButton = _ownerDocument.createElement("button");
      closeButton.type = "button";
      closeButton.className = "kdb-message-notification__close";
      closeButton.setAttribute("aria-label", _options.closeLabel || "Schließen");
      closeButton.textContent = "×";
      notificationEl.appendChild(closeButton);
    }
    if (isFinite(_options.maxWidthPx)) {
      notificationEl.style.maxWidth = Math.max(160, Number(_options.maxWidthPx)) + "px";
    }
    return notificationEl;
  }

  return __controller;
});
