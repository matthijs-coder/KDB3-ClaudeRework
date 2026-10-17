define([
  "./config.js",
  "./state.js",
  "./effects.js",
  "./history.js",
  "./restore.js",
  "./view.js",
  "../../core/utils/kit/runtime.js",
  "../../core/utils/kit/errors.js",
  "../../core/utils/kit/history.js"
], function (_config, _state, _effects, _history, _restore, _view, _rt, _errors, _historyKit) {
  "use strict";

  var REPLAY_KEYS = ["header_chromeChange", "header_textChange"];

  // Lifecycle terms: idle, mounted, disposed. Field `status` (`idle`|`active`|`removed`) is domain chrome presence.

  function isValidSource(_source) {
    return typeof _source === "string" && _config.VALID_SOURCES[_source] === 1;
  }

  function resolveMountTarget(_KDB, _options) {
    var selector = _KDB.elements && _KDB.elements.selectors && _KDB.elements.selectors.root && _KDB.elements.selectors.root.pageViewContent;
    var el = selector ? document.querySelector(selector) : null;
    if (!el && _options && _options.mountTarget && _options.mountTarget.nodeType) {
      el = _options.mountTarget;
    }
    if (!el && !(_options && _options.mountTarget)) {
      var checks = _KDB.runtime.cognosHost && _KDB.runtime.cognosHost.chromeChecks;
      if (checks && typeof checks.recordSyncMiss === "function") checks.recordSyncMiss(_KDB, "root.pageViewContent");
    }
    return el || null;
  }

  function readEditableText(_KDB, _target) {
    var domRefs = _KDB.runtime.header.domRefs;
    var node = _target === "subtitle" ? domRefs.subtitleEl : domRefs.titleEl;
    return node ? String(node.textContent || "") : "";
  }

  function reduceAndRunEffects(_KDB, _action, _prevChrome) {
    var current = _KDB.state.header;
    var next = _state.reduceHeader(current, _action);
    if (next === current) return false;
    _KDB.state.header = next;
    _effects.runHeaderEffects(_KDB, _prevChrome, _action);
    _history.pushHeaderHistoryStep(_KDB, _action, current, next, _action.options || null);
    return true;
  }

  function commitActiveEdit(_KDB, _source) {
    var current = _KDB.state.header;
    var target = _state.readActiveEditTarget(current);
    if (!target) return false;
    var action = {
      type: target === "subtitle" ? "header/commitSubtitle" : "header/commitTitle",
      payload: { source: _source, text: readEditableText(_KDB, target) }
    };
    return reduceAndRunEffects(_KDB, action, _state.snapshotBeforeCommit(current));
  }

  function isCommitAction(_type) {
    return _type === "header/commitTitle" || _type === "header/commitSubtitle";
  }

  function commitOtherOpenEdit(_KDB, _type, _source) {
    var openTarget = _KDB.state.header && _KDB.state.header.activeEditableTarget;
    if ((_type === "header/startTitleEdit" && openTarget === "subtitle") || (_type === "header/startSubtitleEdit" && openTarget === "title")) {
      commitActiveEdit(_KDB, _source);
    }
  }

  function applyRestoreAction(_KDB, _restoreAction) {
    return reduceAndRunEffects(_KDB, _restoreAction, _state.snapshotChrome(_KDB.state.header));
  }

  function dispatchHeaderAction(_KDB, _action) {
    if (_action.type === "header/parameterSetRestoreRequested") {
      return _restore.restoreHeaderParameterSet(_KDB, applyRestoreAction.bind(null, _KDB), _action);
    }
    var payload = _action.payload || {};
    if (!isValidSource(payload.source)) return false;
    commitOtherOpenEdit(_KDB, _action.type, payload.source);
    var current = _KDB.state.header;
    var prevChrome = isCommitAction(_action.type) ? _state.snapshotBeforeCommit(current) : _state.snapshotChrome(current);
    return reduceAndRunEffects(_KDB, _action, prevChrome);
  }

  function createHeaderController(_KDB) {
    var guard = _errors.createDisposedGuard("header");
    var rt = _rt.ensureRuntime(_KDB, "header");

    function mount(_options) {
      if (guard.blocked("mount")) return;
      if (!_KDB.services || !_KDB.services.history) {
        console.warn("[header.mount] _KDB.services.history is not available; header history commits are skipped.");
      }
      try {
        rt.domRefs.mountTargetEl = resolveMountTarget(_KDB, _options);
        rt.historyReplayHandlerContribution = _history.createHeaderReplayHandler();
        _historyKit.registerReplayKeys(_KDB, REPLAY_KEYS, rt.historyReplayHandlerContribution);
        var initialChrome = _state.snapshotChrome(_state.createInitialHeaderState());
        _effects.runHeaderEffects(_KDB, initialChrome, { type: "__mountSync", payload: { source: "bootstrap" } });
      } catch (err) {
        console.error("[header.mount]", err);
      }
    }

    function dispatch(_action) {
      if (guard.isDisposed() || !_action) return false;
      try {
        return dispatchHeaderAction(_KDB, _action);
      } catch (err) {
        console.error("[header.dispatch] " + _action.type + " failed", err);
        return false;
      }
    }

    function getState() {
      return _KDB.state.header;
    }

    function destroy() {
      if (guard.isDisposed()) return;
      guard.dispose();
      try {
        _view.removeHeaderChrome(_KDB);
        var errors = _rt.disposeRuntimeBuckets(rt);
        if (errors.length) console.error("[header.destroy] cleanup errors", errors);
        rt.currentEditTarget = null;
        rt.activeEditSource = null;
        rt.historyReplayHandlerContribution = null;
      } catch (err) {
        console.error("[header.destroy]", err);
      }
    }

    return { mount: mount, destroy: destroy, dispatch: dispatch, getState: getState };
  }

  function registerHeader(_KDB) {
    _KDB.state.header = _KDB.state.header || _state.createInitialHeaderState();
    _rt.ensureRuntime(_KDB, "header");
    _KDB.api.header = createHeaderController(_KDB);
  }

  return registerHeader;
});
