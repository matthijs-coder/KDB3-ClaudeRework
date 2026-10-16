define([
  "./buildWienKiControls.js"
], function (_buildWienKiControls) {
  "use strict";

  function readWienKiLabels(_KDB) {
    var de = _KDB.config && _KDB.config.labels && _KDB.config.labels.de;
    return (de && de.wienKiControls) || {};
  }

  function readBeforeAnchor(_hostEl) {
    return _hostEl.querySelector('[data-kdb-pdf-export-controls="true"]') ||
      _hostEl.querySelector('[data-kdb-history-controls="true"]') ||
      null;
  }

  function moveWienKiRoot(_hostEl, _rootEl) {
    var beforeEl = readBeforeAnchor(_hostEl);
    var referenceEl = beforeEl || _hostEl.firstChild || null;
    if (_rootEl.parentNode !== _hostEl) {
      _hostEl.insertBefore(_rootEl, referenceEl);
      return;
    }
    if (!referenceEl || referenceEl === _rootEl) return;
    if (beforeEl && _rootEl.nextSibling === beforeEl) return;
    if (!beforeEl && _hostEl.firstChild === _rootEl) return;
    _hostEl.insertBefore(_rootEl, referenceEl);
  }

  function placeWienKiControls(_KDB, _toolbarHostEl) {
    var selectors = _KDB.elements.selectors.wienKiControls;
    var runtime = _KDB.runtime.wienKiControls;
    var labels = readWienKiLabels(_KDB);
    var rootEl;
    try {
      rootEl = _toolbarHostEl.querySelector(selectors.rootSelector);
      if (!rootEl) {
        rootEl = _buildWienKiControls({
          accessibleName: labels.buttonAccessibleName,
          title: labels.buttonTitle,
          labelText: labels.buttonTitle
        });
      }
      moveWienKiRoot(_toolbarHostEl, rootEl);
      runtime.domRefs.toolbarHostEl = _toolbarHostEl;
      runtime.domRefs.rootEl = rootEl;
      runtime.domRefs.buttonEl = rootEl.querySelector(selectors.buttonSelector);
      runtime.domRefs.iconEl = rootEl.querySelector(selectors.iconSelector);
      runtime.domRefs.labelEl = rootEl.querySelector(selectors.labelSelector);
      return rootEl;
    } catch (err) {
      console.error("[wienKiControls.placeWienKiControls]", err);
      throw err;
    }
  }

  return placeWienKiControls;
});
