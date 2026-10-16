define(["./state.js"], function (_state) {
  "use strict";

  function resolveLoadingMessage(_KDB, options) {
    var labels = _KDB.config && _KDB.config.labels && _KDB.config.labels.de ? _KDB.config.labels.de.loading : null;
    var messageKey = options && options.messageKey;
    if (options && typeof options.message === "string" && options.message.length > 0) {
      return options.message;
    }
    if (typeof messageKey === "string" && labels && typeof labels[messageKey] === "string" && labels[messageKey].length > 0) {
      return labels[messageKey];
    }
    return "";
  }

  function syncLoadingCaption(spinnerEl, caption) {
    var captionEl;
    if (!spinnerEl) {
      return;
    }
    captionEl = spinnerEl.querySelector(".KDB_loadingMessage");
    if (!captionEl) {
      captionEl = document.createElement("p");
      captionEl.className = "KDB_loadingMessage";
      spinnerEl.appendChild(captionEl);
    }
    captionEl.textContent = caption || "";
    captionEl.hidden = !caption;
  }

  function syncLoadingSessionCaption(spinnerEl, sessionCaption) {
    var sessionEl;
    var indicatorEl;
    if (!spinnerEl) {
      return;
    }
    sessionEl = spinnerEl.querySelector(":scope > .KDB_loadingSessionMessage");
    if (typeof sessionCaption !== "string" || sessionCaption.length === 0) {
      if (sessionEl && sessionEl.parentNode) {
        sessionEl.parentNode.removeChild(sessionEl);
      }
      return;
    }
    if (!sessionEl) {
      sessionEl = document.createElement("p");
      sessionEl.className = "KDB_loadingSessionMessage";
    }
    indicatorEl = spinnerEl.querySelector(":scope > .loading_indicator");
    spinnerEl.insertBefore(sessionEl, indicatorEl || spinnerEl.firstChild);
    sessionEl.textContent = sessionCaption;
    sessionEl.hidden = false;
  }

  function updateLoadingMessage(_KDB, options) {
    var handle = options && options.handle;
    var mountKey = (handle && handle.mountKey) || (options && options.mountKey);
    var entry;
    var runtime;
    var spinnerEl;
    var mountEl;
    if (typeof mountKey !== "string" || mountKey.length === 0) {
      return false;
    }
    entry = _KDB.state && _KDB.state.loading ? _KDB.state.loading[mountKey] : null;
    if (!entry || entry.isActive !== true) {
      return false;
    }
    runtime = _state.ensureLoadingRuntime(_KDB);
    spinnerEl = runtime.domRefs.spinnersByMountKey[mountKey];
    if (!spinnerEl) {
      return false;
    }
    mountEl = handle && handle.mountEl && handle.mountEl.nodeType === 1 ? handle.mountEl : runtime.domRefs.mountsByMountKey[mountKey];
    if (!mountEl || spinnerEl.parentNode !== mountEl) {
      return false;
    }
    syncLoadingCaption(spinnerEl, resolveLoadingMessage(_KDB, options));
    return true;
  }

  return {
    resolveLoadingMessage: resolveLoadingMessage,
    syncLoadingCaption: syncLoadingCaption,
    syncLoadingSessionCaption: syncLoadingSessionCaption,
    updateLoadingMessage: updateLoadingMessage
  };
});
