define([
  "../../cognosHost/config/rootChromeSelectors.js",
  "../../utils/kit/runtime.js",
  "./caption.js",
  "./config.js",
  "./state.js",
  "./watchdog.js"
], function (_rootChrome, _rt, _caption, _config, _state, _watchdog) {
  "use strict";

  var SPINNER_HTML = [
    '<div class="loadingIndicatorContainer __VARIANT_CLASS__"><div class="loading_indicator">',
    '<span role="progressbar" class="ba-common-progressIndicator is-large is-circle">',
    '<svg viewBox="25 25 50 50"><circle class="is-background" cx="50" cy="50" r="20"></circle>',
    '<circle cx="50" cy="50" r="20"></circle>',
    '<text class="ba-common-progressIndicator__progressPercentage" text-anchor="middle" transform="rotate(90 50,50)" x="50" y="55"></text>',
    '</svg></span></div><p class="KDB_loadingMessage"></p></div>'
  ].join("");

  function isElement(node) {
    return !!node && node.nodeType === 1;
  }

  // Start and reconcile resolve from the options only. Finish passes the runtime so a bare key or handle
  // finds the mount it started with; once a key is given there is no fallback to the default widget.
  function resolveMount(_KDB, options, runtime) {
    var opts = options || {};
    var handle = runtime ? opts.handle : null;
    var lookupKey = runtime ? (handle && handle.mountKey) || opts.mountKey : null;
    var mountEl = null;
    if (isElement(opts.mountEl)) {
      mountEl = opts.mountEl;
    } else if (handle && isElement(handle.mountEl)) {
      mountEl = handle.mountEl;
    } else if (lookupKey) {
      mountEl = runtime.domRefs.mountsByMountKey[lookupKey] || null;
    } else {
      mountEl = (_KDB.elements && _KDB.elements.kdbWidget) || null;
    }
    return { mountEl: mountEl, mountKey: resolveMountKey(mountEl, opts, handle, !!runtime) };
  }

  // Start and reconcile accept only a non-empty string key; finish accepts any truthy key (as before).
  function resolveMountKey(mountEl, opts, handle, isFinish) {
    if (isFinish ? opts.mountKey : typeof opts.mountKey === "string" && opts.mountKey.length > 0) {
      return opts.mountKey;
    }
    if (handle && handle.mountKey) {
      return handle.mountKey;
    }
    if (mountEl && typeof mountEl.id === "string" && mountEl.id.length > 0) {
      return mountEl.id;
    }
    return _config.ROOT_MOUNT_KEY;
  }

  function resolveSpinnerSelector(_KDB) {
    var rootSelectors = _KDB.elements && _KDB.elements.selectors ? _KDB.elements.selectors.root : null;
    return rootSelectors && rootSelectors.loadingIndicatorSelector
      ? rootSelectors.loadingIndicatorSelector
      : _rootChrome.root.strings.loadingIndicatorSelector;
  }

  // A static mount needs position: relative for the overlay. The decision is made when an overlay opens
  // on the mount; further starts on the same loading mount skip the style read.
  function ensureMountPositioning(runtime, mountEl, mountKey, isAlreadyLoading) {
    if (isAlreadyLoading || window.getComputedStyle(mountEl).position !== "static") {
      return;
    }
    runtime.domRefs.positionOverridesByMountKey[mountKey] = mountEl.style.position || "";
    mountEl.style.position = "relative";
  }

  function ensureSpinner(_KDB, runtime, mountEl, mountKey, isTransparent, caption) {
    var spinnerSelector = resolveSpinnerSelector(_KDB);
    var spinnerEl;
    if (!spinnerSelector) {
      return;
    }
    spinnerEl = mountEl.querySelector(":scope > " + spinnerSelector);
    if (!spinnerEl) {
      mountEl.insertAdjacentHTML("beforeend", SPINNER_HTML.replace("__VARIANT_CLASS__", isTransparent ? "loadingIndicatorTransparent" : "loadingIndicatorSolid"));
      spinnerEl = mountEl.querySelector(":scope > " + spinnerSelector);
    }
    runtime.domRefs.spinnersByMountKey[mountKey] = spinnerEl;
    _caption.syncLoadingCaption(spinnerEl, caption);
  }

  function removeSpinner(spinnerEl) {
    if (spinnerEl && spinnerEl.parentNode) {
      spinnerEl.parentNode.removeChild(spinnerEl);
    }
  }

  function restoreMount(mountEl, originalPosition) {
    if (!mountEl || !mountEl.classList) {
      return;
    }
    mountEl.classList.remove("KDB_loading");
    if (typeof originalPosition === "string") {
      mountEl.style.position = originalPosition;
    }
  }

  function startOverlay(_KDB, options) {
    var target = resolveMount(_KDB, options);
    var mountEl = target.mountEl;
    var mountKey = target.mountKey;
    var runtime;
    var wasLoadingOnMount;
    var sessionCaption;
    if (!mountEl) {
      return null;
    }
    runtime = _state.ensureLoadingRuntime(_KDB);
    wasLoadingOnMount = runtime.domRefs.mountsByMountKey[mountKey] === mountEl && mountEl.classList.contains("KDB_loading");
    sessionCaption = _caption.resolveLoadingMessage(_KDB, {
      message: options && options.sessionMessage,
      messageKey: options && options.sessionMessageKey
    });
    runtime.domRefs.mountsByMountKey[mountKey] = mountEl;
    _state.markLoadingStarted(_KDB, mountKey);
    ensureMountPositioning(runtime, mountEl, mountKey, wasLoadingOnMount);
    mountEl.classList.add("KDB_loading");
    ensureSpinner(_KDB, runtime, mountEl, mountKey, !!options && options.transparent === true, _caption.resolveLoadingMessage(_KDB, options));
    _caption.syncLoadingSessionCaption(runtime.domRefs.spinnersByMountKey[mountKey], sessionCaption);
    _watchdog.scheduleLoadingWatchdog(_KDB, { mountEl: mountEl, mountKey: mountKey, watchdogMs: options && options.watchdogMs });
    return { mountKey: mountKey, mountEl: mountEl };
  }

  function applyOverlayRemoval(_KDB, mountKey) {
    var runtime = _state.ensureLoadingRuntime(_KDB);
    var domRefs = runtime.domRefs;
    var snapshot = domRefs.pendingRemovalByMountKey[mountKey];
    var spinnerEl;
    if (!snapshot) {
      return false;
    }
    _rt.clearTimer(runtime.timers.removeDelaysByMountKey, mountKey);
    spinnerEl = snapshot.spinnerEl || (snapshot.mountEl && snapshot.mountEl.querySelector(resolveSpinnerSelector(_KDB)));
    removeSpinner(spinnerEl);
    restoreMount(snapshot.mountEl, snapshot.hadPositionOverride === true ? snapshot.originalPosition : undefined);
    if (domRefs.mountsByMountKey[mountKey] === snapshot.mountEl) {
      delete domRefs.mountsByMountKey[mountKey];
      delete domRefs.positionOverridesByMountKey[mountKey];
    }
    if (domRefs.spinnersByMountKey[mountKey] === snapshot.spinnerEl || domRefs.spinnersByMountKey[mountKey] === spinnerEl) {
      delete domRefs.spinnersByMountKey[mountKey];
    }
    delete domRefs.pendingRemovalByMountKey[mountKey];
    return true;
  }

  function runScheduledRemoval(_KDB, mountKey) {
    try {
      applyOverlayRemoval(_KDB, mountKey);
    } catch (error) {
      console.error("[loadingService.runScheduledRemoval] failed", { mountKey: mountKey }, error);
    }
  }

  function scheduleOverlayRemoval(_KDB, mountEl, mountKey, removeDelayMs) {
    var runtime = _state.ensureLoadingRuntime(_KDB);
    var domRefs = runtime.domRefs;
    var delay = Number(removeDelayMs);
    var delayMs = Number.isFinite(delay) && delay >= 0 ? delay : _config.DEFAULT_REMOVE_DELAY_MS;
    var existing = domRefs.pendingRemovalByMountKey[mountKey];
    var isLive;
    if (existing && existing.mountEl !== mountEl) {
      applyOverlayRemoval(_KDB, mountKey);
    }
    _rt.clearTimer(runtime.timers.removeDelaysByMountKey, mountKey);
    isLive = domRefs.mountsByMountKey[mountKey] === mountEl;
    domRefs.pendingRemovalByMountKey[mountKey] = {
      mountEl: mountEl,
      spinnerEl: isLive ? (domRefs.spinnersByMountKey[mountKey] || null) : null,
      hadPositionOverride: isLive && Object.prototype.hasOwnProperty.call(domRefs.positionOverridesByMountKey, mountKey),
      originalPosition: isLive ? domRefs.positionOverridesByMountKey[mountKey] : undefined
    };
    _rt.scheduleTimeout(runtime.timers.removeDelaysByMountKey, mountKey, runScheduledRemoval.bind(null, _KDB, mountKey), delayMs);
  }

  // A new start on the mount of a pending removal cancels it; on another mount the old removal completes first.
  function reconcilePendingRemoval(_KDB, options) {
    var target = resolveMount(_KDB, options);
    var runtime = _state.ensureLoadingRuntime(_KDB);
    var snapshot = runtime.domRefs.pendingRemovalByMountKey[target.mountKey];
    if (!snapshot) {
      return;
    }
    if (target.mountEl && snapshot.mountEl === target.mountEl) {
      _rt.clearTimer(runtime.timers.removeDelaysByMountKey, target.mountKey);
      delete runtime.domRefs.pendingRemovalByMountKey[target.mountKey];
      return;
    }
    applyOverlayRemoval(_KDB, target.mountKey);
  }

  function finishOverlay(_KDB, options) {
    var runtime = _state.ensureLoadingRuntime(_KDB);
    var target = resolveMount(_KDB, options, runtime);
    var hasKey = !!options && !!(options.mountKey || (options.handle && options.handle.mountKey));
    var entry;
    if (!target.mountEl && !hasKey) {
      return;
    }
    entry = _state.markLoadingFinished(_KDB, target.mountKey);
    if (entry.activeCount > 0) {
      return;
    }
    _watchdog.clearWatchdog(runtime, target.mountKey);
    if (target.mountEl) {
      scheduleOverlayRemoval(_KDB, target.mountEl, target.mountKey, options && options.removeDelayMs);
    }
    _state.pruneFinishedLoading(_KDB, target.mountKey);
  }

  // Destroy: DOM first (needs the refs), then the kit cancels timers and resets the buckets.
  function clearOverlays(runtime) {
    var domRefs = runtime.domRefs;
    Object.keys(domRefs.pendingRemovalByMountKey).forEach(function (key) {
      var snapshot = domRefs.pendingRemovalByMountKey[key];
      removeSpinner(snapshot.spinnerEl);
      restoreMount(snapshot.mountEl, snapshot.hadPositionOverride === true ? snapshot.originalPosition : undefined);
    });
    Object.keys(domRefs.spinnersByMountKey).forEach(function (key) {
      removeSpinner(domRefs.spinnersByMountKey[key]);
    });
    Object.keys(domRefs.mountsByMountKey).forEach(function (key) {
      restoreMount(domRefs.mountsByMountKey[key], domRefs.positionOverridesByMountKey[key]);
    });
  }

  return {
    clearOverlays: clearOverlays,
    finishOverlay: finishOverlay,
    reconcilePendingRemoval: reconcilePendingRemoval,
    startOverlay: startOverlay
  };
});
