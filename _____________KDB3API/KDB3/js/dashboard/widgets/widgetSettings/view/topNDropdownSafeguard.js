// shim: path kept for imports from outside this module; remove in Phase 2
define(["./optionMarking.js"], function (_m) {
  return {
    markTopNPending: _m.markTopNPending,
    revertTopNDropdownFromState: _m.revertTopNDropdownFromState
  };
});
