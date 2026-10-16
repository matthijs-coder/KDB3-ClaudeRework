define(["./isDienststelleLabelSafeToShow.js"], function (_labelSupport) {
  "use strict";

  function queryLabelTextNodes(_rootEl, _selectors) {
    var seen = new Set();
    var nodes = [];
    var selectorList = _selectors.optionLabelSelectors || [];
    var wrapperSelector = _selectors.listItemWrapperSelector;
    var wrappers;
    var wrapperIdx;
    var wrapperEl;
    var selIdx;
    var idx;
    var found;
    var nodeIdx;
    var node;
    if (!_rootEl || !_rootEl.querySelectorAll) {
      return nodes;
    }
    if (wrapperSelector) {
      wrappers = _rootEl.querySelectorAll(wrapperSelector);
      for (wrapperIdx = 0; wrapperIdx < wrappers.length; wrapperIdx += 1) {
        wrapperEl = wrappers[wrapperIdx];
        if (!wrapperEl || !wrapperEl.querySelectorAll) {
          continue;
        }
        for (selIdx = 0; selIdx < selectorList.length; selIdx += 1) {
          found = wrapperEl.querySelectorAll(selectorList[selIdx]);
          for (nodeIdx = 0; nodeIdx < found.length; nodeIdx += 1) {
            node = found[nodeIdx];
            if (node && !seen.has(node)) {
              seen.add(node);
              nodes.push(node);
            }
          }
        }
      }
    }
    for (idx = 0; idx < selectorList.length; idx += 1) {
      found = _rootEl.querySelectorAll(selectorList[idx]);
      for (nodeIdx = 0; nodeIdx < found.length; nodeIdx += 1) {
        node = found[nodeIdx];
        if (node && !seen.has(node)) {
          seen.add(node);
          nodes.push(node);
        }
      }
    }
    return nodes;
  }

  function stripLabelElement(_el, _sanitize, _opts) {
    var opts = _opts || {};
    var changeText = opts.text !== false;
    var changeTitle = opts.title !== false;
    var ariaFromSource = opts.ariaFromSource || "never";
    var sourceParentEl = opts.sourceParentEl || null;
    var aria;
    var text;
    var title;
    var source;
    var trimmed;
    var changed = false;
    if (!_el) {
      return false;
    }
    aria = _el.getAttribute("aria-label") || "";
    text = typeof _el.textContent === "string" ? _el.textContent : "";
    title = _el.getAttribute("title") || "";
    if (sourceParentEl && sourceParentEl.getAttribute) {
      if (!aria) {
        aria = sourceParentEl.getAttribute("aria-label") || "";
      }
      if (!title) {
        title = sourceParentEl.getAttribute("title") || "";
      }
    }
    source = opts.hostDisplay
      ? _labelSupport.resolveCommittedSanitizeSource(aria, text, title, opts.hostDisplay, _sanitize)
      : _labelSupport.resolveSanitizeSource(aria, text, title);
    if (!source) {
      return false;
    }
    trimmed = _sanitize(source);
    if (!trimmed || trimmed === source) {
      return false;
    }
    if (changeText && text !== trimmed) {
      _el.textContent = trimmed;
      changed = true;
    }
    if (changeTitle && trimmed && (opts.hostDisplay || (title && _labelSupport.shouldTransformLabel(title)))) {
      changed = _labelSupport.writeSanitizedTitle(_el, sourceParentEl, trimmed) || changed;
    }
    if (ariaFromSource === "ifEmpty" && source && !(_el.getAttribute("aria-label") || "")) {
      _el.setAttribute("aria-label", source);
      changed = true;
    }
    return changed;
  }

  function sanitizePopupLabelsInRoot(_rootEl, _sanitize, _selectors) {
    var nodes = queryLabelTextNodes(_rootEl, _selectors);
    var changed = 0;
    var idx;
    var labelEl;
    var didStrip;
    for (idx = 0; idx < nodes.length; idx += 1) {
      labelEl = nodes[idx];
      _labelSupport.clearLabelNodeReadyIfUnsafe(labelEl, _sanitize, _selectors);
      didStrip = stripLabelElement(labelEl, _sanitize, {
        text: true,
        title: true,
        ariaFromSource: "never"
      });
      if (didStrip) {
        changed += 1;
      }
      if (_labelSupport.isLabelStableSafeToShow(labelEl, _sanitize)) {
        _labelSupport.markLabelNodeReady(labelEl, _selectors);
      }
    }
    return changed;
  }

  function sanitizeCommittedDisplay(_wrapperEl, _sanitize, _selectors, _hostDisplay) {
    var textSpan;
    if (!_wrapperEl || !_wrapperEl.querySelector) {
      return false;
    }
    textSpan = _wrapperEl.querySelector(_selectors.committedDisplaySelector);
    if (!textSpan) {
      return false;
    }
    return stripLabelElement(textSpan, _sanitize, {
      text: true,
      title: true,
      ariaFromSource: "ifEmpty",
      sourceParentEl: (textSpan.closest && textSpan.closest(_selectors.committedDisplayParentSelector)) || null,
      hostDisplay: _hostDisplay || ""
    });
  }

  function __controller() {
    return { sanitizePopupLabelsInRoot: sanitizePopupLabelsInRoot, sanitizeCommittedDisplay: sanitizeCommittedDisplay };
  }

  return __controller;
});
