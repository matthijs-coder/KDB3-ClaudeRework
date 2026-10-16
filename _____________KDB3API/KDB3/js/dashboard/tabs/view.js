define(["./config/defaults.js", "./chrome.js", "./slots.js"], function (_defaults, _chrome, _slots) {
  "use strict";

  // Writes the tabs state into the Cognos tab chrome and nudges the kdbControl read view.

  function syncDomFromState(_KDB, _state) {
    const state = _state || (_KDB.state && _KDB.state.tabs);
    const buttons = _chrome.readTabButtons(_KDB);
    syncButtonMarkers(_KDB, buttons);
    syncButtonVisibility(_KDB, buttons, state);
    syncButtonLabels(_KDB, buttons, state);
    return true;
  }

  function syncButtonMarkers(_KDB, buttons) {
    buttons.forEach(function (button, index) {
      if (!button || !button.classList) { return; }
      const role = _slots.readTabRole(_KDB, index);
      button.classList.toggle(_defaults.USER_TAB_BUTTON_CLASS, role === "dashboard");
      button.classList.toggle(_defaults.HELPER_TAB_BUTTON_CLASS, role !== "dashboard");
    });
  }

  function syncButtonVisibility(_KDB, buttons, state) {
    buttons.forEach(function (button, index) {
      const tab = state && state.byIndex ? state.byIndex[String(index)] : null;
      const role = _slots.readTabRole(_KDB, index);
      const isVisible = (state && state.isAuthoringView === true) || (role === "dashboard" && !!(tab && tab.visible === true));
      if (button && button.classList) { button.classList.toggle(_defaults.VISIBLE_CLASS, isVisible); }
    });
  }

  // Cognos' title property does not drive the visible tab-button text; like legacy KDB2, programmatic renames
  // write the label node directly. State is the source of truth (hydrated from the DOM at mount, updated by
  // rename, restore and mutation commits before this sync runs).
  function syncButtonLabels(_KDB, buttons, state) {
    buttons.forEach(function (button, index) {
      if (_slots.readTabRole(_KDB, index) !== "dashboard") { return; }
      const tab = state && state.byIndex ? state.byIndex[String(index)] : null;
      if (!tab || typeof tab.name !== "string" || tab.name === "") { return; }
      const labelEl = _chrome.resolveLabelNode(button);
      if (!labelEl) { return; }
      // Never fight an active rename edit session on this label.
      if (labelEl.getAttribute && labelEl.getAttribute("contenteditable") === "true") { return; }
      if (labelEl.textContent !== tab.name) { labelEl.textContent = tab.name; }
    });
  }

  // Cosmetic refresh of another module's view: a failing syncView must never fail the tab operation that triggered it.
  function syncKdbControlView(_KDB) {
    const api = _KDB && _KDB.api && _KDB.api.kdbControl;
    if (!api || typeof api.syncView !== "function") { return false; }
    try {
      api.syncView();
      return true;
    } catch (err) {
      console.warn("[tabs.syncKdbControlView] kdbControl view sync failed", err);
      return false;
    }
  }

  return { syncDomFromState: syncDomFromState, syncKdbControlView: syncKdbControlView };
});
