define([], function () {
  "use strict";

  function isCompleteSettingsSnapshot(_snapshot) {
    if (!_snapshot || typeof _snapshot !== "object") {
      return false;
    }
    return _snapshot.dimension !== undefined
      && _snapshot.visType !== undefined
      && _snapshot.topNChoice !== undefined;
  }

  return isCompleteSettingsSnapshot;
});
