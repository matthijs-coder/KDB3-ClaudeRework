/*
 * Filter owner kit: scope-level helpers for the owners whose tab state is keyed by scope id (nativeMultiSelect,
 * dienststelle). singleSelect resolves slots against its instance inventory instead and does not use them.
 *
 * pushUnique(list, value)
 * slotOfMove(move, "from" | "to") -> { tabIdx, tabId }
 * createScopeIdResolver({ readTabs, onMatchError }) -> resolveScopeId(KDB, tabIdxToScopeId, tabIdx)
 *     { ok:true, scopeId, fromTarget } when the saga target carries a scopeId, or when tabId/pageId matches a tab
 *     descriptor from readTabs(KDB) (array of { id, pageId }; the owner decides what a failing facet means and
 *     returns [] or null); { ok:false, scopeId:null, fromTarget:false } otherwise. Never indexes tabs by position.
 *     With onMatchError(error) the whole lookup (readTabs and the match) is guarded: an error is passed to it and
 *     reads as no match; without it only the owner's own readTabs handling applies.
 * createSlotScopeResolver({ resolveScopeId, isGlobalScope }) -> resolveScopeIdForSlot(KDB, tabTargets, slot)
 *     { ok:true, scopeId } | { ok:true, skip:true, scopeId:null } (isGlobalScope(scopeId): nothing per tab to move)
 *     | { ok:false, diagnostics:[PREPARE_FAILED] }.
 * resolveAffectedScopes(resolveScopeIdForSlot, KDB, tabTargets, slots) -> { ok, scopeIds, diagnostics }
 *     unique scope ids of the slots; every unresolved slot adds its diagnostics and the whole result is ok:false.
 * collectFromScopeIds(resolveScopeIdForSlot, KDB, tabTargets, moves, diagnostics) -> scopeIds
 *     unique scopes the moves start from; failures are appended to diagnostics.
 */
define([
  "./tabMutation.js"
], function (_tabMutation) {
  "use strict";

  function pushUnique(_list, _value) {
    if (_list.indexOf(_value) === -1) { _list.push(_value); }
  }

  function slotOfMove(_move, _side) {
    return _side === "from"
      ? { tabIdx: _move.fromTabIdx, tabId: _move.fromTabId }
      : { tabIdx: _move.toTabIdx, tabId: _move.toTabId };
  }

  // pageId is the first-child page id, or the layout id when the tab has no child; the answer is the layout id.
  function findLayoutScopeId(_items, _tabId, _pageId) {
    var items = _items || [];
    var idx;
    for (idx = 0; idx < items.length; idx += 1) {
      var item = items[idx];
      var containerId = item && item.id != null ? String(item.id) : null;
      if (!containerId) { continue; }
      var pageId = item.pageId != null ? String(item.pageId) : null;
      if ((_tabId != null && containerId === String(_tabId)) ||
          (_pageId != null && (containerId === String(_pageId) || pageId === String(_pageId)))) {
        return containerId;
      }
    }
    return null;
  }

  function matchTarget(_spec, _KDB, _target) {
    if (typeof _spec.onMatchError !== "function") {
      return findLayoutScopeId(_spec.readTabs(_KDB), _target.tabId, _target.pageId);
    }
    try {
      return findLayoutScopeId(_spec.readTabs(_KDB), _target.tabId, _target.pageId);
    } catch (error) {
      _spec.onMatchError(error);
      return null;
    }
  }

  function createScopeIdResolver(_spec) {
    return function resolveScopeId(_KDB, _tabIdxToScopeId, _tabIdx) {
      var target = _tabIdxToScopeId && _tabIdxToScopeId[String(_tabIdx)];
      if (target && typeof target.scopeId === "string" && target.scopeId !== "") {
        return { ok: true, scopeId: target.scopeId, fromTarget: true };
      }
      var matched = target ? matchTarget(_spec, _KDB, target) : null;
      if (matched) {
        return { ok: true, scopeId: matched, fromTarget: false };
      }
      return { ok: false, scopeId: null, fromTarget: false };
    };
  }

  function createSlotScopeResolver(_spec) {
    var code = _tabMutation.CODES.PREPARE_FAILED;
    function failed(_message, _slot) {
      return { ok: false, diagnostics: [{ code: code, message: _message, tabId: _slot && _slot.tabId || null }] };
    }
    return function resolveScopeIdForSlot(_KDB, _tabTargets, _slot) {
      var tabIdx = _slot && _slot.tabIdx;
      if (typeof tabIdx !== "number") {
        return failed("slot tabIdx is missing for scope resolution", _slot);
      }
      var resolved = _spec.resolveScopeId(_KDB, _tabTargets || {}, tabIdx);
      if (!resolved || resolved.ok !== true || !resolved.scopeId) {
        return failed("scopeId could not be resolved for tabIdx " + tabIdx, _slot);
      }
      if (typeof _spec.isGlobalScope === "function" && _spec.isGlobalScope(resolved.scopeId)) {
        return { ok: true, skip: true, scopeId: null };
      }
      return { ok: true, scopeId: String(resolved.scopeId) };
    };
  }

  function resolveAffectedScopes(_resolveScopeIdForSlot, _KDB, _tabTargets, _slots) {
    var scopeIds = [];
    var diagnostics = [];
    var idx;
    for (idx = 0; idx < _slots.length; idx += 1) {
      var resolved = _resolveScopeIdForSlot(_KDB, _tabTargets, _slots[idx]);
      if (!resolved.ok) { diagnostics = diagnostics.concat(resolved.diagnostics || []); continue; }
      if (resolved.skip) { continue; }
      pushUnique(scopeIds, resolved.scopeId);
    }
    return diagnostics.length > 0
      ? { ok: false, scopeIds: [], diagnostics: diagnostics }
      : { ok: true, scopeIds: scopeIds, diagnostics: [] };
  }

  function collectFromScopeIds(_resolveScopeIdForSlot, _KDB, _tabTargets, _moves, _diagnostics) {
    var scopeIds = [];
    _moves.forEach(function (move) {
      var resolved = _resolveScopeIdForSlot(_KDB, _tabTargets, slotOfMove(move, "from"));
      if (!resolved.ok) { Array.prototype.push.apply(_diagnostics, resolved.diagnostics || []); return; }
      if (resolved.skip) { return; }
      pushUnique(scopeIds, resolved.scopeId);
    });
    return scopeIds;
  }

  return {
    pushUnique: pushUnique,
    slotOfMove: slotOfMove,
    findLayoutScopeId: findLayoutScopeId,
    createScopeIdResolver: createScopeIdResolver,
    createSlotScopeResolver: createSlotScopeResolver,
    resolveAffectedScopes: resolveAffectedScopes,
    collectFromScopeIds: collectFromScopeIds
  };
});
