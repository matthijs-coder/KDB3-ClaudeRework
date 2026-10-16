define(["../config.js"], function (_config) {
  "use strict";

  var STABLE_SAFE_PASS_THRESHOLD = 2;
  var safePassCountByLabelEl = new WeakMap();

  function sanitizeVisibleLabel(_value) {
    var raw = String(_value == null ? "" : _value);
    var hashIndex;
    var trimmed;
    var pipeIndex;
    var hadPipe;
    var afterPipe;
    var dashIndex;
    var afterDash;
    if (!raw) {
      return "";
    }
    hashIndex = raw.indexOf("#");
    if (hashIndex === -1) {
      return raw;
    }
    trimmed = raw.slice(hashIndex + 1).trim();
    if (!trimmed) {
      return raw;
    }
    pipeIndex = trimmed.indexOf("|");
    hadPipe = pipeIndex !== -1;
    if (hadPipe) {
      afterPipe = trimmed.slice(pipeIndex + 1).trim();
      if (afterPipe) {
        trimmed = afterPipe;
      }
      dashIndex = trimmed.indexOf(" - ");
      if (dashIndex !== -1) {
        afterDash = trimmed.slice(dashIndex + 3).trim();
        if (afterDash) {
          trimmed = afterDash;
        }
      }
    }
    return trimmed;
  }

  function shouldTransformLabel(_label) {
    return String(_label || "").indexOf("#") !== -1;
  }

  function resolveSanitizeSource(_aria, _text, _title) {
    if (shouldTransformLabel(_aria)) {
      return _aria;
    }
    if (shouldTransformLabel(_title)) {
      return _title;
    }
    if (shouldTransformLabel(_text)) {
      return _text;
    }
    return null;
  }

  function resolveCommittedSanitizeSource(_aria, _text, _title, _hostDisplay) {
    var sanitizedHost;
    if (typeof _hostDisplay !== "string" || !_hostDisplay || !shouldTransformLabel(_hostDisplay)) {
      return resolveSanitizeSource(_aria, _text, _title);
    }
    sanitizedHost = sanitizeVisibleLabel(_hostDisplay);
    if (shouldTransformLabel(_aria) && (_aria === _hostDisplay || sanitizeVisibleLabel(_aria) === sanitizedHost)) {
      return _aria;
    }
    if (shouldTransformLabel(_title) && (_title === _hostDisplay || sanitizeVisibleLabel(_title) === sanitizedHost)) {
      return _title;
    }
    if (shouldTransformLabel(_text)) {
      return _text;
    }
    return _hostDisplay;
  }

  function readDisplayText(_el) {
    return _el && typeof _el.textContent === "string" ? _el.textContent : "";
  }

  function readDisplayTitle(_el) {
    return _el && _el.getAttribute ? _el.getAttribute("title") || "" : "";
  }

  function isLabelSafeToShow(_el) {
    var aria = _el && _el.getAttribute ? _el.getAttribute("aria-label") || "" : "";
    var text = readDisplayText(_el);
    var source = resolveSanitizeSource(aria, text, readDisplayTitle(_el));
    if (!source) {
      return true;
    }
    return text === sanitizeVisibleLabel(source);
  }

  function resetLabelStableSafePass(_el) {
    safePassCountByLabelEl.delete(_el);
  }

  function recordLabelStableSafePass(_el) {
    var count;
    if (!isLabelSafeToShow(_el)) {
      resetLabelStableSafePass(_el);
      return 0;
    }
    count = (safePassCountByLabelEl.get(_el) || 0) + 1;
    safePassCountByLabelEl.set(_el, count);
    return count;
  }

  function isLabelStableSafeToShow(_el) {
    return recordLabelStableSafePass(_el) >= STABLE_SAFE_PASS_THRESHOLD;
  }

  function markLabelNodeReady(_el) {
    var readyClass = _config.DOM_SELECTORS.popupLabelsReadyClass;
    if (_el && _el.classList && readyClass) {
      _el.classList.add(readyClass);
    }
  }

  function writeSanitizedTitle(_el, _parentEl, _trimmed) {
    var changed = false;
    if (_el && (_el.getAttribute("title") || "") !== _trimmed) {
      _el.setAttribute("title", _trimmed);
      changed = true;
    }
    if (_parentEl && _parentEl.getAttribute && (_parentEl.getAttribute("title") || "") !== _trimmed) {
      _parentEl.setAttribute("title", _trimmed);
      changed = true;
    }
    return changed;
  }

  function clearLabelNodeReadyIfUnsafe(_el) {
    var readyClass = _config.DOM_SELECTORS.popupLabelsReadyClass;
    if (!_el || !_el.classList || !readyClass) {
      return false;
    }
    if (isLabelSafeToShow(_el)) {
      return false;
    }
    resetLabelStableSafePass(_el);
    if (!_el.classList.contains(readyClass)) {
      return false;
    }
    _el.classList.remove(readyClass);
    return true;
  }

  function collectNodes(_parentEl, _selectorList, _seen, _nodes) {
    var selIdx;
    var found;
    var nodeIdx;
    var node;
    for (selIdx = 0; selIdx < _selectorList.length; selIdx += 1) {
      found = _parentEl.querySelectorAll(_selectorList[selIdx]);
      for (nodeIdx = 0; nodeIdx < found.length; nodeIdx += 1) {
        node = found[nodeIdx];
        if (node && !_seen.has(node)) {
          _seen.add(node);
          _nodes.push(node);
        }
      }
    }
  }

  // Option labels inside list-item wrappers come first, then any remaining label nodes under the root.
  function queryLabelTextNodes(_rootEl) {
    var seen = new Set();
    var nodes = [];
    var selectorList = _config.DOM_SELECTORS.optionLabelSelectors || [];
    var wrapperSelector = _config.DOM_SELECTORS.listItemWrapperSelector;
    var wrappers;
    var idx;
    if (!_rootEl || !_rootEl.querySelectorAll) {
      return nodes;
    }
    if (wrapperSelector) {
      wrappers = _rootEl.querySelectorAll(wrapperSelector);
      for (idx = 0; idx < wrappers.length; idx += 1) {
        if (wrappers[idx] && wrappers[idx].querySelectorAll) {
          collectNodes(wrappers[idx], selectorList, seen, nodes);
        }
      }
    }
    collectNodes(_rootEl, selectorList, seen, nodes);
    return nodes;
  }

  function stripLabelElement(_el, _opts) {
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
      ? resolveCommittedSanitizeSource(aria, text, title, opts.hostDisplay)
      : resolveSanitizeSource(aria, text, title);
    if (!source) {
      return false;
    }
    trimmed = sanitizeVisibleLabel(source);
    if (!trimmed || trimmed === source) {
      return false;
    }
    if (changeText && text !== trimmed) {
      _el.textContent = trimmed;
      changed = true;
    }
    if (changeTitle && trimmed && (opts.hostDisplay || (title && shouldTransformLabel(title)))) {
      changed = writeSanitizedTitle(_el, sourceParentEl, trimmed) || changed;
    }
    if (ariaFromSource === "ifEmpty" && source && !(_el.getAttribute("aria-label") || "")) {
      _el.setAttribute("aria-label", source);
      changed = true;
    }
    return changed;
  }

  function sanitizePopupLabelsInRoot(_rootEl) {
    var nodes = queryLabelTextNodes(_rootEl);
    var changed = 0;
    nodes.forEach(function (labelEl) {
      clearLabelNodeReadyIfUnsafe(labelEl);
      if (stripLabelElement(labelEl, { text: true, title: true, ariaFromSource: "never" })) {
        changed += 1;
      }
      if (isLabelStableSafeToShow(labelEl)) {
        markLabelNodeReady(labelEl);
      }
    });
    return changed;
  }

  function sanitizeCommittedDisplay(_wrapperEl, _hostDisplay) {
    var selectors = _config.DOM_SELECTORS;
    var textSpan;
    if (!_wrapperEl || !_wrapperEl.querySelector) {
      return false;
    }
    textSpan = _wrapperEl.querySelector(selectors.committedDisplaySelector);
    if (!textSpan) {
      return false;
    }
    return stripLabelElement(textSpan, {
      text: true,
      title: true,
      ariaFromSource: "ifEmpty",
      sourceParentEl: (textSpan.closest && textSpan.closest(selectors.committedDisplayParentSelector)) || null,
      hostDisplay: _hostDisplay || ""
    });
  }

  return {
    sanitizeVisibleLabel: sanitizeVisibleLabel,
    sanitizePopupLabelsInRoot: sanitizePopupLabelsInRoot,
    sanitizeCommittedDisplay: sanitizeCommittedDisplay
  };
});
