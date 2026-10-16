define([
  "../actions/handleRouteToLaunchpad.js",
], function (_handleRouteToLaunchpad) {
  "use strict";

  var RESET_FAILED = "WRITEBACK_WIDGET_RESET_FAILED";

  // Route hints per frame.kind so resolveLaunchpadRoute re-derives the same
  // route (and re-registers the same kind/role) the widget had originally.
  var KIND_TO_ROUTE_HINTS = {
    text: { widgetType: "WIDGET.TEXT", isTextWidget: true },
    vis: { isLiveWidget: true },
    topN: { visualType: "LIST", isTopNHelperClaim: true },
    datatable: { visualType: "LIST" },
    other: {},
  };

  // Parks canvas widgets in their launchpad slots for a parameterSet reset.
  // Reuses the owner routeToLaunchpad path per widget; the reset reason keeps
  // the existing history suppression active (only "user"/"contentRequest"
  // transfers commit history). Mutates the shared reset result in place.
  async function parkWidgetsForParameterSet(context, widgetIds, result) {
    for (const widgetId of widgetIds) {
      const frame = context.selectors.readFrame(context._KDB, widgetId);
      const routeHints = frame && frame.kind ? KIND_TO_ROUTE_HINTS[frame.kind] : undefined;
      if (routeHints === undefined) {
        result.skipped.push({ widgetId: widgetId, code: "WIDGET_BASE_KIND_UNRESOLVED" });
        result.diagnostics.push({
          code: RESET_FAILED,
          widgetId: widgetId,
          message: "cannot park widget without a resolvable launchpad route (kind: " + String(frame && frame.kind) + ")",
        });
        result.ok = false;
        continue;
      }
      const parkResult = await parkOne(context, widgetId, frame, routeHints);
      if (parkResult.ok === true && parkResult.skipped !== true) {
        result.resetWidgets.push(widgetId);
      } else if (parkResult.ok === true && parkResult.skipped === true) {
        result.skipped.push({ widgetId: widgetId, code: parkResult.reasonCode || "WIDGET_BASE_WIDGET_SKIPPED" });
      } else {
        result.skipped.push({ widgetId: widgetId, code: parkResult.errorCode || RESET_FAILED });
        result.diagnostics.push({
          code: RESET_FAILED,
          widgetId: widgetId,
          message: "routeToLaunchpad failed during parameterSet reset: " + String(parkResult.errorCode || "unknown"),
        });
        result.ok = false;
      }
    }
  }

  function parkOne(context, widgetId, frame, routeHints) {
    return _handleRouteToLaunchpad(context, {
      type: context.actionTypes.ROUTE_TO_LAUNCHPAD,
      widgetId: widgetId,
      payload: Object.assign({
        reason: "parameterSetReset",
        sourceModule: "widgetBase",
        tabId: frame.tabId || null,
        isHistoryReplay: false,
      }, routeHints),
    }).catch(function (err) {
      return {
        ok: false,
        widgetId: widgetId,
        errorCode: "WIDGET_BASE_LAUNCHPAD_APPEND_FAILED",
        errorMessage: String(err && err.message ? err.message : err),
      };
    });
  }

  return parkWidgetsForParameterSet;
});
