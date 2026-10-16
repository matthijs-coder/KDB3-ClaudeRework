define(["../config.js"], function (_config) {
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
  function readHeaderIconKey(_KDB) {
    var h = _KDB && _KDB.state && _KDB.state.header;
    return (h && typeof h.iconKey === "string" && h.iconKey) || _config.DEFAULT_ICON_KEY;
  }
  return {
    readHeaderStatus: readHeaderStatus,
    readHeaderSubtitleVisible: readHeaderSubtitleVisible,
    readHeaderEditTarget: readHeaderEditTarget,
    readHeaderTitleText: readHeaderTitleText,
    readHeaderSubtitleText: readHeaderSubtitleText,
    readHeaderIconKey: readHeaderIconKey,
  };
});
