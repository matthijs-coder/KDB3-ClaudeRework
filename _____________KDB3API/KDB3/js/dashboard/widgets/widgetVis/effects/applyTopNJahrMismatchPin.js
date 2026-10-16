define([
  "./resolveTopNJahrFilterValue.js",
  "../drillthrough/year.js",
  "../../../../core/config/visualizations/topNHelper.js",
  "../runtime.js"
], function (_resolveTopNJahrFilterValue, _drillthroughYear, _topNHelper, _visRuntime) {
  "use strict";

  var STICHTAG_CODE = "WIDGET_TOPN_STICHTAG_UNAVAILABLE";

  function __controller(_KDB, _metricsTable, _request) {
    try {
      var runtime = _visRuntime.initializeRuntime(_KDB);
      var request = _request || {};
      var pending = runtime.pendingPromises.periodPinRead;
      var started;
      if (pending) {
        return pending.then(applyAfterRead.bind(null, _KDB, _metricsTable, request));
      }
      started = _resolveTopNJahrFilterValue(_KDB);
      runtime.pendingPromises.periodPinRead = started;
      return started.then(
        finishRead.bind(null, _KDB, _metricsTable, request, started),
        failRead.bind(null, _KDB, started)
      );
    } catch (err) {
      return Promise.reject(asStichtag(err));
    }
  }

  function finishRead(_KDB, _metricsTable, _request, _started, _pin) {
    dropPending(_KDB, _started);
    return applyRule(_KDB, _metricsTable, _request, _pin);
  }

  function applyAfterRead(_KDB, _metricsTable, _request, _pin) {
    return applyRule(_KDB, _metricsTable, _request, _pin);
  }

  function failRead(_KDB, _started, _err) {
    dropPending(_KDB, _started);
    return Promise.reject(_err);
  }

  function dropPending(_KDB, _started) {
    var runtime = _visRuntime.initializeRuntime(_KDB);
    if (runtime.pendingPromises.periodPinRead === _started) {
      delete runtime.pendingPromises.periodPinRead;
    }
  }

  function applyRule(_KDB, _metricsTable, _request, _pin) {
    try {
      var captionYear = Number(_pin && _pin.jahrFilterValue && _pin.jahrFilterValue.d);
      var selected;
      var dez;
      if (!isFinite(captionYear)) {
        return Promise.reject(stichtagUnavailable("NewestStichtag caption year is not a number."));
      }
      selected = resolveSelected(_KDB, _metricsTable, _request);
      if (selected == null || Number(selected) === captionYear) {
        return storeSession(_KDB, _pin);
      }
      dez = _topNHelper.monthCodeToCaption && _topNHelper.monthCodeToCaption["12"];
      if (!dez) {
        return Promise.reject(stichtagUnavailable("monthCodeToCaption is missing 12."));
      }
      return storeSession(_KDB, {
        jahrFilterValue: { d: String(selected), u: String(selected) },
        monatFilterValue: { d: dez, u: dez }
      });
    } catch (err) {
      return Promise.reject(asStichtag(err));
    }
  }

  function resolveSelected(_KDB, _metricsTable, _request) {
    var pageId;
    var pageYear;
    if (!_request || _request.selectedYearKnown !== true) {
      return _drillthroughYear.readDrillthroughJahrYear(_KDB, _metricsTable);
    }
    if (_request.scopeType === "pageContext") {
      if (_request.selectedYear != null) {
        return _request.selectedYear;
      }
      return _drillthroughYear.readDrillthroughJahrYear(_KDB, _metricsTable, "global");
    }
    pageId = readActivePageId(_KDB);
    if (pageId) {
      pageYear = _drillthroughYear.readDrillthroughJahrYear(_KDB, _metricsTable, pageId);
      if (pageYear != null) {
        return pageYear;
      }
    }
    return _request.selectedYear == null ? null : _request.selectedYear;
  }

  function readActivePageId(_KDB) {
    var tabs = _KDB && _KDB.state ? _KDB.state.tabs : null;
    return tabs && (tabs.activeTabId || tabs.currentTabId) || null;
  }

  function storeSession(_KDB, _pin) {
    _visRuntime.initializeRuntime(_KDB).sessionPeriodPin = _pin;
    return _pin;
  }

  function asStichtag(_err) {
    if (_err && _err.errorCode === STICHTAG_CODE) {
      return _err;
    }
    return stichtagUnavailable(_err && (_err.errorMessage || _err.message) ? (_err.errorMessage || _err.message) : _err);
  }

  function stichtagUnavailable(_errorMessage) {
    return {
      errorCode: STICHTAG_CODE,
      errorMessage: String(_errorMessage || "NewestStichtag period pin is unavailable.")
    };
  }

  return __controller;
});
