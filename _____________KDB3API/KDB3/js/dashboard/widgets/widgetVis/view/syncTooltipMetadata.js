define(["../../../../core/cognosHost/config/widgetChromeSelectors.js"], function (_widgetChrome) {
  "use strict";

  var SPLIT_PIPE = /\s+\|\s+/;
  var widget = _widgetChrome.widget.strings;

  function syncTooltipMetadata(_queryRoot) {
    var diagnostics = { scanned: 0, annotated: 0 };
    if (!_queryRoot || typeof _queryRoot.querySelectorAll !== "function") {
      diagnostics.skipped = "no_query_root";
      return diagnostics;
    }
    try {
      var nodes = _queryRoot.querySelectorAll(widget.tooltipNodeSelector);
      for (var i = 0; i < nodes.length; i += 1) {
        var node = nodes[i];
        if (!node || typeof node.getAttribute !== "function") {
          continue;
        }
        diagnostics.scanned += 1;
        var text = node.textContent || "";
        if (!SPLIT_PIPE.test(text)) {
          continue;
        }
        var parts = text.split(SPLIT_PIPE);
        node.setAttribute("data-kdb-pipe-parts", JSON.stringify(parts));
        diagnostics.annotated += 1;
      }
    } catch (err) {
      console.error("[widgetVis.syncTooltipMetadata] failed", err);
      diagnostics.error = String(err && err.message ? err.message : err);
    }
    return diagnostics;
  }

  return syncTooltipMetadata;
});
