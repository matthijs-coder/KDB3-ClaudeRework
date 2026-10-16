define([
  "./legendCaptionText.js",
  "./legendCaptionDom.js",
  "../../dom.js"
], function (_legendCaptionText, _legendCaptionDom, _dom) {
  "use strict";

  function isLineVisualizationType(_visType) {
    return String(_visType == null ? "" : _visType).trim().toLowerCase() === "line";
  }

  function runLegendSanitizers(_queryRoot, _context, _options) {
    var context = _context || {};
    var options = _options || {};
    var fromObserver = options.fromObserver === true;
    var isShell = !_dom.isVisualizationContentRoot(_queryRoot);
    var isCaptionsOnly = fromObserver === true || isShell === true;
    var diagnostics = {
      scanned: 0,
      hidden: 0,
      shown: 0,
      titlesChanged: 0,
      captionsScanned: 0,
      captionsChanged: 0,
      fromObserver: fromObserver,
      isCaptionsOnly: isCaptionsOnly
    };

    if (!_queryRoot || typeof _queryRoot.querySelectorAll !== "function") {
      diagnostics.skipped = "no_query_root";
      return diagnostics;
    }
    try {
      if (isCaptionsOnly !== true) {
        var titles = _queryRoot.querySelectorAll(_legendCaptionDom.LEGEND_TITLE_SELECTOR);
        for (var i = 0; i < titles.length; i += 1) {
          var titleNode = titles[i];
          if (!titleNode || !titleNode.classList) {
            continue;
          }
          var originalText = titleNode.textContent == null ? "" : String(titleNode.textContent);
          var titleReplace = isLineVisualizationType(context.visType)
            ? _legendCaptionText.sanitizeLegendTitleLine(originalText, context.dimension)
            : _legendCaptionText.replaceTooltipInLegendTitle(originalText, context.dimension);
          var newText = titleReplace.text;
          if (titleReplace.changed) {
            titleNode.textContent = newText;
            diagnostics.titlesChanged += 1;
          }
          diagnostics.scanned += 1;
          if (newText === "") {
            titleNode.classList.remove("KDB_visible");
            diagnostics.hidden += 1;
          } else {
            titleNode.classList.add("KDB_visible");
            diagnostics.shown += 1;
          }
        }
      }

      var captionEntries = _legendCaptionDom.collectCaptionEntries(_queryRoot);
      for (var c = 0; c < captionEntries.length; c += 1) {
        var captionEntry = captionEntries[c];
        var captionNode = captionEntry.node;
        if (!captionNode) {
          continue;
        }
        var captionOriginalText =
          captionNode.textContent == null ? "" : String(captionNode.textContent);
        var captionSanitized = _legendCaptionText.sanitizeLegendCaptionText(captionOriginalText, {
          visType: context.visType
        });
        diagnostics.captionsScanned += 1;
        if (captionSanitized.changed) {
          captionNode.textContent = captionSanitized.text;
          diagnostics.captionsChanged += 1;
        }
      }
    } catch (err) {
      console.error("[widgetVis.runLegendSanitizers] failed", err);
      diagnostics.error = String(err && err.message ? err.message : err);
    }
    return diagnostics;
  }

  return runLegendSanitizers;
});
