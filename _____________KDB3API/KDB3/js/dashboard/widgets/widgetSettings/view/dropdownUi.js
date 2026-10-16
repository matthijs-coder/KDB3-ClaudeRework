define([
  "../config/selectors.js"
], function (_selectors) {
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

  function closeVisibleDropdowns(panel, options) {
    const resetTransform = !options || options.resetTransform !== false;
    const dropdowns = panel.querySelectorAll(_selectors.dropdownVisibleSelector);
    Array.prototype.forEach.call(dropdowns, function (dropdown) {
      if (resetTransform) {
        dropdown.style.transform = "";
      }
      dropdown.classList.remove(_selectors.visibleClass);
    });
  }

  function closeDropdowns(panel) {
    closeVisibleDropdowns(panel, { resetTransform: true });
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

  function toggleDropdown(panel, dropdown) {
    const shouldOpen = !dropdown.classList.contains(_selectors.visibleClass);
    closeDropdowns(panel);
    if (shouldOpen) {
      dropdown.classList.add(_selectors.visibleClass);
      adjustDropdownHorizontalOverflow(dropdown);
    }
  }

  return {
    findOption: findOption,
    findIcon: findIcon,
    toggleDropdown: toggleDropdown,
    closeDropdowns: closeDropdowns,
    closeVisibleDropdowns: closeVisibleDropdowns
  };
});
