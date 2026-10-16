define([
  "../config/selectors.js",
  "../config/intentDispatchMap.js"
], function (_selectors, _intentDispatchMap) {
  function fromOption(_panel, _option) {
    try {
      if (!_panel || !_option) {
        return null;
      }
      const context = readPanelContext(_panel);
      return fromParts(
        context,
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
    try {
      const context = _context || {};
      const kind = String(_kind || "");
      const target = _intentDispatchMap.resolveTarget(context.widgetType, kind);
      const type = _intentDispatchMap.resolveType(target, kind, "dropdownOption");
      return {
        widgetId: context.widgetId,
        widgetType: context.widgetType,
        kind: kind,
        optionKey: String(_optionKey || ""),
        optionValue: String(_optionValue || ""),
        target: target,
        type: type
      };
    } catch (err) {
      console.error("[widgetSettings.buildIntentDescriptorFromParts] failed", err);
      return null;
    }
  }

  function panelContext(_panel) {
    return readPanelContext(_panel);
  }

  function readPanelContext(panel) {
    return {
      widgetId: String(
        panel.getAttribute(_selectors.panelRootAttr) ||
        panel.getAttribute(_selectors.focusPanelRootAttr) ||
        ""
      ),
      widgetType: panel.getAttribute(_selectors.panelWidgetTypeAttr) === "text" ? "text" : "live"
    };
  }

  return {
    fromOption: fromOption,
    fromParts: fromParts,
    panelContext: panelContext
  };
});
