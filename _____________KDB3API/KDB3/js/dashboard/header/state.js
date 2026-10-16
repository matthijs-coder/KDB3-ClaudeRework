define(["./config.js", "./iconKeys.js"], function (_config, _iconKeys) {
  "use strict";
  // Field `status` (`idle`|`active`|`removed`) is domain chrome presence, not the module's optional `lifecycle`.

  function createInitialHeaderState() {
    return {
      status: "idle",
      subtitleStatus: "removed",
      titleText: "",
      subtitleText: "",
      iconKey: _config.DEFAULT_ICON_KEY,
      activeEditableTarget: null,
      editTarget: null,
      editStatus: "idle",
      pendingEdit: null
    };
  }

  function clonePendingEdit(_pendingEdit) {
    if (!_pendingEdit) return null;
    return {
      target: _pendingEdit.target,
      status: _pendingEdit.status,
      subtitleStatus: _pendingEdit.subtitleStatus,
      titleText: _pendingEdit.titleText,
      subtitleText: _pendingEdit.subtitleText,
      text: _pendingEdit.text
    };
  }

  function copyState(_state) {
    return {
      status: _state.status,
      subtitleStatus: _state.subtitleStatus,
      titleText: _state.titleText,
      subtitleText: _state.subtitleText,
      iconKey: _state.iconKey || _config.DEFAULT_ICON_KEY,
      activeEditableTarget: _state.activeEditableTarget || null,
      editTarget: _state.editTarget,
      editStatus: _state.editStatus || "idle",
      pendingEdit: clonePendingEdit(_state.pendingEdit)
    };
  }

  function createPendingEdit(_target, _state) {
    return {
      target: _target,
      status: _state.status,
      subtitleStatus: _state.subtitleStatus,
      titleText: _state.titleText,
      subtitleText: _state.subtitleText,
      text: _target === "subtitle" ? _state.subtitleText : _state.titleText
    };
  }

  function clearEdit(_next) {
    _next.activeEditableTarget = null;
    _next.editTarget = null;
    _next.editStatus = "idle";
    _next.pendingEdit = null;
  }

  function isEditOpen(_state) {
    return (
      _state.activeEditableTarget != null ||
      _state.editTarget != null ||
      (!!_state.editStatus && _state.editStatus !== "idle") ||
      _state.pendingEdit != null
    );
  }

  function normalizeSubtitleStatus(_status) {
    return _status === "active" || _status === "visible" ? "active" : "removed";
  }

  function normalizeText(_text) {
    return String(_text || "").trim();
  }

  function readTextPayload(_payload, _fallback) {
    return typeof _payload.text === "string" ? _payload.text : _fallback || "";
  }

  function normalizeInactive(_state) {
    var next = copyState(_state);
    if (next.status !== "active") {
      next.subtitleStatus = "removed";
      clearEdit(next);
    }
    return next;
  }

  function readActiveEditTarget(_state) {
    var target = _state && (_state.activeEditableTarget || (_state.editTarget === "mainTitle" ? "title" : _state.editTarget));
    return target === "title" || target === "subtitle" ? target : null;
  }

  function snapshotChrome(_state) {
    return {
      status: _state.status,
      subtitleStatus: _state.subtitleStatus,
      titleText: _state.titleText,
      subtitleText: _state.subtitleText
    };
  }

  function snapshotBeforeCommit(_state) {
    var pending = _state && _state.pendingEdit;
    return pending ? snapshotChrome(pending) : snapshotChrome(_state);
  }

  function isSameChrome(_a, _b) {
    return (
      _a.status === _b.status &&
      _a.subtitleStatus === _b.subtitleStatus &&
      _a.titleText === _b.titleText &&
      _a.subtitleText === _b.subtitleText
    );
  }

  function reduceToggle(_state) {
    var next = copyState(_state);
    next.status = next.status === "active" ? "removed" : "active";
    return normalizeInactive(next);
  }

  function reduceShow(_state) {
    if (_state.status === "active") return _state;
    var next = copyState(_state);
    next.status = "active";
    return normalizeInactive(next);
  }

  function reduceHide(_state) {
    if (_state.status !== "active") return _state;
    var next = copyState(_state);
    next.status = "removed";
    return normalizeInactive(next);
  }

  function reduceToggleSubtitle(_state) {
    if (_state.status !== "active") return _state;
    var next = copyState(_state);
    next.subtitleStatus = normalizeSubtitleStatus(next.subtitleStatus) === "active" ? "removed" : "active";
    if (next.subtitleStatus === "removed") next.subtitleText = "";
    clearEdit(next);
    return next;
  }

  function reduceSetSubtitleChrome(_state, _payload) {
    if (_state.status !== "active") return _state;
    var desiredStatus = normalizeSubtitleStatus(_payload.subtitleStatus);
    var desiredText = typeof _payload.subtitleText === "string" ? normalizeText(_payload.subtitleText) : _state.subtitleText;
    if (normalizeSubtitleStatus(_state.subtitleStatus) === desiredStatus && String(_state.subtitleText || "") === String(desiredText || "")) {
      return _state;
    }
    var next = copyState(_state);
    next.subtitleStatus = desiredStatus;
    next.subtitleText = desiredStatus === "removed" ? "" : desiredText;
    clearEdit(next);
    return next;
  }

  function reduceStartTitleEdit(_state) {
    if (_state.status !== "active") return _state;
    var next = copyState(_state);
    next.activeEditableTarget = "title";
    next.editTarget = "mainTitle";
    next.editStatus = "pending";
    next.pendingEdit = createPendingEdit("title", _state);
    return next;
  }

  function reduceStartSubtitleEdit(_state) {
    if (_state.status !== "active") return _state;
    var next = copyState(_state);
    next.activeEditableTarget = "subtitle";
    next.editTarget = "subtitle";
    next.editStatus = "pending";
    next.pendingEdit = createPendingEdit("subtitle", _state);
    if (normalizeSubtitleStatus(next.subtitleStatus) !== "active") next.subtitleStatus = "active";
    return next;
  }

  function reduceCommitTitle(_state, _payload) {
    if (_state.activeEditableTarget !== "title" && _state.editTarget !== "mainTitle") return _state;
    var next = copyState(_state);
    next.titleText = normalizeText(readTextPayload(_payload, next.titleText));
    clearEdit(next);
    return normalizeInactive(next);
  }

  function reduceCommitSubtitle(_state, _payload) {
    if (_state.activeEditableTarget !== "subtitle" && _state.editTarget !== "subtitle") return _state;
    var next = copyState(_state);
    var subtitleText = normalizeText(readTextPayload(_payload, next.subtitleText));
    next.subtitleStatus = subtitleText === "" ? "removed" : "active";
    next.subtitleText = subtitleText;
    clearEdit(next);
    return normalizeInactive(next);
  }

  function reduceCancelEdit(_state) {
    var next = copyState(_state);
    clearEdit(next);
    return normalizeInactive(next);
  }

  function reduceSetTitleText(_state, _payload) {
    var desired = normalizeText(_payload.titleText);
    if (String(_state.titleText || "") === desired && !isEditOpen(_state)) return _state;
    var next = copyState(_state);
    next.titleText = desired;
    clearEdit(next);
    return normalizeInactive(next);
  }

  function reduceSetSubtitleText(_state, _payload) {
    var desiredStatus = normalizeSubtitleStatus(_payload.subtitleStatus);
    var desiredText = desiredStatus === "removed" ? "" : normalizeText(_payload.subtitleText);
    var unchanged =
      String(_state.subtitleText || "") === desiredText && normalizeSubtitleStatus(_state.subtitleStatus) === desiredStatus;
    if (unchanged && !isEditOpen(_state)) return _state;
    var next = copyState(_state);
    next.subtitleStatus = desiredStatus;
    next.subtitleText = desiredText;
    clearEdit(next);
    return normalizeInactive(next);
  }

  function reduceSetIcon(_state, _payload) {
    var raw = _payload.iconKey;
    if (typeof raw !== "string") return _state;
    var iconKey = _iconKeys.isDefaultHeaderIcon(raw) ? _config.DEFAULT_ICON_KEY : _iconKeys.normalizeHeaderIconStem(raw);
    if (!_iconKeys.isSafeIconKey(iconKey)) iconKey = _config.DEFAULT_ICON_KEY;
    if (String(_state.iconKey || "") === iconKey) return _state;
    var next = copyState(_state);
    next.iconKey = iconKey;
    return normalizeInactive(next);
  }

  function reduceHeader(_state, _action) {
    if (!_state || !_action || typeof _action.type !== "string") return _state;
    var payload = _action.payload || {};
    switch (_action.type) {
      case "header/toggle": return reduceToggle(_state);
      case "header/show": return reduceShow(_state);
      case "header/hide": return reduceHide(_state);
      case "header/toggleSubtitle": return reduceToggleSubtitle(_state);
      case "header/setSubtitleChrome": return reduceSetSubtitleChrome(_state, payload);
      case "header/startTitleEdit": return reduceStartTitleEdit(_state);
      case "header/startSubtitleEdit": return reduceStartSubtitleEdit(_state);
      case "header/commitTitle": return reduceCommitTitle(_state, payload);
      case "header/commitSubtitle": return reduceCommitSubtitle(_state, payload);
      case "header/cancelEdit": return reduceCancelEdit(_state);
      case "header/setTitleText": return reduceSetTitleText(_state, payload);
      case "header/setSubtitleText": return reduceSetSubtitleText(_state, payload);
      case "header/setIcon": return reduceSetIcon(_state, payload);
      default: return _state;
    }
  }

  return {
    createInitialHeaderState: createInitialHeaderState,
    reduceHeader: reduceHeader,
    readActiveEditTarget: readActiveEditTarget,
    snapshotChrome: snapshotChrome,
    snapshotBeforeCommit: snapshotBeforeCommit,
    isSameChrome: isSameChrome
  };
});
