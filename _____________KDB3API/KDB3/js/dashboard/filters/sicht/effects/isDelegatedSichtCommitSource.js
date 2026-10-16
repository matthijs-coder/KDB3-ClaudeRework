define([], function () {
  "use strict";

  function isDelegatedSichtCommitSource(_source) {
    return _source === "sichtStartup" ||
      _source === "startup" ||
      _source === "startupDefault" ||
      _source === "parameterRestore" ||
      _source === "historyReplay";
  }

  return isDelegatedSichtCommitSource;
});
