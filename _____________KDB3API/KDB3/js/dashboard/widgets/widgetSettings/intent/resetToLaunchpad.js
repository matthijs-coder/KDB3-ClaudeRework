define([
  "./downstream.js"
], function (_downstream) {
  "use strict";

  // A terminal result short-circuits the remaining steps of the chain; the marker is stripped at the end.
  function terminalResetResult(_result) {
    return Object.assign({}, _result || {}, { __terminalResetResult: true });
  }

  function isTerminalResetResult(_result) {
    return !!(_result && _result.__terminalResetResult === true);
  }

  function stripTerminalResetResult(_result) {
    const clean = Object.assign({}, _result || {});
    delete clean.__terminalResetResult;
    return clean;
  }

  function cleanupVisContent(_KDB, widgetId, widgetType, isHistoryReplay, diagnostics) {
    if (!widgetId) {
      return terminalResetResult({
        ok: false,
        status: "error",
        errorCode: "WIDGET_SETTINGS_RESET_TARGET_MISSING",
        diagnostics: diagnostics
      });
    }
    if (widgetType !== "live") {
      return { ok: true, skipped: true, reasonCode: "WIDGET_SETTINGS_VIS_CLEANUP_NOT_REQUIRED" };
    }
    return Promise.resolve(_downstream.dispatchToTargetApi(_KDB, "widgetVis", {
      type: "widgetVis/cleanupContent",
      widgetId: widgetId,
      payload: {
        reason: "settingsDelete",
        requestedBy: "widgetSettings",
        clearBinding: true,
        clearDrillthrough: true,
        clearDomDecorations: true,
        isHistoryReplay: isHistoryReplay
      }
    }));
  }

  function routeAfterVisCleanup(_KDB, visResult, widgetId, widgetType, isHistoryReplay, diagnostics) {
    diagnostics.push({ step: "widgetVis/cleanupContent", result: visResult });
    if (visResult && visResult.ok === false && visResult.stale !== true && visResult.skipped !== true) {
      console.warn("[widgetSettings.orchestrateResetToLaunchpad] widgetVis cleanupContent blocked reset", {
        widgetId: widgetId,
        errorCode: visResult.errorCode,
        errorMessage: visResult.errorMessage
      });
      return terminalResetResult({
        ok: false,
        widgetId: widgetId,
        status: "error",
        errorCode: visResult.errorCode || "WIDGET_SETTINGS_RESET_VIS_CLEANUP_FAILED",
        errorMessage: visResult.errorMessage || "widgetVis cleanupContent failed.",
        diagnostics: diagnostics
      });
    }
    return Promise.resolve(_downstream.dispatchToTargetApi(_KDB, "widgetBase", {
      type: "widgetBase/routeToLaunchpad",
      widgetId: widgetId,
      payload: {
        reason: isHistoryReplay ? "historyReplay" : "user",
        requestedBy: "widgetSettings",
        widgetType: widgetType === "text" ? "WIDGET.TEXT" : "WIDGET.VISUALIZATION",
        isTextWidget: widgetType === "text",
        isLiveWidget: widgetType === "live",
        isHistoryReplay: isHistoryReplay
      }
    }));
  }

  function cleanupControlsAfterRoute(_KDB, baseResult, widgetId, isHistoryReplay, diagnostics) {
    if (isTerminalResetResult(baseResult)) {
      return baseResult;
    }
    diagnostics.push({ step: "widgetBase/routeToLaunchpad", result: baseResult });
    if (!baseResult || baseResult.ok !== true) {
      console.warn("[widgetSettings.orchestrateResetToLaunchpad] widgetBase routeToLaunchpad blocked reset", {
        widgetId: widgetId,
        errorCode: baseResult && baseResult.errorCode,
        errorMessage: baseResult && baseResult.errorMessage
      });
      return terminalResetResult({
        ok: false,
        widgetId: widgetId,
        status: "error",
        errorCode: baseResult && baseResult.errorCode ? baseResult.errorCode : "WIDGET_SETTINGS_RESET_BASE_ROUTE_FAILED",
        errorMessage: baseResult && baseResult.errorMessage ? baseResult.errorMessage : "widgetBase routeToLaunchpad failed.",
        diagnostics: diagnostics
      });
    }
    return Promise.resolve(_downstream.dispatchToTargetApi(_KDB, "widgetSettings", {
      type: "widgetSettings/cleanupWidgetControls",
      widgetId: widgetId,
      payload: {
        widgetId: widgetId,
        reason: "settingsDelete",
        requestedBy: "widgetSettings",
        isHistoryReplay: isHistoryReplay
      }
    }));
  }

  function buildResetResult(settingsResult, widgetId, diagnostics) {
    if (isTerminalResetResult(settingsResult)) {
      return stripTerminalResetResult(settingsResult);
    }
    diagnostics.push({ step: "widgetSettings/cleanupWidgetControls", result: settingsResult });
    if (!settingsResult || settingsResult.ok !== true) {
      return {
        ok: false,
        widgetId: widgetId,
        status: "partial",
        errorCode: settingsResult && settingsResult.errorCode ? settingsResult.errorCode : "WIDGET_SETTINGS_RESET_CLEANUP_FAILED",
        errorMessage: settingsResult && settingsResult.errorMessage
          ? settingsResult.errorMessage
          : "widgetSettings cleanupWidgetControls failed.",
        diagnostics: diagnostics
      };
    }
    return {
      ok: true,
      widgetId: widgetId,
      status: "success",
      placement: "inLaunchpad",
      diagnostics: diagnostics
    };
  }

  function orchestrateResetToLaunchpad(_KDB, _intent) {
    const intent = _intent || {};
    const widgetId = String(intent.widgetId || "");
    const widgetType = intent.widgetType === "text" ? "text" : "live";
    const isHistoryReplay = intent.isHistoryReplay === true;
    const diagnostics = [];
    return Promise.resolve()
      .then(function () {
        return cleanupVisContent(_KDB, widgetId, widgetType, isHistoryReplay, diagnostics);
      })
      .then(function (visResult) {
        return routeAfterVisCleanup(_KDB, visResult, widgetId, widgetType, isHistoryReplay, diagnostics);
      })
      .then(function (baseResult) {
        return cleanupControlsAfterRoute(_KDB, baseResult, widgetId, isHistoryReplay, diagnostics);
      })
      .then(function (settingsResult) {
        return buildResetResult(settingsResult, widgetId, diagnostics);
      })
      .catch(function (err) {
        console.error("[widgetSettings.orchestrateResetToLaunchpad] failed", { widgetId: widgetId }, err);
        return {
          ok: false,
          widgetId: widgetId,
          status: "error",
          errorCode: "WIDGET_SETTINGS_RESET_ORCHESTRATION_ERROR",
          errorMessage: String(err && err.message ? err.message : err),
          diagnostics: diagnostics
        };
      });
  }

  return {
    orchestrateResetToLaunchpad: orchestrateResetToLaunchpad
  };
});
