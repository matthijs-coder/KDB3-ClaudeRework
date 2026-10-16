define(["../../widgetBase/view/resolveWidgetShell.js"], function (_shellModule) {
  "use strict";

  var NOTE_EDITABLE = ".note-editable";
  var _resolveWidgetShell = _shellModule.resolveWidgetShell;

  // Helper title-edit leftover kills metrics-tree HTML5 drag (2026-08-24 live
  // proof). Blur the title host; attribute-only strip does not exit Cognos.
  // Do not synthetic-click the canvas and do not rewrite titleMode/customTitle.
  function dismissHelperTitleEdit(_KDB, helperWidgetId) {
    try {
      if (!helperWidgetId) {
        return { ok: true, skipped: true };
      }
      var shell = _resolveWidgetShell(_KDB, helperWidgetId);
      if (!shell) {
        return { ok: true, skipped: true };
      }
      var doc = shell.ownerDocument;
      if (!doc) {
        return { ok: true, skipped: true };
      }
      var title = typeof doc.getElementById === "function" ? doc.getElementById(helperWidgetId + "Title") : null;
      var editable = findEditable(shell, title);
      var active = doc.activeElement;
      if (isActiveInTitleSession(active, shell, title, editable)) {
        blurNode(active);
      }
      blurNode(title);
      blurNode(editable);
      disableContentEditable(title);
      disableContentEditable(editable);
      return { ok: true };
    } catch (err) {
      return { ok: true, skipped: true };
    }
  }

  function findEditable(shell, title) {
    if (title && isContentEditable(title)) {
      return title;
    }
    if (shell && typeof shell.querySelector === "function") {
      return shell.querySelector(NOTE_EDITABLE);
    }
    return null;
  }

  function isActiveInTitleSession(active, shell, title, editable) {
    if (!active) {
      return false;
    }
    if (active === title || active === editable) {
      return true;
    }
    if (title && containsNode(title, active)) {
      return true;
    }
    if (shell && containsNode(shell, active) && isContentEditable(active)) {
      return true;
    }
    return false;
  }

  function containsNode(host, node) {
    return !!(host && node && typeof host.contains === "function" && host.contains(node));
  }

  function isContentEditable(node) {
    if (!node) {
      return false;
    }
    if (node.isContentEditable === true) {
      return true;
    }
    return node.contentEditable === "true";
  }

  function blurNode(node) {
    if (node && typeof node.blur === "function") {
      node.blur();
    }
  }

  function disableContentEditable(node) {
    if (!node || !isContentEditable(node)) {
      return;
    }
    node.contentEditable = "false";
  }

  return dismissHelperTitleEdit;
});
