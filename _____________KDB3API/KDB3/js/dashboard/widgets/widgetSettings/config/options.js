define([], function () {
  "use strict";

  return {
    fontSize: [
      { key: "default", label: "Automatisch", value: "automatic" },
      { key: "8px", label: "8px", value: "8px;" },
      { key: "10px", label: "10px", value: "10px;" },
      { key: "12px", label: "12px", value: "12px;" },
      { key: "14px", label: "14px", value: "14px;" },
      { key: "16px", label: "16px", value: "16px;" },
      { key: "18px", label: "18px", value: "18px;" },
      { key: "20px", label: "20px", value: "20px;" },
      { key: "22px", label: "22px", value: "22px;" },
      { key: "24px", label: "24px", value: "24px;" },
      { key: "26px", label: "26px", value: "26px;" },
      { key: "28px", label: "28px", value: "28px;" },
      { key: "30px", label: "30px", value: "30px;" }
    ],
    topN: [
      { key: "top-10", label: "Top-10", value: "10" },
      { key: "top-5", label: "Top-5", value: "5" },
      { key: "top-3", label: "Top-3", value: "3" },
      { key: "top-2", label: "Top-2", value: "2" },
      { key: "top-1", label: "Top-1", value: "1" }
    ],
    restyle: [
      { key: "default", label: "Default", value: "KDB_widgetHeader_defaultStyle" },
      { key: "rahmen(alle)", label: "Rahmen(alle)", value: "KDB_widgetHeader_allBordersStyle" },
      { key: "rahmen(unterer)", label: "Rahmen(unterer)", value: "KDB_widgetHeader_bottomBorderStyle" },
      { key: "rahmen(oberer)", label: "Rahmen(oberer)", value: "KDB_widgetHeader_topBorderStyle" },
      { key: "zentriert", label: "Zentriert", value: "KDB_widgetHeader_centeredStyle" },
      { key: "rahmen(alle) und zentriert", label: "Rahmen(alle) und zentriert", value: "KDB_widgetHeader_allBordersCenteredStyle" },
      { key: "rahmen(unterer) und zentriert", label: "Rahmen(unterer) und zentriert", value: "KDB_widgetHeader_bottomBorderCenteredStyle" },
      { key: "rahmen(oberer) und zentriert", label: "Rahmen(oberer) und zentriert", value: "KDB_widgetHeader_topBorderCenteredStyle" }
    ],
    visualization: [
      { key: "line", label: "Linie", value: "line", icon: "line.png" },
      { key: "pie", label: "Kreisdiagramm", value: "pie", icon: "pie.png" },
      { key: "stackedbar", label: "Balkendiagramm", value: "stackedbar", icon: "stackedbar.png" },
      { key: "stackedcolumn", label: "Säulendiagramm", value: "stackedcolumn", icon: "stackedcolumn.png" },
      { key: "list", label: "Tabelle", value: "list", icon: "list.png" },
      { key: "prognose", label: "Prognose", value: "com.ibm.vis.custom.prognoseyear", icon: "prognose.png" }
    ],
    grouping: [
      { key: "inherit", label: "Diagrammstandard", value: "inherit", isDefault: true },
      { key: "stichtag", label: "Stichtag", value: "stichtag" },
      { key: "jahr", label: "Jahr", value: "jahr" },
      { key: "jahrStichtag", label: "Jahr | Stichtag", value: "jahrStichtag" },
      { key: "stichtagProJahrH", label: "Stichtag pro Jahr (H)", value: "stichtagProJahrH" },
      { key: "stichtagProJahrV", label: "Stichtag pro Jahr (V)", value: "stichtagProJahrV" }
    ],
    showValues: [
      { key: "off", label: "Aus", value: "off" },
      { key: "inherit", label: "Standard", value: "inherit", isDefault: true },
      { key: "on", label: "Ein", value: "on" }
    ],
    iterator: [
      { key: "iter-off", label: "Aus", value: "off" },
      { key: "iter-inherit", label: "Standard", value: "inherit", isDefault: true },
      { key: "iter-on", label: "Ein", value: "on" }
    ],
    zoom: [
      { key: "zoom-off", label: "Aus", value: "off" },
      { key: "zoom-inherit", label: "Standard", value: "inherit", isDefault: true },
      { key: "zoom-on", label: "Ein", value: "on" }
    ],
    valueCaption: [
      { key: "vcap-off", label: "Aus", value: "off" },
      { key: "vcap-inherit", label: "Standard", value: "inherit", isDefault: true },
      { key: "vcap-on", label: "Ein", value: "on" }
    ],
    move: [
      { key: "default", label: "default", value: "default" },
      { key: "einmalig", label: "einmalig", value: "oneShot" },
      { key: "aktiv", label: "aktiv", value: "persistent" }
    ],
    title: [
      { key: "default", label: "default", value: "default" }
    ]
  };
});
