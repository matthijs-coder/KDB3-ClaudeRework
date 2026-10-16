define([
  "../runtime/ensureLoadingRuntime.js",
  "../state/markLoadingStarted.js",
  "./scheduleLoadingWatchdog.js",
  "./resolveLoadingMessage.js",
  "./syncLoadingCaption.js",
  "./syncLoadingSessionCaption.js",
  "../../../cognosHost/config/rootChromeSelectors.js"
], function (_ensureLoadingRuntime, _markLoadingStarted, _scheduleLoadingWatchdog, _resolveLoadingMessage, _syncLoadingCaption, _syncLoadingSessionCaption, _rootChrome) {
  "use strict";

  const SPINNER_HTML = '<div class="loadingIndicatorContainer __VARIANT_CLASS__"><div class="loading_indicator"><span role="progressbar" class="ba-common-progressIndicator is-large is-circle"><svg viewBox="25 25 50 50"><circle class="is-background" cx="50" cy="50" r="20"></circle><circle cx="50" cy="50" r="20"></circle><text class="ba-common-progressIndicator__progressPercentage" text-anchor="middle" transform="rotate(90 50,50)" x="50" y="55"></text></svg></span></div><p class="KDB_loadingMessage"></p></div>';

  function __controller(_KDB, _options) {
    try {
      if (!_KDB || typeof _KDB !== "object") {
        return null;
      }

      const mountEl = resolveMountElement(_KDB, _options);
      if (!mountEl) {
        return null;
      }

      const mountKey = resolveMountKey(mountEl, _options);
      const runtime = _ensureLoadingRuntime(_KDB);
      const watchdogMs = _options && _options.watchdogMs;
      const caption = _resolveLoadingMessage(_KDB, _options);
      const sessionCaption = _resolveLoadingMessage(_KDB, {
        message: _options && _options.sessionMessage,
        messageKey: _options && _options.sessionMessageKey
      });

      runtime.domRefs.mountsByMountKey[mountKey] = mountEl;
      _markLoadingStarted(_KDB, mountKey);
      ensureMountPositioning(runtime, mountEl, mountKey);
      mountEl.classList.add("KDB_loading");
      ensureSpinner(_KDB, runtime, mountEl, mountKey, _options && _options.transparent === true, caption);
      _syncLoadingSessionCaption(runtime.domRefs.spinnersByMountKey[mountKey], sessionCaption);
      _scheduleLoadingWatchdog(_KDB, { mountEl: mountEl, mountKey: mountKey, watchdogMs: watchdogMs });

      return { mountKey: mountKey, mountEl: mountEl };
    } catch (error) {
      console.error("[loadingService.applyLoadingOverlay] failed", error);
      return null;
    }
  }

  function resolveMountElement(_KDB, _options) {
    if (_options && _options.mountEl && _options.mountEl.nodeType === 1) {
      return _options.mountEl;
    }
    return (_KDB.elements && _KDB.elements.kdbWidget) || null;
  }

  function resolveMountKey(_mountEl, _options) {
    if (_options && typeof _options.mountKey === "string" && _options.mountKey.length > 0) {
      return _options.mountKey;
    }
    if (_mountEl && typeof _mountEl.id === "string" && _mountEl.id.length > 0) {
      return _mountEl.id;
    }
    return "kdb-root-loading";
  }

  function ensureMountPositioning(runtime, mountEl, mountKey) {
    if (!mountEl || !mountKey || window.getComputedStyle(mountEl).position !== "static") {
      return;
    }
    runtime.domRefs.positionOverridesByMountKey[mountKey] = mountEl.style.position || "";
    mountEl.style.position = "relative";
  }

  function resolveSpinnerSelector(_KDB) {
    const rootSelectors = _KDB && _KDB.elements && _KDB.elements.selectors
      ? _KDB.elements.selectors.root
      : null;
    return rootSelectors && rootSelectors.loadingIndicatorSelector
      ? rootSelectors.loadingIndicatorSelector
      : _rootChrome.root.strings.loadingIndicatorSelector;
  }

  function ensureSpinner(_KDB, runtime, mountEl, mountKey, isTransparent, caption) {
    const spinnerSelector = resolveSpinnerSelector(_KDB);
    if (!spinnerSelector) return;
    const existingSpinnerEl = mountEl.querySelector(":scope > " + spinnerSelector);
    if (existingSpinnerEl) {
      runtime.domRefs.spinnersByMountKey[mountKey] = existingSpinnerEl;
      _syncLoadingCaption(existingSpinnerEl, caption);
      return;
    }

    const variantClass = isTransparent ? "loadingIndicatorTransparent" : "loadingIndicatorSolid";
    mountEl.insertAdjacentHTML("beforeend", SPINNER_HTML.replace("__VARIANT_CLASS__", variantClass));
    runtime.domRefs.spinnersByMountKey[mountKey] = mountEl.querySelector(":scope > " + spinnerSelector);
    _syncLoadingCaption(runtime.domRefs.spinnersByMountKey[mountKey], caption);
  }

  return __controller;
});
