define([
  "../config/imagePaths.js",
  "../config/selectors.js"
], function (_imagePaths, _selectors) {
  function __controller(_KDB, _definition, _tableName) {
    try {
      const icon = document.createElement("div");
      const title = String(_definition.title || _definition.label || _definition.kind || "");
      icon.className = _selectors.dataWidgetIconClass + " " + _selectors.liveWidgetAnnotationsClass + " " + String(_definition.className || "");
      icon.setAttribute("aria-label", String(_definition.ariaLabel || _definition.kind || ""));
      icon.setAttribute("role", "button");
      icon.setAttribute("tabindex", "0");
      icon.setAttribute("title", title);
      icon.setAttribute("data-kdb-settings-icon-kind", String(_definition.kind || _definition.ariaLabel || ""));
      if (_definition.action) {
        icon.setAttribute("data-kdb-settings-icon-action", String(_definition.action));
      }
      if (_tableName) {
        icon.setAttribute("table-name", String(_tableName));
      }
      appendImage(_KDB, icon, _definition.icon, _definition.ariaLabel, title);
      if (_definition.dropdownClass) {
        appendDropdown(icon, _definition.dropdownClass, _definition.kind);
      }
      return icon;
    } catch (err) {
      console.error("[widgetSettings.buildSettingsIcon] failed", { kind: _definition && _definition.kind }, err);
      throw err;
    }
  }

  function appendImage(_KDB, icon, iconFile, alt, title) {
    try {
      const image = document.createElement("input");
      image.type = "image";
      image.className = _selectors.svgIconClass;
      image.src = _imagePaths.readImagePath(_KDB) + String(iconFile || "");
      image.alt = String(alt || "");
      image.setAttribute("title", String(title || ""));
      icon.appendChild(image);
    } catch (err) {
      console.error("[widgetSettings.appendImage] failed", { iconFile: iconFile }, err);
      throw err;
    }
  }

  function appendDropdown(icon, dropdownClass, dropdownKind) {
    try {
      const dropdown = document.createElement("div");
      dropdown.className = "KDB_IconsDropdown " + String(dropdownClass);
      dropdown.setAttribute("tabindex", "-1");
      if (dropdownKind) {
        dropdown.setAttribute(_selectors.dropdownKindAttr, String(dropdownKind));
      }
      icon.appendChild(dropdown);
    } catch (err) {
      console.error("[widgetSettings.appendDropdown] failed", { dropdownClass: dropdownClass }, err);
      throw err;
    }
  }

  return __controller;
});
