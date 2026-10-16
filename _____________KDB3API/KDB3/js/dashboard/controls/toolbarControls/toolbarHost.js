/*
 * Shared toolbar host for all toolbar buttons: ONE wait for the action bar, ONE MutationObserver on
 * document.body, one coalesced sync, and the declared button order (config.BUTTON_ORDER).
 *
 * Lifecycle is reference counted by attached buttons (mount = attach, destroy = detach): the first attach
 * starts the wait, the observer is created when the toolbar is found, and the last detach disconnects
 * everything. The order in which KDB.js mounts and destroys the buttons does not matter.
 *
 * State lives in _KDB.runtime.toolbarControls (kit buckets: abortControllers.hostWait,
 * pendingPromises.hostWait, observers.toolbar, timers.toolbarSync, domRefs.toolbarHostEl).
 */
define([
  "./config.js",
  "./iconHref.js",
  "../../../core/utils/kit/runtime.js"
], function (_config, _iconHref, _rt) {
  "use strict";

  var BIND_SCOPE_SUFFIX = "Bind";

  function ensureHostRuntime(_KDB) {
    return _rt.ensureRuntime(_KDB, "toolbarControls", { buttons: {}, isHostReady: false, dashboardFacet: null });
  }

  function readToolbarHostSelector(_KDB) {
    var toolbar = _KDB.elements && _KDB.elements.selectors ? _KDB.elements.selectors.toolbar : null;
    return toolbar && toolbar.actionBarLeadingSelector ? toolbar.actionBarLeadingSelector : null;
  }

  // Reads runtime.cognosHost.chromeChecks (foreign runtime read, see phase 2 requests).
  function trackChromeWait(_KDB, key, promise) {
    var checks = _KDB.runtime && _KDB.runtime.cognosHost && _KDB.runtime.cognosHost.chromeChecks;
    if (!checks || typeof checks.trackWait !== "function") return promise;
    return checks.trackWait(_KDB, key, promise);
  }

  function precedes(leftEl, rightEl) {
    return !!(leftEl.compareDocumentPosition(rightEl) & Node.DOCUMENT_POSITION_FOLLOWING);
  }

  // anchorEl is the leftmost root of the buttons declared to the right of this one.
  function positionRoot(hostEl, rootEl, anchorEl) {
    if (rootEl.parentNode !== hostEl) {
      hostEl.insertBefore(rootEl, anchorEl || hostEl.firstChild || null);
      return;
    }
    if (anchorEl && !precedes(rootEl, anchorEl)) hostEl.insertBefore(rootEl, anchorEl);
  }

  function bindButtonRoot(_KDB, rt, inst, rootEl) {
    var key = inst.id + BIND_SCOPE_SUFFIX;
    var scope = new AbortController();
    if (rt.abortControllers[key]) rt.abortControllers[key].abort();
    rt.abortControllers[key] = scope;
    inst.def.bind(_KDB, inst, scope.signal);
    inst.boundRootEl = rootEl;
  }

  function findButtonRoot(hostEl, inst, id) {
    if (inst && inst.refs.rootEl && inst.refs.rootEl.parentNode === hostEl) return inst.refs.rootEl;
    return hostEl.querySelector(inst ? inst.def.rootSelector : _config.buildRootSelector(id));
  }

  function placeButton(_KDB, rt, inst, hostEl, anchorEl, readTone) {
    var def = inst.def;
    var rootEl = findButtonRoot(hostEl, inst, inst.id);
    var isFirstPlacement = !inst.isInitialized;
    if (isFirstPlacement) {
      if (def.initialize) def.initialize(_KDB, inst);
      inst.isInitialized = true;
    }
    if (!rootEl) rootEl = def.buildRoot(_KDB, inst, readTone);
    positionRoot(hostEl, rootEl, anchorEl);
    if (inst.refs.rootEl !== rootEl) inst.refs = def.collectRefs(rootEl);
    if (inst.boundRootEl !== rootEl) bindButtonRoot(_KDB, rt, inst, rootEl);
    if (isFirstPlacement || inst.syncedRootEl !== rootEl) {
      def.sync(_KDB, inst);
      inst.syncedRootEl = rootEl;
    }
    if (def.refreshIcon) def.refreshIcon(_KDB, inst, readTone);
    return rootEl;
  }

  function placeButtonSafely(_KDB, rt, inst, hostEl, anchorEl, readTone) {
    try {
      return placeButton(_KDB, rt, inst, hostEl, anchorEl, readTone);
    } catch (error) {
      console.error("[" + inst.def.apiName + ".place]", error);
      return inst.refs.rootEl && inst.refs.rootEl.parentNode === hostEl ? inst.refs.rootEl : null;
    }
  }

  function createToneReader(hostEl) {
    var tone;
    return function readTone() {
      if (tone === undefined) tone = _iconHref.readToolbarIconTone(hostEl);
      return tone;
    };
  }

  // Walks the declared order from right to left so each button knows its right-hand neighbour.
  function syncToolbar(_KDB, rt, knownHostEl) {
    var hostEl = knownHostEl || document.querySelector(readToolbarHostSelector(_KDB));
    var readTone;
    var anchorEl = null;
    var rootEl;
    var inst;
    var index;
    if (!hostEl) return;
    rt.domRefs.toolbarHostEl = hostEl;
    readTone = createToneReader(hostEl);
    for (index = _config.BUTTON_ORDER.length - 1; index >= 0; index -= 1) {
      inst = rt.buttons[_config.BUTTON_ORDER[index]];
      if (inst) rootEl = placeButtonSafely(_KDB, rt, inst, hostEl, anchorEl, readTone);
      else rootEl = findButtonRoot(hostEl, null, _config.BUTTON_ORDER[index]);
      if (rootEl) anchorEl = rootEl;
    }
  }

  function runToolbarSync(_KDB, rt) {
    if (!rt.isHostReady) return;
    try {
      syncToolbar(_KDB, rt, null);
    } catch (error) {
      console.error("[toolbarControls.sync]", error);
    }
  }

  function scheduleToolbarSync(_KDB, rt) {
    if (rt.timers.toolbarSync) return;
    _rt.scheduleFrame(rt.timers, "toolbarSync", runToolbarSync.bind(null, _KDB, rt));
  }

  function bindToolbarObserver(_KDB, rt) {
    if (rt.observers.toolbar) return;
    if (typeof MutationObserver !== "function" || !document.body) return;
    rt.observers.toolbar = new MutationObserver(scheduleToolbarSync.bind(null, _KDB, rt));
    rt.observers.toolbar.observe(document.body, { childList: true, subtree: true });
  }

  function onToolbarFound(_KDB, rt, scope, hostEl) {
    if (scope.signal.aborted || !hostEl) return;
    rt.isHostReady = true;
    syncToolbar(_KDB, rt, hostEl);
    bindToolbarObserver(_KDB, rt);
  }

  function startToolbarWait(_KDB, rt) {
    var scope;
    var promise;
    if (rt.pendingPromises.hostWait) return true;
    scope = new AbortController();
    rt.abortControllers.hostWait = scope;
    promise = trackChromeWait(
      _KDB,
      _config.TOOLBAR_WAIT_TRACK_KEY,
      _KDB.utils.waitForElObserver(readToolbarHostSelector(_KDB), document, {
        timeoutMs: _config.TOOLBAR_WAIT_TIMEOUT_MS,
        signal: scope.signal
      })
    )
      .then(onToolbarFound.bind(null, _KDB, rt, scope))
      .catch(function (error) {
        if (!error || error.code !== "ABORTED") console.error("[toolbarControls.mount]", error);
      })
      .finally(function () {
        if (rt.pendingPromises.hostWait === promise) rt.pendingPromises.hostWait = null;
        if (rt.abortControllers.hostWait === scope) rt.abortControllers.hostWait = null;
      });
    rt.pendingPromises.hostWait = promise;
    return true;
  }

  /**
   * Registers a button with the shared host (button mount). Starts the single toolbar wait when needed.
   * @returns {boolean} false when the toolbar cannot be awaited (missing util or selector)
   */
  function attachButton(_KDB, inst) {
    var rt = ensureHostRuntime(_KDB);
    var apiName = inst.def.apiName;
    if (rt.buttons[inst.id] === inst) return true;
    if (!_KDB.utils || typeof _KDB.utils.waitForElObserver !== "function") {
      console.warn("[" + apiName + ".mount] _KDB.utils.waitForElObserver is missing");
      return false;
    }
    if (!readToolbarHostSelector(_KDB)) {
      console.error("[" + apiName + ".mount] toolbar host selector is not configured");
      return false;
    }
    rt.buttons[inst.id] = inst;
    if (!rt.isHostReady) return startToolbarWait(_KDB, rt);
    runToolbarSync(_KDB, rt);
    return true;
  }

  function removeButtonRoot(inst) {
    var rootEl = inst.refs.rootEl;
    if (rootEl && rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
  }

  /** Unregisters a button (button destroy). The last detach tears down the wait, observer and timers. */
  function detachButton(_KDB, inst) {
    var rt = ensureHostRuntime(_KDB);
    var key = inst.id + BIND_SCOPE_SUFFIX;
    var errors;
    inst.isDisposed = true;
    if (rt.buttons[inst.id] !== inst) return;
    if (rt.abortControllers[key]) rt.abortControllers[key].abort();
    delete rt.abortControllers[key];
    if (inst.def.onDetach) inst.def.onDetach(_KDB, inst);
    removeButtonRoot(inst);
    delete rt.buttons[inst.id];
    if (Object.keys(rt.buttons).length > 0) return;
    errors = _rt.disposeRuntimeBuckets(rt);
    rt.isHostReady = false;
    if (errors.length) console.error("[toolbarControls.destroy] cleanup errors", errors);
  }

  return {
    attachButton: attachButton,
    detachButton: detachButton,
    ensureHostRuntime: ensureHostRuntime
  };
});
