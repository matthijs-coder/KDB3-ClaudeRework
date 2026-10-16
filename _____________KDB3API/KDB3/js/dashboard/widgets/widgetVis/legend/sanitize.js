define(["./captionText.js", "./captionDom.js", "../dom.js"], function (_captionText, _captionDom, _dom) {
  "use strict";

  var VISIBLE_CLASS = "KDB_visible";

  function readText(_node) {
    return _node.textContent == null ? "" : String(_node.textContent);
  }

  function writeNodeText(_node, _text, _useNodeValue) {
    var isTextNode = _useNodeValue && _node.nodeName === "#text";
    var current = isTextNode ? (_node.nodeValue == null ? "" : String(_node.nodeValue)) : readText(_node);
    var next = String(_text == null ? "" : _text);
    if (current === next) {
      return false;
    }
    if (isTextNode) {
      _node.nodeValue = next;
    } else {
      _node.textContent = next;
    }
    return true;
  }

  function sanitizeTextNode(_node, _context) {
    var raw = _node.nodeValue == null ? "" : String(_node.nodeValue);
    return writeNodeText(_node, _captionText.sanitizeLegendCaptionText(raw, { visType: _context.visType }).text, true);
  }

  function sanitizeLegendCaptionMutation(_mutation, _context) {
    var context = _context || {};
    if (!_mutation) {
      return false;
    }
    if (_mutation.type === "childList" && _mutation.addedNodes && _mutation.addedNodes.length
      && _captionDom.isLegendCaptionHostElement(_mutation.target)) {
      var addedNode = _mutation.addedNodes[0];
      if (addedNode && addedNode.nodeName === "#text") {
        return sanitizeTextNode(addedNode, context);
      }
    }
    if (_mutation.type === "characterData") {
      var textNode = _mutation.target;
      var parentElement = textNode && textNode.parentElement ? textNode.parentElement : null;
      if (!parentElement || !_captionDom.isLegendCaptionHostElement(parentElement)) {
        return false;
      }
      return sanitizeTextNode(textNode, context);
    }
    if (_mutation.type === "attributes" && _mutation.attributeName === "id") {
      var captionElement = _captionDom.readCaptionChild(_mutation.target);
      if (!captionElement) {
        return false;
      }
      var sanitized = _captionText.sanitizeLegendCaptionText(readText(captionElement), { visType: context.visType });
      return writeNodeText(captionElement, sanitized.text, false);
    }
    return false;
  }

  function sanitizeLegendCaptionSubtree(_root, _context) {
    var diagnostics = { captionsScanned: 0, captionsChanged: 0 };
    if (!_root || typeof _root.querySelectorAll !== "function") {
      diagnostics.skipped = "no_subtree_root";
      return diagnostics;
    }
    var visType = (_context || {}).visType;
    _captionDom.collectCaptionEntries(_root).forEach(function (_entry) {
      var sanitized = _captionText.sanitizeLegendCaptionText(readText(_entry.node), { visType: visType });
      diagnostics.captionsScanned += 1;
      if (sanitized.changed) {
        _entry.node.textContent = sanitized.text;
        diagnostics.captionsChanged += 1;
      }
    });
    return diagnostics;
  }

  function sanitizeLegendTitles(_queryRoot, _context, _diagnostics) {
    var isLine = String(_context.visType == null ? "" : _context.visType).trim().toLowerCase() === "line";
    var titles = _queryRoot.querySelectorAll(_captionDom.LEGEND_TITLE_SELECTOR);
    var index;
    for (index = 0; index < titles.length; index += 1) {
      var titleNode = titles[index];
      if (!titleNode || !titleNode.classList) {
        continue;
      }
      var original = readText(titleNode);
      var replaced = isLine
        ? _captionText.sanitizeLegendTitleLine(original, _context.dimension)
        : _captionText.replaceTooltipInLegendTitle(original, _context.dimension);
      if (replaced.changed) {
        titleNode.textContent = replaced.text;
        _diagnostics.titlesChanged += 1;
      }
      _diagnostics.scanned += 1;
      if (replaced.text === "") {
        titleNode.classList.remove(VISIBLE_CLASS);
        _diagnostics.hidden += 1;
      } else {
        titleNode.classList.add(VISIBLE_CLASS);
        _diagnostics.shown += 1;
      }
    }
  }

  function runLegendSanitizers(_queryRoot, _context, _options) {
    var context = _context || {};
    var fromObserver = !!_options && _options.fromObserver === true;
    var isCaptionsOnly = fromObserver || !_dom.isVisualizationContentRoot(_queryRoot);
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
    if (!isCaptionsOnly) {
      sanitizeLegendTitles(_queryRoot, context, diagnostics);
    }
    var captions = sanitizeLegendCaptionSubtree(_queryRoot, context);
    diagnostics.captionsScanned = captions.captionsScanned;
    diagnostics.captionsChanged = captions.captionsChanged;
    return diagnostics;
  }

  return {
    sanitizeLegendCaptionMutation: sanitizeLegendCaptionMutation,
    sanitizeLegendCaptionSubtree: sanitizeLegendCaptionSubtree,
    runLegendSanitizers: runLegendSanitizers
  };
});
