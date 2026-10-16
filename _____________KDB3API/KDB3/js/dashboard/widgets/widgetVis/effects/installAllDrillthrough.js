define([
  "./installDrillthrough.js",
  "./installDatapointDrillthrough.js"
], function (_installDrillthrough, _installDatapointDrillthrough) {
  "use strict";

  function mergeInstallResults(_iconResult, _datapointResult) {
    if (_iconResult && _iconResult.ok === false) {
      return _iconResult;
    }
    if (_datapointResult && _datapointResult.ok === false) {
      return _datapointResult;
    }
    return {
      ok: true,
      skipped: !!(
        (_iconResult && _iconResult.skipped) &&
        (_datapointResult && _datapointResult.skipped)
      )
    };
  }

  function __controller(_options) {
    try {
      return mergeInstallResults(
        _installDrillthrough(_options),
        _installDatapointDrillthrough(_options)
      );
    } catch (err) {
      console.error("[widgetVis.installAllDrillthrough]", _options && _options.widgetId, err);
      return { ok: false, errorCode: "WIDGET_VIS_DRILLTHROUGH_FAILED" };
    }
  }

  return __controller;
});
