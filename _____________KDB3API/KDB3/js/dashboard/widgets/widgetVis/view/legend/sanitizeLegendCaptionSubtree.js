define([
  "./legendCaptionDom.js",
  "./legendCaptionText.js"
], function (_legendCaptionDom, _legendCaptionText) {
  "use strict";

  function sanitizeLegendCaptionSubtree(_root, _context) {
    var context = _context || {};
    var diagnostics = { captionsScanned: 0, captionsChanged: 0 };
    if (!_root || typeof _root.querySelectorAll !== "function") {
      diagnostics.skipped = "no_subtree_root";
      return diagnostics;
    }
    try {
      var visType = context.visType;
      var entries = _legendCaptionDom.collectCaptionEntries(_root);
      for (var c = 0; c < entries.length; c += 1) {
        var captionNode = entries[c] && entries[c].node;
        if (!captionNode) {
          continue;
        }
        var originalText = captionNode.textContent == null ? "" : String(captionNode.textContent);
        var sanitized = _legendCaptionText.sanitizeLegendCaptionText(originalText, {
          visType: visType
        });
        diagnostics.captionsScanned += 1;
        if (sanitized.changed) {
          captionNode.textContent = sanitized.text;
          diagnostics.captionsChanged += 1;
        }
      }
    } catch (err) {
      console.error("[widgetVis.sanitizeLegendCaptionSubtree] failed", err);
      diagnostics.error = String(err && err.message ? err.message : err);
    }
    return diagnostics;
  }

  return sanitizeLegendCaptionSubtree;
});
