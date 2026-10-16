define([], function () {
  "use strict";

  return {
    backgroundColor: {
      key: "weiss",
      displayValue: "Weiß",
      useValue: "#ffffff",
      isDefault: true
    },
    fontSize: {
      key: "default",
      displayValue: "Automatisch",
      useValue: "automatic",
      isDefault: true
    },
    layout: {
      key: "default",
      displayValue: "Default",
      useValue: "KDB_widgetHeader_defaultStyle",
      isDefault: true
    },
    visualization: {
      key: "line",
      displayValue: "Linie",
      useValue: "line",
      isDefault: true
    },
    dimension: {
      key: "none",
      displayValue: "Ohne",
      useValue: "none",
      isDefault: true
    },
    topN: {
      key: "none",
      displayValue: "Ohne",
      useValue: "none",
      isDefault: true
    }
  };
});
