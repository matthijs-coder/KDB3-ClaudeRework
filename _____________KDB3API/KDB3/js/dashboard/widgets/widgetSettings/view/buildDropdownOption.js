define([
  "../config/imagePaths.js",
  "../config/selectors.js"
], function (_imagePaths, _selectors) {
  function __controller(_KDB, _option, _kind, _isColor, _isSelected) {
    try {
      const row = document.createElement("div");
      const useValue = readUseValue(_option);
      const displayLabel = readDisplayLabel(_option, useValue);
      row.className = _isColor ? _selectors.dataWidgetIconClass + " KDB_widgetSettings_colorOption" : _selectors.dataWidgetIconClass;
      if (_option.icon) {
        row.className += " KDB_widgetSettings_iconTextOption";
      }
      if (_isSelected) {
        row.classList.add(_selectors.optionSelectedClass);
      }
      row.setAttribute("role", "button");
      row.setAttribute("tabindex", "0");
      row.setAttribute("aria-label", displayLabel);
      row.setAttribute(_selectors.dropdownKindAttr, String(_kind));
      row.setAttribute(_selectors.optionKeyAttr, readOptionKey(_option, displayLabel));
      row.setAttribute(_selectors.optionValueAttr, String(useValue));
      if (_option.isDefault === true) {
        row.setAttribute(_selectors.defaultOptionAttr, "1");
      }
      row.setAttribute("title", buildTitle(displayLabel, useValue));
      appendOptionContent(_KDB, row, _option, displayLabel, useValue, _isColor);
      return row;
    } catch (err) {
      console.error("[widgetSettings.buildDropdownOption] failed", { kind: _kind }, err);
      throw err;
    }
  }

  function readDisplayLabel(option, useValue) {
    return String(option.displayValue || option.label || option.key || useValue || "");
  }

  function readUseValue(option) {
    if (option.useValue != null) {
      return option.useValue;
    }
    if (option.value != null) {
      return option.value;
    }
    return option.key == null ? "" : option.key;
  }

  function readOptionKey(option, displayLabel) {
    return String(option.key || displayLabel || option.label || "");
  }

  function appendOptionContent(_KDB, row, option, displayLabel, useValue, isColor) {
    try {
      if (isColor) {
        row.style.backgroundColor = String(useValue);
        row.style.color = _KDB.utils.readableTextColorForHex(String(useValue));
        row.textContent = displayLabel + " " + useValue;
        return;
      }
      if (option.icon) {
        appendIcon(_KDB, row, option.icon, displayLabel);
      }
      appendText(row, displayLabel);
    } catch (err) {
      console.error("[widgetSettings.appendOptionContent] failed", { label: displayLabel }, err);
      throw err;
    }
  }

  function appendIcon(_KDB, row, iconFile, label) {
    try {
      const image = document.createElement("input");
      image.type = "image";
      image.className = _selectors.svgIconClass;
      image.src = _imagePaths.readImagePath(_KDB) + String(iconFile);
      image.alt = String(label);
      image.setAttribute("title", String(label));
      row.appendChild(image);
    } catch (err) {
      console.error("[widgetSettings.appendIcon] failed", { iconFile: iconFile }, err);
      throw err;
    }
  }

  function appendText(row, label) {
    try {
      const text = document.createElement("span");
      text.className = _selectors.textIconClass;
      text.textContent = String(label);
      row.appendChild(text);
    } catch (err) {
      console.error("[widgetSettings.appendText] failed", err);
      throw err;
    }
  }

  function buildTitle(label, value) {
    return label === value ? label : label + " (" + value + ")";
  }

  return __controller;
});
