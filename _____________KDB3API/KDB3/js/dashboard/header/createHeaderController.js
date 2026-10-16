define([
  "./state/createHeaderReducer",
  "./state/initialState",
  "./effects/__orchestratorHeaderEffects",
  "./history/pushHeaderHistoryStep",
  "./history/createHeaderHistoryReplayHandler",
  "./actions/handleParameterSetRestore",
  "./runtime/cleanupHeaderRuntime",
], function (_createHeaderReducer, _initialState, _headerEffects, _maybePushHistory, _createHandler, _handleParameterSetRestore, _cleanupHeaderRuntime) {
  "use strict";
  function stageHeaderHistoryReplayHandler(_KDB) {
    var rt = _KDB.runtime && _KDB.runtime.header;
    if (!rt) {
      return null;
    }
    var handler = _createHandler(_KDB);
    rt.historyReplayHandlerContribution = handler;
    return handler;
  }
  var SOURCE = { kdbControl: 1, api: 1, bootstrap: 1 };
  function validSource(s) {
    return typeof s === "string" && SOURCE[s];
  }
  function snapshotChrome(st) {
    return {
      status: st.status,
      subtitleStatus: st.subtitleStatus,
      titleText: st.titleText,
      subtitleText: st.subtitleText,
    };
  }
  function snapshotBeforeCommit(st) {
    var pe = st && st.pendingEdit;
    if (!pe) return snapshotChrome(st);
    return {
      status: pe.status,
      subtitleStatus: pe.subtitleStatus,
      titleText: pe.titleText,
      subtitleText: pe.subtitleText,
    };
  }
  function readEditableText(_KDB, target) {
    var dr = _KDB.runtime && _KDB.runtime.header && _KDB.runtime.header.domRefs;
    var node = target === "subtitle" ? dr && dr.subtitleEl : dr && dr.titleEl;
    return node ? String(node.textContent || "") : "";
  }
  function isCommitAction(type) {
    return type === "header/commitTitle" || type === "header/commitSubtitle";
  }
  function activeCommitType(st) {
    var target = st && (st.activeEditableTarget || (st.editTarget === "mainTitle" ? "title" : st.editTarget));
    if (target === "title") return "header/commitTitle";
    if (target === "subtitle") return "header/commitSubtitle";
    return null;
  }
  function resolveHeaderMountTarget(_KDB, _options) {
    var selector = _KDB.elements && _KDB.elements.selectors && _KDB.elements.selectors.root && _KDB.elements.selectors.root.pageViewContent;
    var el = null;
    if (selector && typeof document !== "undefined" && document.querySelector) {
      el = document.querySelector(selector);
    }
    if (!el && _options && _options.mountTarget && _options.mountTarget.nodeType) {
      el = _options.mountTarget;
    }
    if (!el && !(_options && _options.mountTarget)) {
      var checks = _KDB.runtime && _KDB.runtime.cognosHost && _KDB.runtime.cognosHost.chromeChecks;
      if (checks && typeof checks.recordSyncMiss === "function") {
        checks.recordSyncMiss(_KDB, "root.pageViewContent");
      }
    }
    return el || null;
  }
  function getState(_KDB) {
    return _KDB.state.header;
  }
  function readCommitOptions(action) {
    return (action && action.options) || null;
  }
  function reduceAndEffect(_KDB, ctx, action, prevChrome) {
    var cur = _KDB.state.header;
    var next = ctx.reduce(cur, action);
    if (next === cur) return false;
    _KDB.state.header = next;
    _headerEffects(_KDB, prevChrome, action);
    _maybePushHistory(_KDB, action, cur, next, readCommitOptions(action));
    return true;
  }
  function applyRestoreAction(_KDB, ctx, a) {
    return reduceAndEffect(_KDB, ctx, a, snapshotChrome(_KDB.state.header));
  }
  function commitActiveEdit(_KDB, ctx, source) {
    var cur = _KDB.state.header;
    var commitType = activeCommitType(cur);
    if (!commitType) return false;
    var target = commitType === "header/commitSubtitle" ? "subtitle" : "title";
    return reduceAndEffect(
      _KDB,
      ctx,
      { type: commitType, payload: { source: source, text: readEditableText(_KDB, target) } },
      snapshotBeforeCommit(cur)
    );
  }
  function dispatch(_KDB, ctx, action) {
    if (ctx.disposed || !action) return false;
    if (action.type === "header/parameterSetRestoreRequested") {
      return _handleParameterSetRestore(_KDB, {
        applyAction: applyRestoreAction.bind(null, _KDB, ctx),
      }, action);
    }
    var p = action.payload || {};
    if (!validSource(p.source)) return false;
    var cur = _KDB.state.header;
    var t = action.type;
    if (t === "header/startTitleEdit" && cur && cur.activeEditableTarget === "subtitle") {
      commitActiveEdit(_KDB, ctx, p.source);
      cur = _KDB.state.header;
    } else if (t === "header/startSubtitleEdit" && cur && cur.activeEditableTarget === "title") {
      commitActiveEdit(_KDB, ctx, p.source);
      cur = _KDB.state.header;
    }
    var prev = isCommitAction(t) ? snapshotBeforeCommit(cur) : snapshotChrome(cur);
    return reduceAndEffect(_KDB, ctx, action, prev);
  }
  function mount(_KDB, ctx, options) {
    try {
      ctx.disposed = false;
      _KDB.runtime.header.domRefs.mountTargetEl = resolveHeaderMountTarget(_KDB, options);
      stageHeaderHistoryReplayHandler(_KDB);
      _headerEffects(_KDB, snapshotChrome(_initialState()), { type: "__mountSync", payload: { source: "bootstrap" } });
    } catch (err) {
      console.error("[header.mount]", err);
    }
  }
  function destroy(_KDB, ctx) {
    try {
      ctx.disposed = true;
      _cleanupHeaderRuntime(_KDB);
    } catch (err2) {
      console.error("[header.destroy]", err2);
    }
  }
  function createHeaderController(_KDB) {
    var ctx = { reduce: _createHeaderReducer(), disposed: false };
    return {
      mount: mount.bind(null, _KDB, ctx),
      destroy: destroy.bind(null, _KDB, ctx),
      dispatch: dispatch.bind(null, _KDB, ctx),
      getState: getState.bind(null, _KDB),
    };
  }
  return createHeaderController;
});
