define([
  "./legendCaptionText.js",
  "./matchLegendCaptionHost.js",
  "../../../../../core/cognosHost/config/widgetChromeSelectors.js"
], function (_legendCaptionText, _matchLegendCaptionHost, _widgetChrome) {
  "use strict";

  var legend = _widgetChrome.legend.strings;
  var LEGEND_CAPTION_DATA_ITEM = legend.captionDataItem;

  function resolveCaptionChildFromAttributeTarget(_target) {
    if (!_target || typeof _target.querySelector !== "function") {
      return null;
    }
    return (
      _target.querySelector(
        ':scope > [data-visual-item="' + LEGEND_CAPTION_DATA_ITEM + '"]'
      ) || _target.querySelector(":scope > ." + legend.captionClass)
    );
  }

  function applySanitizedCaptionText(_node, _sanitizedText, _useNodeValue) {
    if (!_node) {
      return false;
    }
    var sanitizedText = String(_sanitizedText == null ? "" : _sanitizedText);
    if (_useNodeValue && _node.nodeName === "#text") {
      var currentNodeValue = _node.nodeValue == null ? "" : String(_node.nodeValue);
      if (currentNodeValue === sanitizedText) {
        return false;
      }
      _node.nodeValue = sanitizedText;
      return true;
    }
    var currentText = _node.textContent == null ? "" : String(_node.textContent);
    if (currentText === sanitizedText) {
      return false;
    }
    _node.textContent = sanitizedText;
    return true;
  }

  function sanitizeLegendCaptionMutation(_mutation, _context) {
    try {
      var context = _context || {};
      if (!_mutation) {
        return false;
      }
      if (
        _mutation.type === "childList" &&
        _mutation.addedNodes &&
        _mutation.addedNodes.length &&
        _matchLegendCaptionHost.isLegendCaptionHostElement(_mutation.target)
      ) {
        var addedNode = _mutation.addedNodes[0];
        if (addedNode && addedNode.nodeName === "#text") {
          var rawChildText = addedNode.nodeValue == null ? "" : String(addedNode.nodeValue);
          var sanitizedChild = _legendCaptionText.sanitizeLegendCaptionText(rawChildText, {
            visType: context.visType
          });
          return applySanitizedCaptionText(addedNode, sanitizedChild.text, true);
        }
      }
      if (_mutation.type === "characterData") {
        var textNode = _mutation.target;
        var parentElement = textNode && textNode.parentElement ? textNode.parentElement : null;
        if (!parentElement || !_matchLegendCaptionHost.isLegendCaptionHostElement(parentElement)) {
          return false;
        }
        var rawText = textNode.nodeValue == null ? "" : String(textNode.nodeValue);
        var finalSanitized = _legendCaptionText.sanitizeLegendCaptionText(rawText, {
          visType: context.visType
        });
        return applySanitizedCaptionText(textNode, finalSanitized.text, true);
      }
      if (_mutation.type === "attributes" && _mutation.attributeName === "id") {
        var captionElement = resolveCaptionChildFromAttributeTarget(_mutation.target);
        if (!captionElement) {
          return false;
        }
        var captionOriginalText =
          captionElement.textContent == null ? "" : String(captionElement.textContent);
        var captionSanitized = _legendCaptionText.sanitizeLegendCaptionText(captionOriginalText, {
          visType: context.visType
        });
        return applySanitizedCaptionText(captionElement, captionSanitized.text, false);
      }
      return false;
    } catch (err) {
      console.error("[widgetVis.sanitizeLegendCaptionMutation] failed", err);
      throw err;
    }
  }

  return sanitizeLegendCaptionMutation;
});
