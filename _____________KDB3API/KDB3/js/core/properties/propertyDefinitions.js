define([], function () {
  "use strict";

  // Cognos property id -> `_KDB.properties.<runtimeKey>` (JSON blobs wrapped as {"<propertyId>": {...}}).
  var OBJECTS = Object.freeze([
    { propertyId: "loadingTablesPropId", runtimeKey: "loadingTablesPropObj" },
    { propertyId: "kennzahlenTablesPropId", runtimeKey: "kennzahlenTablesPropObj" },
    { propertyId: "kennzahlenTreePropId", runtimeKey: "kennzahlenTreePropObj" },
    { propertyId: "filterPropId", runtimeKey: "filterPropObj" },
    { propertyId: "textWidgetPropId", runtimeKey: "textWidgetPropObj" },
    { propertyId: "visualizationsPropId", runtimeKey: "visualizationsPropObj" },
    { propertyId: "visualizationsDataPropId", runtimeKey: "visualizationsDataPropObj" },
    { propertyId: "linePropId", runtimeKey: "linePropObj" },
    { propertyId: "piePropId", runtimeKey: "piePropObj" },
    { propertyId: "stackedBarPropId", runtimeKey: "stackedBarPropObj" },
    { propertyId: "stackedColumnPropId", runtimeKey: "stackedColumnPropObj" },
    { propertyId: "listPropId", runtimeKey: "listPropObj" },
    { propertyId: "com.ibm.vis.custom.prognoseyearlinechartPropId", runtimeKey: "prognosePropObj" },
    { propertyId: "kennzahlSpecificSlotDefaultId", runtimeKey: "kennzahlSpecificSlotDefaultObj" },
    { propertyId: "headerWidgetPropId", runtimeKey: "headerWidgetPropObj" },
    { propertyId: "pdfAttachmentPageId", runtimeKey: "pdfAttachmentPageObj" }
  ]);

  var TOGGLES = Object.freeze([
    { propertyId: "KDBReadyToggle", runtimeKey: "KDBReadyToggle" },
    { propertyId: "KDBLoadingImageToggle", runtimeKey: "KDBPlayLoadingImageToggle" },
    { propertyId: "KDBLoadingImageTransparentToggle", runtimeKey: "KDBLoadingImageTransparentToggle" },
    { propertyId: "KDBHideWidgetsToggle", runtimeKey: "KDBHideWidgetsToggle" }
  ]);

  var SUBSCRIPTIONS = Object.freeze([
    {
      propertyId: "KDBHideWidgetsToggle",
      eventName: "change:property:KDBHideWidgetsToggle",
      runtimeKey: "hideWidgetsToggle"
    }
  ]);

  return {
    OBJECTS: OBJECTS,
    TOGGLES: TOGGLES,
    SUBSCRIPTIONS: SUBSCRIPTIONS,
    DEVELOPER_MODE_CLASS: "KDB_developerMode",
    DEVELOPER_MODE_LABELS: Object.freeze({
      hideDataBeforeSaveHint: "Hinweis: HideData-Filter vor dem Speichern entfernen"
    })
  };
});
