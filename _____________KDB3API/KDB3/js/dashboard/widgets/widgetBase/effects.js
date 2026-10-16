define([
  "../widgetSettings/config/selectors.js",
  "./view/placement.js",
  "./view/colour.js"
], function (_settingsSelectors, _placement, _colour) {
  "use strict";

  const CONTENT_CREATE_FAILED = "WIDGET_BASE_CONTENT_CREATE_FAILED";

  function readHostFacet(_KDB, facetKey) {
    const runtime = _KDB && _KDB.runtime ? _KDB.runtime.widgetBase : null;
    return runtime && runtime[facetKey] ? runtime[facetKey] : null;
  }

  function errorMessageOf(err) {
    return String(err && err.message ? err.message : err);
  }

  // Fire-and-forget call into another owner's public API; a missing API or widgetId is a silent no-op.
  // onResult sees the settled result of a promise-returning dispatch and must not throw.
  function dispatchFireAndForget(label, _KDB, ownerKey, action, onResult) {
    try {
      const api = _KDB && _KDB.api && _KDB.api[ownerKey];
      if (!api || typeof api.dispatch !== "function" || !action.widgetId) {
        return;
      }
      const result = api.dispatch(action);
      if (result && typeof result.then === "function") {
        result.then(onResult, function (err) {
          console.error("[widgetBase." + label + "] failed", { type: action.type, widgetId: action.widgetId }, err);
        });
      }
    } catch (err) {
      console.error("[widgetBase." + label + "] failed", { type: action.type }, err);
    }
  }

  function dispatchToWidgetVis(_KDB, type, request) {
    const widgetId = request && request.widgetId;
    dispatchFireAndForget("dispatchWidgetVisLifecycle", _KDB, "widgetVis", {
      type: type,
      widgetId: widgetId,
      payload: { widgetId: widgetId, reason: (request && request.reason) || null }
    });
  }

  function dispatchWidgetVisDispose(_KDB, _request) {
    dispatchToWidgetVis(_KDB, "widgetVis/disposeWidgetRuntime", _request);
  }

  // A removed owner gives up its TopN helper claim. Not awaited: remove does not wait for the helper clear (up to the 5 s
  // render wait). The claim is held until that clear finishes, so another owner resolving in that window finds no free helper.
  function dispatchWidgetTopNCleanup(_KDB, _request) {
    const widgetId = _request && _request.widgetId;
    dispatchFireAndForget("dispatchWidgetTopNCleanup", _KDB, "widgetTopN", {
      type: "widgetTopN/cleanup",
      widgetId: widgetId,
      payload: { ownerVisId: widgetId, reason: _request.reason, clearHelperBinding: true, releaseClaim: true }
    }, function (result) {
      if (result && result.ok === false && result.reason !== "disposed" && result.status !== "aborted") {
        console.warn("[widgetBase.dispatchWidgetTopNCleanup] cleanup failed", { widgetId: widgetId, errorCode: result.errorCode || null });
      }
    });
  }

  function dispatchWidgetVisEnsureObservers(_KDB, _request) {
    dispatchToWidgetVis(_KDB, "widgetVis/ensureObservers", _request);
  }

  function dispatchWidgetSettingsCleanup(_KDB, _request) {
    const widgetId = _request && _request.widgetId;
    dispatchFireAndForget("dispatchWidgetSettingsCleanup", _KDB, "widgetSettings", {
      type: "widgetSettings/cleanupWidgetControls",
      widgetId: widgetId,
      payload: { widgetId: widgetId }
    });
  }

  function readKennzahlenTable(shellEl) {
    if (!shellEl || !shellEl.getAttribute) {
      return "";
    }
    return shellEl.getAttribute(_settingsSelectors.kennzahlenTableAttr) || shellEl.getAttribute(_settingsSelectors.kennzahlenTableAttrAlt) || "";
  }

  function readPlaceControlsResult(result, widgetId) {
    if (result && typeof result.then === "function") {
      return result.then(function (resolved) {
        return resolved && resolved.ok === true;
      }).catch(function (err) {
        console.error("[widgetBase.dispatchWidgetSettingsPlaceControls] failed", { widgetId: widgetId }, err);
        return false;
      });
    }
    return Promise.resolve(result && result.ok === true);
  }

  function dispatchWidgetSettingsPlaceControls(_KDB, _request) {
    try {
      const api = _KDB && _KDB.api && _KDB.api.widgetSettings;
      const request = _request || {};
      const widgetId = request.widgetId;
      if (!api || typeof api.dispatch !== "function" || !widgetId) {
        return Promise.resolve(false);
      }
      const shellEl = request.shellEl;
      const payload = {
        widgetId: widgetId,
        widgetEl: shellEl,
        shellRoot: shellEl,
        widgetType: request.kind === "text" ? "text" : "live",
        kind: request.kind,
        layout: request.layout || null,
        dropRequest: request.dropRequest || null,
        kennzahlenTable: readKennzahlenTable(shellEl)
      };
      if (request.isHistoryReplay === true) {
        payload.isHistoryReplay = true;
      }
      if (request.source) {
        payload.source = request.source;
      }
      return readPlaceControlsResult(api.dispatch({ type: "widgetSettings/placeControls", widgetId: widgetId, payload: payload }), widgetId);
    } catch (err) {
      console.error("[widgetBase.dispatchWidgetSettingsPlaceControls] failed", err);
      return Promise.resolve(false);
    }
  }

  const EMPTY_METRIC = { resolved: false, code: "", display: "", metricsTable: "", langtext: "", url: "" };

  function resolveMetricByCode(_KDB, _code) {
    const api = _KDB && _KDB.api && _KDB.api.metricsTree;
    if (!api || typeof api.resolveMetricByCode !== "function") {
      return Object.assign({}, EMPTY_METRIC);
    }
    const descriptor = api.resolveMetricByCode(_code);
    return descriptor && descriptor.resolved === true ? descriptor : Object.assign({}, EMPTY_METRIC);
  }

  function resolveContentApi(_KDB, kind) {
    if (!_KDB || !_KDB.api) {
      return null;
    }
    if (kind === "text") {
      return _KDB.api.widgetText;
    }
    if (kind === "vis") {
      return _KDB.api.widgetVis;
    }
    if (kind === "datatable") {
      return _KDB.api.widgetDataTable;
    }
    if (kind === "topN") {
      return _KDB.api.widgetTopN;
    }
    return null;
  }

  function dispatchContentAction(api, action) {
    if (!api || typeof api.dispatch !== "function") {
      return null;
    }
    return Promise.resolve(api.dispatch(action));
  }

  function firstNonEmpty() {
    for (let i = 0; i < arguments.length; i += 1) {
      const value = arguments[i];
      if (value != null && String(value).trim() !== "") {
        return String(value);
      }
    }
    return "";
  }

  function buildVisMetric(_KDB, dropPayload) {
    const source = dropPayload || {};
    const code = source.code || source.kennzahlCode || "";
    const resolved = resolveMetricByCode(_KDB, code);
    return {
      code: firstNonEmpty(resolved.code, code),
      display: firstNonEmpty(resolved.display, source.display, source.kennzahlDisplay, source.title),
      metricsTable: firstNonEmpty(resolved.metricsTable, source.metricsTable, source.kennzahlenTable),
      langtext: firstNonEmpty(resolved.langtext, source.langtext),
      url: firstNonEmpty(resolved.url, source.url)
    };
  }

  function buildVisContentCreatePayload(_KDB, payload) {
    const requestPayload = payload || {};
    const dropPayload = requestPayload.payload || (requestPayload.dropRequest && requestPayload.dropRequest.payload) || {};
    return Object.assign({}, requestPayload, {
      metric: requestPayload.metric || buildVisMetric(_KDB, dropPayload)
    });
  }

  function buildContentAction(_KDB, kind, widgetId, payload) {
    if (kind === "text") {
      return { type: "widgetText/contentCreate", widgetId: widgetId, payload: payload };
    }
    if (kind === "vis") {
      return { type: "widgetVis/contentCreate", widgetId: widgetId, payload: buildVisContentCreatePayload(_KDB, payload) };
    }
    if (kind === "datatable") {
      return { type: "widgetDataTable/contentCreate", widgetId: widgetId, payload: payload };
    }
    if (kind === "topN") {
      return { type: "widgetTopN/contentCreate", widgetId: widgetId, payload: payload };
    }
    return { type: "widgetBase/unsupportedContentCreate", widgetId: widgetId, payload: payload };
  }

  function dispatchContentCreate(_KDB, _request) {
    try {
      const request = _request || {};
      const kind = request.kind;
      const widgetId = request.widgetId;
      const api = resolveContentApi(_KDB, kind);
      if (!api || typeof api.dispatch !== "function") {
        return Promise.resolve({ ok: false, errorCode: CONTENT_CREATE_FAILED, errorMessage: "Content owner API unavailable for kind " + kind + "." });
      }
      const action = buildContentAction(_KDB, kind, widgetId, request.payload || {});
      return dispatchContentAction(api, action).then(function (result) {
        if (result && result.ok === false) {
          return { ok: false, errorCode: CONTENT_CREATE_FAILED, errorMessage: result.errorMessage || "Content create rejected." };
        }
        return { ok: true, result: result };
      }).catch(function (err) {
        console.error("[widgetBase.dispatchContentCreate] content owner dispatch failed", kind, widgetId, err);
        return { ok: false, errorCode: CONTENT_CREATE_FAILED, errorMessage: errorMessageOf(err) };
      });
    } catch (err) {
      console.error("[widgetBase.dispatchContentCreate] sync boundary failed", err);
      return Promise.resolve({ ok: false, errorCode: CONTENT_CREATE_FAILED, errorMessage: errorMessageOf(err) });
    }
  }

  function isSkippedHost(outcome) {
    if (!outcome) {
      return true;
    }
    if (outcome.ok === true) {
      return false;
    }
    if (outcome.outcome === "aborted") {
      return true;
    }
    return outcome.errorCode === "WIDGETS_HOST_UNAVAILABLE" || outcome.errorCode === "WIDGETS_HOST_CAPABILITY_MISSING";
  }

  function writeHostLayout(_KDB, widgetId, layout) {
    const widgetsFacet = readHostFacet(_KDB, "widgetsFacet");
    if (!widgetsFacet || typeof widgetsFacet.setWidgetLayout !== "function") {
      return Promise.resolve({ ok: true });
    }
    const failure = function (errorMessage) {
      return { ok: false, layout: layout, errorCode: "WIDGET_BASE_COGNOS_LAYOUT_FAILED", errorMessage: errorMessage };
    };
    return Promise.resolve(widgetsFacet.setWidgetLayout(widgetId, {
      left: layout.x + "px",
      top: layout.y + "px",
      width: layout.width + "px",
      height: layout.height + "px"
    })).then(function (outcome) {
      if ((outcome && outcome.ok === true) || isSkippedHost(outcome)) {
        return { ok: true };
      }
      return failure(outcome && outcome.errorCode ? String(outcome.errorCode) : "Cognos layout write failed.");
    }).catch(function (err) {
      return failure(errorMessageOf(err));
    });
  }

  function applyWidgetLayout(_KDB, _widgetId, _layout) {
    return _placement.applyWidgetLayout(_KDB, _widgetId, _layout).then(function (layoutResult) {
      if (!layoutResult || layoutResult.ok !== true) {
        return layoutResult;
      }
      return writeHostLayout(_KDB, _widgetId, _layout).then(function (hostResult) {
        return hostResult.ok === true ? layoutResult : hostResult;
      });
    });
  }

  function mirrorFillColor(_KDB, widgetId, colour) {
    const widgetsFacet = readHostFacet(_KDB, "widgetsFacet");
    if (!widgetsFacet || typeof widgetsFacet.setWidgetProperty !== "function") {
      return Promise.resolve(false);
    }
    return Promise.resolve(widgetsFacet.setWidgetProperty(widgetId, "fillColor", colour)).then(function (outcome) {
      if (outcome && outcome.ok !== true && outcome.errorCode === "WIDGETS_WRITE_FAILED") {
        console.warn("[widgetBase.applyWidgetColour] Cognos fillColor mirror failed", widgetId, outcome);
      }
      return outcome;
    }).catch(function (err) {
      console.warn("[widgetBase.applyWidgetColour] Cognos fillColor mirror failed", widgetId, err);
      return false;
    });
  }

  function applyWidgetColour(_KDB, _widgetId, _input) {
    return _colour.applyWidgetColour(_KDB, _widgetId, _input).then(function (colourResult) {
      if (!colourResult || colourResult.ok !== true) {
        return colourResult;
      }
      return mirrorFillColor(_KDB, _widgetId, colourResult.colour).then(function () {
        return colourResult;
      });
    });
  }

  return {
    readHostFacet: readHostFacet,
    dispatchWidgetVisDispose: dispatchWidgetVisDispose,
    dispatchWidgetTopNCleanup: dispatchWidgetTopNCleanup,
    dispatchWidgetVisEnsureObservers: dispatchWidgetVisEnsureObservers,
    dispatchWidgetSettingsCleanup: dispatchWidgetSettingsCleanup,
    dispatchWidgetSettingsPlaceControls: dispatchWidgetSettingsPlaceControls,
    dispatchContentCreate: dispatchContentCreate,
    resolveMetricByCode: resolveMetricByCode,
    resolveContentApi: resolveContentApi,
    dispatchContentAction: dispatchContentAction,
    applyWidgetLayout: applyWidgetLayout,
    applyWidgetColour: applyWidgetColour
  };
});
