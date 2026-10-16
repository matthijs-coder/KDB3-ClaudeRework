define([
  "../../widgetBase/view/resolveWidgetShell.js",
  "./dismissHelperTitleEdit.js"
], function (_shellModule, _dismissHelperTitleEdit) {
  "use strict";

  var _resolveWidgetShell = _shellModule.resolveWidgetShell;

  function appendHelperAfterOwner(_KDB, ownerVisId, helperWidgetId) {
    var ownerShell = _resolveWidgetShell(_KDB, ownerVisId);
    var helperShell = _resolveWidgetShell(_KDB, helperWidgetId);
    var originalPlacement;
    if (!ownerShell || !helperShell || ownerShell === helperShell || !ownerShell.parentNode) {
      return null;
    }
    originalPlacement = { parentNode: helperShell.parentNode, nextSibling: helperShell.nextSibling };
    if (ownerShell.nextSibling === helperShell) {
      return originalPlacement;
    }
    try {
      ownerShell.parentNode.insertBefore(helperShell, ownerShell.nextSibling);
      return originalPlacement;
    } catch (err) {
      console.warn("[widgetTopN.placeHelperAfterOwner] append failed", { ownerVisId: ownerVisId, helperWidgetId: helperWidgetId }, err);
      return originalPlacement;
    }
  }

  function restoreHelperPlacement(_KDB, helperWidgetId, placement) {
    var helperShell = _resolveWidgetShell(_KDB, helperWidgetId);
    if (!helperShell || !placement || !placement.parentNode) {
      _dismissHelperTitleEdit(_KDB, helperWidgetId);
      return false;
    }
    try {
      placement.parentNode.insertBefore(helperShell, placement.nextSibling);
      _dismissHelperTitleEdit(_KDB, helperWidgetId);
      return true;
    } catch (err) {
      console.warn("[widgetTopN.placeHelperAfterOwner] restore failed", { helperWidgetId: helperWidgetId }, err);
      _dismissHelperTitleEdit(_KDB, helperWidgetId);
      return false;
    }
  }

  return {
    appendHelperAfterOwner: appendHelperAfterOwner,
    restoreHelperPlacement: restoreHelperPlacement
  };
});
