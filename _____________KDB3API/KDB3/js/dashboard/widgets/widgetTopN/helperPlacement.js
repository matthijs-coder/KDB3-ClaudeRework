define([
  "../widgetBase/view/resolveWidgetShell.js",
  "./config.js"
], function (_shellModule, _config) {
  "use strict";

  var _resolveWidgetShell = _shellModule.resolveWidgetShell;

  // ownerRuntime.helperPlacement is the placement lease: the latest op that
  // moved the helper beside the owner, plus the launchpad slot it came from.
  // Only the lease holder restores, so a superseded op whose read is still
  // running cannot pull the helper away from a newer op mid-apply.
  function appendHelperAfterOwner(_KDB, ownerVisId, helperWidgetId, ownerRuntime, opSeq) {
    var ownerShell = _resolveWidgetShell(_KDB, ownerVisId);
    var helperShell = _resolveWidgetShell(_KDB, helperWidgetId);
    if (!ownerShell || !helperShell || ownerShell === helperShell || !ownerShell.parentNode) {
      return null;
    }
    var slot = readSlotMeta(helperShell.parentNode) || readLeasedSlot(ownerRuntime, helperWidgetId);
    if (!slot) {
      return null;
    }
    var placement = { helperWidgetId: helperWidgetId, opSeq: opSeq, slot: slot };
    ownerRuntime.helperPlacement = placement;
    if (ownerShell.nextSibling === helperShell) {
      return placement;
    }
    try {
      ownerShell.parentNode.insertBefore(helperShell, ownerShell.nextSibling);
    } catch (err) {
      console.warn("[widgetTopN.placeHelperAfterOwner] append failed", { ownerVisId: ownerVisId, helperWidgetId: helperWidgetId }, err);
    }
    return placement;
  }

  function restoreHelperPlacement(_KDB, helperWidgetId, placement, ownerRuntime) {
    if (placement && ownerRuntime && ownerRuntime.helperPlacement !== placement) {
      return false;
    }
    releaseLease(ownerRuntime, placement);
    var helperShell = _resolveWidgetShell(_KDB, helperWidgetId);
    var slotEl = placement && helperShell ? resolveSlotElement(helperShell.ownerDocument, placement.slot) : null;
    if (!slotEl) {
      if (placement && helperShell) {
        console.warn("[widgetTopN.placeHelperAfterOwner] restore failed", { helperWidgetId: helperWidgetId, slot: placement.slot });
      }
      dismissHelperTitleEdit(_KDB, helperWidgetId);
      return false;
    }
    try {
      slotEl.insertBefore(helperShell, null);
      return true;
    } catch (err) {
      console.warn("[widgetTopN.placeHelperAfterOwner] restore failed", { helperWidgetId: helperWidgetId }, err);
      return false;
    } finally {
      dismissHelperTitleEdit(_KDB, helperWidgetId);
    }
  }

  function isHelperOnLoanToOwner(ownerRuntime, helperWidgetId) {
    return !!readLeasedSlot(ownerRuntime, helperWidgetId);
  }

  function readSlotMeta(node) {
    var padKey = node && typeof node.getAttribute === "function" ? node.getAttribute(_config.PAD_ATTR) : null;
    var pageIndex = padKey ? node.getAttribute("cor_page_index") : null;
    if (!padKey || pageIndex === null) {
      return null;
    }
    return { padKey: padKey, tabId: node.getAttribute("cor_page_id") || "", pageIndex: pageIndex };
  }

  function readLeasedSlot(ownerRuntime, helperWidgetId) {
    var lease = ownerRuntime ? ownerRuntime.helperPlacement : null;
    return lease && lease.helperWidgetId === helperWidgetId ? lease.slot : null;
  }

  function releaseLease(ownerRuntime, placement) {
    if (ownerRuntime && placement && ownerRuntime.helperPlacement === placement) {
      ownerRuntime.helperPlacement = null;
    }
  }

  function resolveSlotElement(doc, slot) {
    if (!doc || typeof doc.querySelector !== "function" || !slot) {
      return null;
    }
    return doc.querySelector("[" + _config.PAD_ATTR + "=\"" + escapeAttribute(slot.padKey) + "\"][cor_page_id=\"" +
      escapeAttribute(slot.tabId) + "\"][cor_page_index=\"" + escapeAttribute(slot.pageIndex) + "\"]");
  }

  function escapeAttribute(value) {
    return String(value).replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
  }

  // Helper title-edit leftover kills metrics-tree HTML5 drag (2026-08-24 live
  // proof). Blur the title host; attribute-only strip does not exit Cognos.
  // Do not synthetic-click the canvas and do not rewrite titleMode/customTitle.
  // Best effort: a failed blur must not fail the TopN op that called this.
  function dismissHelperTitleEdit(_KDB, helperWidgetId) {
    var shell = helperWidgetId ? _resolveWidgetShell(_KDB, helperWidgetId) : null;
    var doc = shell ? shell.ownerDocument : null;
    if (!doc) {
      return;
    }
    var title = typeof doc.getElementById === "function" ? doc.getElementById(helperWidgetId + "Title") : null;
    var editable = findEditable(shell, title);
    try {
      if (isActiveInTitleSession(doc.activeElement, shell, title, editable)) {
        blurNode(doc.activeElement);
      }
      blurNode(title);
      blurNode(editable);
      disableContentEditable(title);
      disableContentEditable(editable);
    } catch (err) {
      console.warn("[widgetTopN.dismissHelperTitleEdit] dismiss failed", { helperWidgetId: helperWidgetId }, err);
    }
  }

  function findEditable(shell, title) {
    if (title && isContentEditable(title)) {
      return title;
    }
    return typeof shell.querySelector === "function" ? shell.querySelector(_config.NOTE_EDITABLE_SELECTOR) : null;
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
    return containsNode(shell, active) && isContentEditable(active);
  }

  function containsNode(host, node) {
    return !!(host && node && typeof host.contains === "function" && host.contains(node));
  }

  function isContentEditable(node) {
    if (!node) {
      return false;
    }
    return node.isContentEditable === true || node.contentEditable === "true";
  }

  function blurNode(node) {
    if (node && typeof node.blur === "function") {
      node.blur();
    }
  }

  function disableContentEditable(node) {
    if (node && isContentEditable(node)) {
      node.contentEditable = "false";
    }
  }

  return {
    appendHelperAfterOwner: appendHelperAfterOwner,
    restoreHelperPlacement: restoreHelperPlacement,
    isHelperOnLoanToOwner: isHelperOnLoanToOwner,
    dismissHelperTitleEdit: dismissHelperTitleEdit
  };
});
