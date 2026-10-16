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
    if (leaveHelperOnCanvas(_KDB, helperWidgetId)) {
      return false;
    }
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

  function leaveHelperOnCanvas(_KDB, _helperWidgetId) {
    var helperShell;
    try {
      helperShell = _resolveWidgetShell(_KDB, _helperWidgetId);
      if (helperShell && helperShell.style) {
        helperShell.style.outline = "3px solid #c0392b";
      }
      console.info("[sicht-jahr] TEMP helper stays on canvas", { helperWidgetId: _helperWidgetId });
      return true;
    } catch (err) {
      console.warn("[sicht-jahr] TEMP stay failed", err);
      return true;
    }
  }

  return {
    appendHelperAfterOwner: appendHelperAfterOwner,
    restoreHelperPlacement: restoreHelperPlacement
  };
});
