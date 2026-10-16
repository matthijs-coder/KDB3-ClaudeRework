define(["../config/headerIconKeys"], function (_iconKeys) {
  "use strict";
  function readHeaderStatus(_KDB) {
    var h = _KDB && _KDB.state && _KDB.state.header;
    return (h && h.status) || "idle";
  }
  /** Meaningful when `readHeaderStatus(_KDB) === "active"`; otherwise reflects stored flag only. */
  function readHeaderSubtitleVisible(_KDB) {
    var h = _KDB && _KDB.state && _KDB.state.header;
    return !!(h && (h.subtitleStatus === "active" || h.subtitleStatus === "visible"));
  }
  function readHeaderEditTarget(_KDB) {
    var h = _KDB && _KDB.state && _KDB.state.header;
    var active = h && h.activeEditableTarget;
    var t = active || (h && h.editTarget);
    if (t === "mainTitle") return "title";
    return t === "title" || t === "subtitle" ? t : "none";
  }
  function readHeaderTitleText(_KDB) {
    var h = _KDB && _KDB.state && _KDB.state.header;
    return (h && h.titleText) || "";
  }
  function readHeaderSubtitleText(_KDB) {
    var h = _KDB && _KDB.state && _KDB.state.header;
    return (h && h.subtitleText) || "";
  }
  function readHeaderDraftTitleText(_KDB) {
    var h = _KDB && _KDB.state && _KDB.state.header;
    return (h && h.draftTitleText) || "";
  }
  function readHeaderDraftSubtitleText(_KDB) {
    var h = _KDB && _KDB.state && _KDB.state.header;
    return (h && h.draftSubtitleText) || "";
  }
  function readHeaderIconKey(_KDB) {
    var h = _KDB && _KDB.state && _KDB.state.header;
    return (h && typeof h.iconKey === "string" && h.iconKey) || _iconKeys.DEFAULT_ICON_KEY;
  }
  return {
    readHeaderStatus: readHeaderStatus,
    readHeaderSubtitleVisible: readHeaderSubtitleVisible,
    readHeaderEditTarget: readHeaderEditTarget,
    readHeaderTitleText: readHeaderTitleText,
    readHeaderSubtitleText: readHeaderSubtitleText,
    readHeaderDraftTitleText: readHeaderDraftTitleText,
    readHeaderDraftSubtitleText: readHeaderDraftSubtitleText,
    readHeaderIconKey: readHeaderIconKey,
  };
});
