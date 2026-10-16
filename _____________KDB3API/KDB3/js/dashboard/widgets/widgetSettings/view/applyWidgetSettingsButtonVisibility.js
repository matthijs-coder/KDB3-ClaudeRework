define([
  "../config/selectors.js"
], function (_selectors) {
  function __controller(_KDB, _payload) {
    try {
      const root = resolveRoot(_KDB);
      const isHidden = resolveIsHidden(_KDB, _payload);
      const buttonQuery = _selectors.widgetClass + " " + _selectors.toolbarSelector + ", " + _selectors.toolbarSelector;
      const buttons = root && root.querySelectorAll ? root.querySelectorAll(buttonQuery) : [];
      let index = 0;
      while (index < buttons.length) {
        buttons[index].classList.toggle(_selectors.hideClass, isHidden);
        index += 1;
      }
      return true;
    } catch (err) {
      console.error("[widgetSettings.applyWidgetSettingsButtonVisibility] failed", err);
      throw err;
    }
  }

  function resolveIsHidden(_KDB, _payload) {
    if (_payload && typeof _payload.isHidden === "boolean") {
      return _payload.isHidden === true;
    }
    return !!(
      _KDB.state &&
      _KDB.state.kdbControl &&
      _KDB.state.kdbControl.settings &&
      _KDB.state.kdbControl.settings.dashboard &&
      _KDB.state.kdbControl.settings.dashboard.areSettingsButtonsHidden === true
    );
  }

  function resolveRoot(_KDB) {
    const core = _KDB.runtime && _KDB.runtime.core && _KDB.runtime.core.domRefs;
    return core && core.renderParentEl ? core.renderParentEl : document;
  }

  return __controller;
});
