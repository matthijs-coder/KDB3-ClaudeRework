define([
  "../config/selectors.js"
], function (_selectors) {
  function closeVisibleDropdowns(_panel, _options) {
    try {
      const panel = _panel;
      const resetTransform = !_options || _options.resetTransform !== false;
      const dropdowns = panel.querySelectorAll(_selectors.dropdownVisibleSelector);
      let index = 0;
      while (index < dropdowns.length) {
        if (resetTransform) {
          dropdowns[index].style.transform = "";
        }
        dropdowns[index].classList.remove(_selectors.visibleClass);
        index += 1;
      }
    } catch (err) {
      console.error("[widgetSettings.closeVisibleDropdowns] failed", err);
      throw err;
    }
  }

  return closeVisibleDropdowns;
});
