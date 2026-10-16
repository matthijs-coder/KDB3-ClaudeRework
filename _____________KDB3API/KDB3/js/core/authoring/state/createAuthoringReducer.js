define([], function () {
  "use strict";
  var ACTION_TYPES = {
    ENTER: "authoring/enter",
    EXIT: "authoring/exit",
  };
  function createAuthoringReducer() {
    function reduce(prev, action) {
      if (!prev || typeof prev.isAuthoring !== "boolean") {
        prev = { isAuthoring: false };
      }
      var t = action && action.type;
      if (t === ACTION_TYPES.ENTER) {
        if (prev.isAuthoring === true) return prev;
        return { isAuthoring: true };
      }
      if (t === ACTION_TYPES.EXIT) {
        if (prev.isAuthoring === false) return prev;
        return { isAuthoring: false };
      }
      return prev;
    }
    return reduce;
  }
  return createAuthoringReducer;
});
