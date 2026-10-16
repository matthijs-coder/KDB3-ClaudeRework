define(["./headerReducerHelpers", "./reduceHeaderIcon"], function (_h, _reduceHeaderIcon) {
  "use strict";
  function createHeaderReducer() {
    return function reduce(state, action) {
      if (!state || !action || typeof action.type !== "string") return state;
      var t = action.type;
      var p = action.payload || {};
      var next = _h.copy(state);
      if (t === "header/toggle") {
        if (next.status === "active") next.status = "removed";
        else next.status = "active";
        return _h.normalizeInactive(next);
      }
      if (t === "header/show") {
        if (state.status === "active") return state;
        next.status = "active";
        return _h.normalizeInactive(next);
      }
      if (t === "header/hide") {
        if (state.status !== "active") return state;
        next.status = "removed";
        return _h.normalizeInactive(next);
      }
      if (t === "header/toggleSubtitle") {
        if (next.status !== "active") return state;
        next.subtitleStatus = _h.normalizeSubtitleStatus(next.subtitleStatus) === "active" ? "removed" : "active";
        if (next.subtitleStatus === "removed") next.subtitleText = "";
        _h.clearEdit(next);
        return next;
      }
      if (t === "header/setSubtitleChrome") {
        if (next.status !== "active") return state;
        var desiredSubtitleStatus = _h.normalizeSubtitleStatus(p.subtitleStatus);
        var desiredSubtitleText =
          typeof p.subtitleText === "string" ? _h.normalizeSubtitleText(p.subtitleText) : next.subtitleText;
        if (
          _h.normalizeSubtitleStatus(state.subtitleStatus) === desiredSubtitleStatus &&
          String(state.subtitleText || "") === String(desiredSubtitleText || "")
        ) {
          return state;
        }
        next.subtitleStatus = desiredSubtitleStatus;
        next.subtitleText = desiredSubtitleStatus === "removed" ? "" : desiredSubtitleText;
        _h.clearEdit(next);
        return next;
      }
      if (t === "header/startTitleEdit") {
        if (next.status !== "active") return state;
        next.activeEditableTarget = "title";
        next.editTarget = "mainTitle";
        next.editStatus = "pending";
        next.pendingEdit = _h.createPendingEdit("title", state);
        next.draftTitleText = next.titleText;
        next.draftSubtitleText = "";
        return next;
      }
      if (t === "header/startSubtitleEdit") {
        if (next.status !== "active") return state;
        next.activeEditableTarget = "subtitle";
        next.editTarget = "subtitle";
        next.editStatus = "pending";
        next.pendingEdit = _h.createPendingEdit("subtitle", state);
        if (_h.normalizeSubtitleStatus(next.subtitleStatus) !== "active") next.subtitleStatus = "active";
        next.draftSubtitleText = next.subtitleText;
        next.draftTitleText = "";
        return next;
      }
      if (t === "header/commitTitle") {
        if (state.activeEditableTarget !== "title" && state.editTarget !== "mainTitle") return state;
        next.titleText = _h.normalizeTitleText(_h.readTextPayload(p, next.titleText));
        _h.clearEdit(next);
        return _h.normalizeInactive(next);
      }
      if (t === "header/commitSubtitle") {
        if (state.activeEditableTarget !== "subtitle" && state.editTarget !== "subtitle") return state;
        var subtitleText = _h.normalizeSubtitleText(_h.readTextPayload(p, next.subtitleText));
        if (subtitleText === "") {
          next.subtitleStatus = "removed";
          next.subtitleText = "";
        } else {
          next.subtitleStatus = "active";
          next.subtitleText = subtitleText;
        }
        _h.clearEdit(next);
        return _h.normalizeInactive(next);
      }
      if (t === "header/cancelEdit") {
        _h.clearEdit(next);
        return _h.normalizeInactive(next);
      }
      if (t === "header/setTitleText") {
        var desiredTitle = _h.normalizeTitleText(p.titleText);
        var titleUnchanged = String(state.titleText || "") === desiredTitle;
        var titleEditOpen =
          state.activeEditableTarget != null ||
          state.editTarget != null ||
          (state.editStatus && state.editStatus !== "idle") ||
          state.pendingEdit != null ||
          String(state.draftTitleText || "") !== "" ||
          String(state.draftSubtitleText || "") !== "";
        if (titleUnchanged && !titleEditOpen) return state;
        next.titleText = desiredTitle;
        _h.clearEdit(next);
        return _h.normalizeInactive(next);
      }
      if (t === "header/setSubtitleText") {
        var desiredSub = _h.normalizeSubtitleText(p.subtitleText);
        var desiredSubStatus = _h.normalizeSubtitleStatus(p.subtitleStatus);
        if (desiredSubStatus === "removed") {
          desiredSubStatus = "removed";
          desiredSub = "";
        } else {
          desiredSubStatus = "active";
        }
        var subUnchanged =
          String(state.subtitleText || "") === desiredSub &&
          _h.normalizeSubtitleStatus(state.subtitleStatus) === desiredSubStatus;
        var subEditOpen =
          state.activeEditableTarget != null ||
          state.editTarget != null ||
          (state.editStatus && state.editStatus !== "idle") ||
          state.pendingEdit != null ||
          String(state.draftTitleText || "") !== "" ||
          String(state.draftSubtitleText || "") !== "";
        if (subUnchanged && !subEditOpen) return state;
        next.subtitleStatus = desiredSubStatus;
        next.subtitleText = desiredSub;
        _h.clearEdit(next);
        return _h.normalizeInactive(next);
      }
      if (t === "header/setIcon") {
        return _reduceHeaderIcon(state, next, p);
      }
      return state;
    };
  }
  return createHeaderReducer;
});
