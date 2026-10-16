define([], function () {
  function __controller(_action) {
    return {
      ok: true,
      skipped: true,
      reasonCode: "SCAFFOLD_NOOP",
      actionType: _action && _action.type ? _action.type : null
    };
  }
  return __controller;
});
