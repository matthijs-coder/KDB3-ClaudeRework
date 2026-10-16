define([
  "../config/selectors.js",
  "./closeVisibleDropdowns.js"
], function (_selectors, _closeVisibleDropdowns) {
  function findOption(panel, target) {
    if (!target || typeof target.closest !== "function") {
      return null;
    }
    const option = target.closest(_selectors.dropdownOptionInDropdownSelector);
    return option && panel.contains(option) ? option : null;
  }

  function findIcon(panel, target) {
    if (!target || typeof target.closest !== "function") {
      return null;
    }
    const icon = target.closest(_selectors.settingsIconChildSelector);
    return icon && panel.contains(icon) ? icon : null;
  }

  function toggleDropdown(panel, dropdown) {
    try {
      const shouldOpen = !dropdown.classList.contains(_selectors.visibleClass);
      _closeVisibleDropdowns(panel, { resetTransform: true });
      if (shouldOpen) {
        dropdown.classList.add(_selectors.visibleClass);
        adjustDropdownHorizontalOverflow(dropdown);
      }
    } catch (err) {
      console.error("[widgetSettings.toggleDropdown] failed", err);
      throw err;
    }
  }

  function adjustDropdownHorizontalOverflow(dropdown) {
    const margin = 8;
    dropdown.style.transform = "translateX(-50%) translateY(5px)";

    const rect = dropdown.getBoundingClientRect();
    const viewportRight = window.innerWidth || document.documentElement.clientWidth;
    const overflowRight = rect.right - viewportRight;

    if (overflowRight > 0) {
      dropdown.style.transform = "translateX(calc(-50% - " + (overflowRight + margin) + "px)) translateY(5px)";
    }
  }

  return {
    findOption: findOption,
    findIcon: findIcon,
    toggleDropdown: toggleDropdown,
    closeDropdowns: function (panel) {
      _closeVisibleDropdowns(panel, { resetTransform: true });
    }
  };
});
