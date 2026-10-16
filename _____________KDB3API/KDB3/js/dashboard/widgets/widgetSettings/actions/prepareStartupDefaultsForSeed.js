define([
  "../config/intentDispatchMap.js",
  "../effects/buildWidgetVisSettingsSnapshot.js"
], function (_intentDispatchMap, _visSnapshot) {
  "use strict";

  function splitStartupDefaults(_defaults) {
    const colourDefaults = [];
    const singleDefaultDescriptors = [];
    const visBatchDescriptors = [];
    const entries = _defaults || [];
    let index = 0;
    while (index < entries.length) {
      const descriptor = entries[index];
      const kind = _intentDispatchMap.normalizeKind(descriptor.kind);
      if (kind === "backgroundColor") {
        colourDefaults.push(descriptor);
      } else if (_visSnapshot.isWidgetVisKind(kind)) {
        visBatchDescriptors.push(descriptor);
      } else {
        singleDefaultDescriptors.push(descriptor);
      }
      index += 1;
    }
    return {
      colourDefaults: colourDefaults,
      singleDefaultDescriptors: singleDefaultDescriptors,
      visBatchDescriptors: visBatchDescriptors
    };
  }

  function resolveSeedWidgetType(payload) {
    const kind = String(payload.widgetType || payload.kind || payload.type || "").toLowerCase();
    if (kind === "text") {
      return "text";
    }
    if (kind === "vis" || kind === "live") {
      return "live";
    }
    return "live";
  }

  function clearLeftoverFamilyAKeys(_KDB, _widgetId) {
    try {
      const widgetId = String(_widgetId || "");
      const settings = _KDB && _KDB.state && _KDB.state.widgets && _KDB.state.widgets.settings;
      const record = settings && settings.byWidget && settings.byWidget[widgetId];
      if (!record) {
        return;
      }
      delete record.showValues;
      delete record.showValuesMeta;
      delete record.grouping;
      delete record.groupingMeta;
      delete record.iterator;
      delete record.iteratorMeta;
      delete record.zoom;
      delete record.zoomMeta;
      delete record.valueCaption;
      delete record.valueCaptionMeta;
    } catch (err) {
      console.error("[widgetSettings.clearLeftoverFamilyAKeys] failed", { widgetId: _widgetId }, err);
      throw err;
    }
  }

  return {
    splitStartupDefaults: splitStartupDefaults,
    resolveSeedWidgetType: resolveSeedWidgetType,
    clearLeftoverFamilyAKeys: clearLeftoverFamilyAKeys
  };
});
