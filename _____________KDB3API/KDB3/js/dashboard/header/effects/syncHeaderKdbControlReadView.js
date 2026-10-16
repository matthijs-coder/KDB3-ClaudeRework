define([], function () {
  "use strict";

  function shouldSyncKdbControlReadView(action) {
    if (!action) return false;
    var opts = action.options || {};
    if (opts.isHistoryReplay === true) return true;
    var t = action.type;
    return (
      t === "header/toggle" ||
      t === "header/show" ||
      t === "header/hide" ||
      t === "header/toggleSubtitle" ||
      t === "header/setSubtitleChrome" ||
      t === "header/startTitleEdit" ||
      t === "header/startSubtitleEdit" ||
      t === "header/commitTitle" ||
      t === "header/commitSubtitle" ||
      t === "header/cancelEdit"
    );
  }

  function syncHeaderKdbControlReadView(_KDB, action) {
    if (!shouldSyncKdbControlReadView(action)) return;
    var rt = _KDB.runtime && _KDB.runtime.kdbControl;
    var ctx = rt && rt.frameworkBindContext;
    if (ctx && typeof ctx.syncView === "function") ctx.syncView();
  }

  return syncHeaderKdbControlReadView;
});
