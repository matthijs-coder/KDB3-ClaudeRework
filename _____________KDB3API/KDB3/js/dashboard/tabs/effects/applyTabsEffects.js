define(["../config/actionTypes.js", "./syncTabsDomFromState.js", "./traverseTabs.js", "./syncTabsKdbControlReadView.js", "./applyTabsRenameEffects.js", "./syncTabsStateFromDom.js", "./hydrateTabsDom.js"], function (_actionTypes, _syncTabsDomFromState, _traverseTabs, _syncTabsKdbControlReadView, _applyTabsRenameEffects, _syncTabsStateFromDom, _hydrateTabsDom) {
  "use strict";

  async function __controller(_ctx, _action) {
    try {
      const action = _action || {};
      if (action.type === _actionTypes.SYNC_FROM_DOM) { return _syncTabsStateFromDom(_ctx); }
      if (action.type === _actionTypes.HYDRATE_DOM) { return _hydrateTabsDom(_ctx); }
      if (action.type === _actionTypes.TRAVERSE) { return _traverseTabs(_ctx, action.payload || {}); }
      if (action.type === _actionTypes.RENAME || action.type === _actionTypes.SELECT_EDIT_TARGET || action.type === _actionTypes.CANCEL_EDIT_SESSION) {
        return _applyTabsRenameEffects(_ctx, action);
      }
      if (action.type === _actionTypes.ADD || action.type === _actionTypes.AUTHORING_ENTERED || action.type === _actionTypes.AUTHORING_EXITED) {
        _syncTabsDomFromState(_ctx._KDB, _ctx.getRawState());
        _syncTabsKdbControlReadView(_ctx._KDB);
        return true;
      }
      return true;
    } catch (err) {
      console.error("[tabs.applyTabsEffects] effect failed", err);
      _ctx.dispatch({ type: _actionTypes.ERROR, payload: { errorCode: "TABS_EFFECT_FAILED", errorMessage: toErrorMessage(err) } });
      return false;
    }
  }

  function toErrorMessage(err) { return err && err.message ? err.message : String(err || "Unknown tabs error."); }

  return __controller;
});
