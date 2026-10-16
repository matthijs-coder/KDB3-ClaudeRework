define([
  "./buildShareControls.js",
  "../adapters/resolveShareIconHref.js"
], function (_buildShareControls, _resolveShareIconHref) {
  "use strict";

  var ICON_INVERT_CLASS = "kdb-share-controls__icon--invert";
  var FOLLOWING = (typeof Node !== "undefined" && Node.DOCUMENT_POSITION_FOLLOWING) || 4;

  function readShareLabels(_KDB) {
    var de = _KDB.config && _KDB.config.labels && _KDB.config.labels.de;
    return (de && de.shareControls) || {};
  }

  function isLeftOf(_leftEl, _rightEl) {
    if (typeof _leftEl.compareDocumentPosition === "function") {
      return !!(_leftEl.compareDocumentPosition(_rightEl) & FOLLOWING);
    }
    if (typeof _leftEl.sourceIndex === "number" && typeof _rightEl.sourceIndex === "number") {
      return _leftEl.sourceIndex < _rightEl.sourceIndex;
    }
    return false;
  }

  function readLeftmostAnchor(_hostEl) {
    var nodes = [
      _hostEl.querySelector('[data-kdb-wien-ki-controls="true"]'),
      _hostEl.querySelector('[data-kdb-pdf-export-controls="true"]'),
      _hostEl.querySelector('[data-kdb-history-controls="true"]')
    ];
    var leftmost = null;
    var index;
    for (index = 0; index < nodes.length; index += 1) {
      if (!nodes[index]) continue;
      if (!leftmost || isLeftOf(nodes[index], leftmost)) leftmost = nodes[index];
    }
    return leftmost;
  }

  function moveShareRoot(_hostEl, _rootEl) {
    var beforeEl = readLeftmostAnchor(_hostEl);
    var referenceEl = beforeEl || _hostEl.firstChild || null;
    if (_rootEl.parentNode !== _hostEl) {
      _hostEl.insertBefore(_rootEl, referenceEl);
      return;
    }
    if (!referenceEl || referenceEl === _rootEl) return;
    if (_rootEl.nextSibling === beforeEl) return;
    _hostEl.insertBefore(_rootEl, referenceEl);
  }

  function applyShareIcon(_iconEl, _resolved) {
    if (!_iconEl || !_resolved) return;
    if (_resolved.href && _iconEl.getAttribute("src") !== _resolved.href) {
      _iconEl.setAttribute("src", _resolved.href);
    }
    if (!_iconEl.classList) return;
    if (_resolved.invert) _iconEl.classList.add(ICON_INVERT_CLASS);
    else _iconEl.classList.remove(ICON_INVERT_CLASS);
  }

  function placeShareControls(_KDB, _toolbarHostEl) {
    var selectors = _KDB.elements.selectors.shareControls;
    var iconAssets = _KDB.config.shareControls || {};
    var runtime = _KDB.runtime.shareControls;
    var labels = readShareLabels(_KDB);
    var resolved;
    var rootEl;
    try {
      resolved = _resolveShareIconHref(_toolbarHostEl, iconAssets);
      rootEl = _toolbarHostEl.querySelector(selectors.rootSelector);
      if (!rootEl) {
        rootEl = _buildShareControls({
          iconSrc: resolved.href,
          invert: resolved.invert,
          accessibleName: labels.buttonAccessibleName,
          title: labels.buttonTitle,
          labelText: labels.buttonTitle
        });
      }
      moveShareRoot(_toolbarHostEl, rootEl);
      runtime.domRefs.toolbarHostEl = _toolbarHostEl;
      runtime.domRefs.rootEl = rootEl;
      runtime.domRefs.buttonEl = rootEl.querySelector(selectors.buttonSelector);
      runtime.domRefs.iconEl = rootEl.querySelector(selectors.iconSelector);
      runtime.domRefs.labelEl = rootEl.querySelector(selectors.labelSelector);
      applyShareIcon(runtime.domRefs.iconEl, resolved);
      return rootEl;
    } catch (err) {
      console.error("[shareControls.placeShareControls]", err);
      throw err;
    }
  }

  return placeShareControls;
});
