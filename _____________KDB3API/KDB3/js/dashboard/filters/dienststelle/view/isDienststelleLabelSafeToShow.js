define([], function () {
  "use strict";

  var STABLE_SAFE_PASS_THRESHOLD = 2;
  var safePassCountByLabelEl = new WeakMap();

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

  function resolveCommittedSanitizeSource(_aria, _text, _title, _hostDisplay, _sanitize) {
    if (typeof _hostDisplay !== "string" || !_hostDisplay || !shouldTransformLabel(_hostDisplay)) {
      return resolveSanitizeSource(_aria, _text, _title);
    }
    if (shouldTransformLabel(_aria) && (_aria === _hostDisplay || _sanitize(_aria) === _sanitize(_hostDisplay))) {
      return _aria;
    }
    if (shouldTransformLabel(_title) && (_title === _hostDisplay || _sanitize(_title) === _sanitize(_hostDisplay))) {
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

  function isDienststelleLabelSafeToShow(_el, _sanitize) {
    var aria = _el && _el.getAttribute ? _el.getAttribute("aria-label") || "" : "";
    var text = readDisplayText(_el);
    var title = readDisplayTitle(_el);
    var source = resolveSanitizeSource(aria, text, title);
    var sanitized;
    if (!source) {
      return true;
    }
    sanitized = _sanitize(source);
    return text === sanitized;
  }

  function resetLabelStableSafePass(_el) {
    safePassCountByLabelEl.delete(_el);
  }

  function recordLabelStableSafePass(_el, _sanitize) {
    var count;
    if (!isDienststelleLabelSafeToShow(_el, _sanitize)) {
      resetLabelStableSafePass(_el);
      return 0;
    }
    count = (safePassCountByLabelEl.get(_el) || 0) + 1;
    safePassCountByLabelEl.set(_el, count);
    return count;
  }

  function isLabelStableSafeToShow(_el, _sanitize) {
    return recordLabelStableSafePass(_el, _sanitize) >= STABLE_SAFE_PASS_THRESHOLD;
  }

  function markLabelNodeReady(_el, _selectors) {
    var readyClass = _selectors && _selectors.popupLabelsReadyClass;
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

  function clearLabelNodeReadyIfUnsafe(_el, _sanitize, _selectors) {
    var readyClass = _selectors && _selectors.popupLabelsReadyClass;
    if (!_el || !_el.classList || !readyClass) {
      return false;
    }
    if (isDienststelleLabelSafeToShow(_el, _sanitize)) {
      return false;
    }
    resetLabelStableSafePass(_el);
    if (!_el.classList.contains(readyClass)) {
      return false;
    }
    _el.classList.remove(readyClass);
    return true;
  }

  return {
    shouldTransformLabel: shouldTransformLabel,
    resolveSanitizeSource: resolveSanitizeSource,
    resolveCommittedSanitizeSource: resolveCommittedSanitizeSource,
    isDienststelleLabelSafeToShow: isDienststelleLabelSafeToShow,
    isLabelStableSafeToShow: isLabelStableSafeToShow,
    resetLabelStableSafePass: resetLabelStableSafePass,
    markLabelNodeReady: markLabelNodeReady,
    writeSanitizedTitle: writeSanitizedTitle,
    clearLabelNodeReadyIfUnsafe: clearLabelNodeReadyIfUnsafe
  };
});
