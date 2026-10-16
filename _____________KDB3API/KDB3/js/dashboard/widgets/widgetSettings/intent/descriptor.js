define([
  "../config/selectors.js",
  "../config.js"
], function (_selectors, _config) {
  "use strict";

  function fromOption(_panel, _option) {
    try {
      if (!_panel || !_option) {
        return null;
      }
      return fromParts(
        panelContext(_panel),
        _option.getAttribute(_selectors.dropdownKindAttr) || "",
        _option.getAttribute(_selectors.optionKeyAttr) || "",
        _option.getAttribute(_selectors.optionValueAttr) || ""
      );
    } catch (err) {
      console.error("[widgetSettings.buildIntentDescriptorFromOption] failed", err);
      return null;
    }
  }

  function fromParts(_context, _kind, _optionKey, _optionValue) {
    const context = _context || {};
    const kind = String(_kind || "");
    const target = _config.resolveTarget(context.widgetType, kind);
    return {
      widgetId: context.widgetId,
      widgetType: context.widgetType,
      kind: kind,
      optionKey: String(_optionKey || ""),
      optionValue: String(_optionValue || ""),
      target: target,
      type: _config.resolveType(target, kind, "dropdownOption")
    };
  }

  function panelContext(panel) {
    return {
      widgetId: String(
        panel.getAttribute(_selectors.panelRootAttr) ||
        panel.getAttribute(_selectors.focusPanelRootAttr) ||
        ""
      ),
      widgetType: panel.getAttribute(_selectors.panelWidgetTypeAttr) === "text" ? "text" : "live"
    };
  }

  function readIconKind(icon) {
    const kind = icon.getAttribute(_selectors.settingsIconKindAttr);
    if (kind) {
      return String(kind);
    }
    return String(icon.getAttribute("aria-label") || "");
  }

  function readIconAction(icon) {
    const action = icon.getAttribute(_selectors.settingsIconActionAttr);
    return action ? String(action) : null;
  }

  return {
    fromOption: fromOption,
    fromParts: fromParts,
    panelContext: panelContext,
    readIconKind: readIconKind,
    readIconAction: readIconAction
  };
});
