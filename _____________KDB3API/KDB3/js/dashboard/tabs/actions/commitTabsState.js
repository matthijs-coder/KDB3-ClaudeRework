define(["../state/reduceTabsAction.js"], function (_reduceTabsAction) {
  "use strict";

  function commitTabsState(instance, _action) {
    const current = instance._KDB.state.tabs;
    const reduced = _reduceTabsAction(current, _action);
    // reduceTabMutationApply returns { state, error } instead of bare state
    // (see its header comment); duck-type that shape here so a postcondition
    // error keeps the old state, is mirrored into
    // runtime.lastTabMutationError and reports false to the saga.
    if (reduced && reduced.state && Object.prototype.hasOwnProperty.call(reduced, "error")) {
      const runtime = instance._KDB.runtime && instance._KDB.runtime.tabs;
      if (runtime) { runtime.lastTabMutationError = reduced.error || null; }
      if (reduced.error) { return false; }
      instance._KDB.state.tabs = reduced.state;
      return reduced.state !== current;
    }
    const next = reduced;
    const runtime = instance._KDB.runtime && instance._KDB.runtime.tabs;
    if (runtime) { runtime.lastTabMutationError = null; }
    if (next === current) { return false; }
    instance._KDB.state.tabs = next;
    return true;
  }

  return commitTabsState;
});
