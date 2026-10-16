define([], function () {
  "use strict";

  return {
    CHANNELS: {
      TEXT: "text",
      VISUALIZATION: "visualization",
      DATA_TABLES: "dataTables",
      TOP_N: "topN",
      OTHER_RESOURCES: "otherResources"
    },
    SKIP_REASON: {
      HOST_WIDGET: "HOST_WIDGET",
      WRITEBACK_TABLE: "WRITEBACK_TABLE",
      LAUNCHPAD_DISABLED: "LAUNCHPAD_DISABLED"
    },
    CHART_TYPES: ["BAR", "COLUMN", "LINE", "PIE", "STACKEDBAR", "STACKEDCOLUMN", "AREA", "SCATTER", "BUBBLE", "COMBO"],
    WRITE_BACK_TITLES: ["writebacktable", "writebacktabel", "writebacktabel_get", "writebacktabel_set"],
    HOST_WIDGET_ID: "kdb3widget",
    LABELS_DE: {
      maxWidgetsPerTab: "Die maximale Anzahl von Widgets pro Tab ist bereits in Verwendung"
    }
  };
});
