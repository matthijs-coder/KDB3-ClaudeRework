define([
  "../config/domSelectors",
  "../effects/applySaveLoadSlotLoading"
], function (_domSelectors, _applySaveLoadSlotLoading) {

  "use strict";

  function resolveMountTarget(_KDB) {
    var selector = _KDB.elements && _KDB.elements.selectors && _KDB.elements.selectors.root && _KDB.elements.selectors.root.kdbWidget;
    var mountTarget = null;
    if (selector && typeof document !== "undefined" && document.querySelector) {
      mountTarget = document.querySelector(selector);
    }
    if (!mountTarget && _KDB.runtime && _KDB.runtime.core && _KDB.runtime.core.domRefs) {
      mountTarget = _KDB.runtime.core.domRefs.renderParentEl;
    }
    return mountTarget || null;
  }

  function __controller(_KDB, _shell) {
    try {
      placeControlShell(_KDB, _shell);
    } catch (err) {
      console.error("[kdbControl.placeControlShell] failed", err);
    }
  }

  function placeControlShell(_KDB, _shell) {

    var mountRoot = resolveMountTarget(_KDB);

    if (!_KDB.runtime.kdbControl) _KDB.runtime.kdbControl = {};

    var dr = _KDB.runtime.kdbControl.domRefs || {};

    dr.mountTargetEl = mountRoot;

    if (!mountRoot) {
      console.warn("[kdbControl.placeControlShell] mount target not found");
      _KDB.runtime.kdbControl.domRefs = dr;
      return;
    }

    if (!_shell) {
      _KDB.runtime.kdbControl.domRefs = dr;
      return;
    }

    if (_shell.parentNode !== mountRoot) mountRoot.appendChild(_shell);

    dr.placedShell = _shell;

    dr.rootEl = _shell;

    dr.contentEl = _shell.querySelector("#kdb-control-content");

    dr.arrowEl = _shell.querySelector("#kdb-control-arrow");

    dr.settingsOuterEl = _shell.querySelector("#kdb-control-settings-outer");

    dr.saveLoadSlotEl = _shell.querySelector(_domSelectors.saveLoadSlotSelector);

    _applySaveLoadSlotLoading(_KDB, dr.saveLoadSlotEl);

    dr.mainTogglesEl = _shell.querySelector("#kdb-control-main-toggles");

    dr.mainBlocksEl = _shell.querySelector("#kdb-control-main-blocks");

    dr.metricsContainerEl = _shell.querySelector("#kdb-control_metrics_container");

    dr.toolboxContainerEl = _shell.querySelector("#kdb-control_toolbox_container");

    dr.settingsContainerEl = _shell.querySelector("#kdb-control_settings_container");

    _KDB.runtime.kdbControl.domRefs = dr;

  }

  return __controller;

});

