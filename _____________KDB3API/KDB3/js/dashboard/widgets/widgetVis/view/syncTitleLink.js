define([], function () {
  "use strict";

  function syncTitleLink(_titleLinkEl, _titleText) {
    var diagnostics = { updated: false };
    if (!_titleLinkEl || !_titleText) {
      diagnostics.skipped = "missing_title_link_or_text";
      return diagnostics;
    }
    try {
      if (_titleLinkEl.textContent !== _titleText) {
        _titleLinkEl.textContent = _titleText;
      }
      diagnostics.updated = true;
    } catch (err) {
      console.error("[widgetVis.syncTitleLink] failed", err);
      diagnostics.error = String(err && err.message ? err.message : err);
    }
    return diagnostics;
  }

  return syncTitleLink;
});
