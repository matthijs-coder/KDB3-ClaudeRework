define([], function () {
  var KNOWN_HEADER_CLASSES = [
    "KDB_widgetHeader_defaultStyle",
    "KDB_widgetHeader_allBordersStyle",
    "KDB_widgetHeader_bottomBorderStyle",
    "KDB_widgetHeader_topBorderStyle",
    "KDB_widgetHeader_centeredStyle",
    "KDB_widgetHeader_allBordersCenteredStyle",
    "KDB_widgetHeader_bottomBorderCenteredStyle",
    "KDB_widgetHeader_topBorderCenteredStyle"
  ];

  var OPTION_KEY_TO_CLASS = {
    default: "KDB_widgetHeader_defaultStyle",
    "rahmen(alle)": "KDB_widgetHeader_allBordersStyle",
    "rahmen(unterer)": "KDB_widgetHeader_bottomBorderStyle",
    "rahmen(oberer)": "KDB_widgetHeader_topBorderStyle",
    zentriert: "KDB_widgetHeader_centeredStyle",
    "rahmen(alle) und zentriert": "KDB_widgetHeader_allBordersCenteredStyle",
    "rahmen(unterer) und zentriert": "KDB_widgetHeader_bottomBorderCenteredStyle",
    "rahmen(oberer) und zentriert": "KDB_widgetHeader_topBorderCenteredStyle",
    reinigen: null
  };

  return {
    knownHeaderClasses: KNOWN_HEADER_CLASSES,
    optionKeyToClass: OPTION_KEY_TO_CLASS,
    defaultClass: "KDB_widgetHeader_defaultStyle"
  };
});
