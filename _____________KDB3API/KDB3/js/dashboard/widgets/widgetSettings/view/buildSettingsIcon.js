define([
  "../config.js",
  "../config/selectors.js"
], function (_config, _selectors) {
  function appendImage(_KDB, icon, iconFile, alt, title) {
    const image = document.createElement("input");
    image.type = "image";
    image.className = _selectors.svgIconClass;
    image.src = _config.readImagePath() + String(iconFile || "");
    image.alt = String(alt || "");
    image.setAttribute("title", String(title || ""));
    icon.appendChild(image);
  }

  function appendDropdown(icon, dropdownClass, dropdownKind) {
    const dropdown = document.createElement("div");
    dropdown.className = "KDB_IconsDropdown " + String(dropdownClass);
    dropdown.setAttribute("tabindex", "-1");
    if (dropdownKind) {
      dropdown.setAttribute(_selectors.dropdownKindAttr, String(dropdownKind));
    }
    icon.appendChild(dropdown);
  }

  function buildSettingsIcon(_KDB, definition, tableName) {
    const icon = document.createElement("div");
    const title = String(definition.title || definition.label || definition.kind || "");
    icon.className = _selectors.dataWidgetIconClass + " " + _selectors.liveWidgetAnnotationsClass + " " + String(definition.className || "");
    icon.setAttribute("aria-label", String(definition.ariaLabel || definition.kind || ""));
    icon.setAttribute("role", "button");
    icon.setAttribute("tabindex", "0");
    icon.setAttribute("title", title);
    icon.setAttribute("data-kdb-settings-icon-kind", String(definition.kind || definition.ariaLabel || ""));
    if (definition.action) {
      icon.setAttribute("data-kdb-settings-icon-action", String(definition.action));
    }
    if (tableName) {
      icon.setAttribute("table-name", String(tableName));
    }
    appendImage(_KDB, icon, definition.icon, definition.ariaLabel, title);
    if (definition.dropdownClass) {
      appendDropdown(icon, definition.dropdownClass, definition.kind);
    }
    return icon;
  }

  return buildSettingsIcon;
});
