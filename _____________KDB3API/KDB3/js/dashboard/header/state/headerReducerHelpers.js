define([], function () {
  "use strict";

  function copy(s) {
    return {
      status: s.status,
      subtitleStatus: s.subtitleStatus,
      titleText: s.titleText,
      subtitleText: s.subtitleText,
      iconKey: s.iconKey || "Stadt-wien",
      activeEditableTarget: s.activeEditableTarget || null,
      editTarget: s.editTarget,
      editStatus: s.editStatus || "idle",
      pendingEdit: clonePendingEdit(s.pendingEdit),
      draftTitleText: s.draftTitleText,
      draftSubtitleText: s.draftSubtitleText,
    };
  }
  function clonePendingEdit(pe) {
    if (!pe) return null;
    return {
      target: pe.target,
      status: pe.status,
      subtitleStatus: pe.subtitleStatus,
      titleText: pe.titleText,
      subtitleText: pe.subtitleText,
      text: pe.text,
    };
  }
  function createPendingEdit(target, s) {
    return {
      target: target,
      status: s.status,
      subtitleStatus: s.subtitleStatus,
      titleText: s.titleText,
      subtitleText: s.subtitleText,
      text: target === "subtitle" ? s.subtitleText : s.titleText,
    };
  }
  function clearEdit(next) {
    next.activeEditableTarget = null;
    next.editTarget = null;
    next.editStatus = "idle";
    next.pendingEdit = null;
    next.draftTitleText = "";
    next.draftSubtitleText = "";
  }
  function normalizeSubtitleStatus(status) {
    return status === "active" || status === "visible" ? "active" : "removed";
  }
  function normalizeInactive(s0) {
    var s = copy(s0);
    if (s.status !== "active") {
      s.subtitleStatus = "removed";
      clearEdit(s);
    }
    return s;
  }
  function readTextPayload(p, fallback) {
    return typeof p.text === "string" ? p.text : fallback || "";
  }
  function normalizeTitleText(text) {
    return String(text || "").trim();
  }
  function normalizeSubtitleText(text) {
    return String(text || "").trim();
  }

  return {
    copy: copy,
    clonePendingEdit: clonePendingEdit,
    createPendingEdit: createPendingEdit,
    clearEdit: clearEdit,
    normalizeSubtitleStatus: normalizeSubtitleStatus,
    normalizeInactive: normalizeInactive,
    readTextPayload: readTextPayload,
    normalizeTitleText: normalizeTitleText,
    normalizeSubtitleText: normalizeSubtitleText,
  };
});
