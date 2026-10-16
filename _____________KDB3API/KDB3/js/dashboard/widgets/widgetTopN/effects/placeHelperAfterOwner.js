define([
  "../../widgetBase/view/resolveWidgetShell.js",
  "./dismissHelperTitleEdit.js"
], function (_shellModule, _dismissHelperTitleEdit) {
  "use strict";

  var _resolveWidgetShell = _shellModule.resolveWidgetShell;
  var PAD_ATTR = "data-kdb-launchpad-pad";

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
      _dismissHelperTitleEdit(_KDB, helperWidgetId);
      return false;
    }
    try {
      slotEl.insertBefore(helperShell, null);
      _dismissHelperTitleEdit(_KDB, helperWidgetId);
      return true;
    } catch (err) {
      console.warn("[widgetTopN.placeHelperAfterOwner] restore failed", { helperWidgetId: helperWidgetId }, err);
      _dismissHelperTitleEdit(_KDB, helperWidgetId);
      return false;
    }
  }

  function isHelperOnLoanToOwner(ownerRuntime, helperWidgetId) {
    return !!readLeasedSlot(ownerRuntime, helperWidgetId);
  }

  function readSlotMeta(node) {
    var padKey = node && typeof node.getAttribute === "function" ? node.getAttribute(PAD_ATTR) : null;
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
    return doc.querySelector("[" + PAD_ATTR + "=\"" + escapeAttribute(slot.padKey) + "\"][cor_page_id=\"" +
      escapeAttribute(slot.tabId) + "\"][cor_page_index=\"" + escapeAttribute(slot.pageIndex) + "\"]");
  }

  function escapeAttribute(value) {
    return String(value).replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
  }

  return {
    appendHelperAfterOwner: appendHelperAfterOwner,
    restoreHelperPlacement: restoreHelperPlacement,
    isHelperOnLoanToOwner: isHelperOnLoanToOwner
  };
});
