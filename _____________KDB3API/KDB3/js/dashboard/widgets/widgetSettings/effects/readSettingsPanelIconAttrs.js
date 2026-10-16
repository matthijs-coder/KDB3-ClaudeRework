define([
  "../config/selectors.js"
], function (_selectors) {
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
    readIconKind: readIconKind,
    readIconAction: readIconAction
  };
});
