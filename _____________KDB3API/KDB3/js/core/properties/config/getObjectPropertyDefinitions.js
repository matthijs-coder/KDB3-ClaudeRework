define([], function () {
  "use strict";

  function getObjectPropertyDefinitions() {
    return [
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
      {
        propertyId: "com.ibm.vis.custom.prognoseyearlinechartPropId",
        runtimeKey: "prognosePropObj"
      },
      { propertyId: "kennzahlSpecificSlotDefaultId", runtimeKey: "kennzahlSpecificSlotDefaultObj" },
      { propertyId: "headerWidgetPropId", runtimeKey: "headerWidgetPropObj" },
      { propertyId: "pdfAttachmentPageId", runtimeKey: "pdfAttachmentPageObj" }
    ];
  }

  return getObjectPropertyDefinitions;
});
