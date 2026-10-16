define([], function () {
  "use strict";

  function mapCommitSourceFlags(_source) {
    if (_source === "sichtStartup" ||
      _source === "startup" ||
      _source === "startupDefault") {
      return { isStartupDefault: true, isHistoryReplay: false, skipDownstreamVisibility: false };
    }
    if (_source === "historyReplay") {
      return { isStartupDefault: false, isHistoryReplay: true, skipDownstreamVisibility: false };
    }
    if (_source === "parameterRestore") {
      return { isStartupDefault: false, isHistoryReplay: false, skipDownstreamVisibility: true };
    }
    return { isStartupDefault: false, isHistoryReplay: false, skipDownstreamVisibility: false };
  }

  return mapCommitSourceFlags;
});
