define([], function () {
  "use strict";

  function dienststelleAufriss(_sicht) {
    var upper = String(_sicht || "").toUpperCase().trim();
    if (upper === "BW") {
      return "DIENSTSTELLE_LANG_SID";
    }
    if (upper === "DEZPV") {
      return "DIENSTSTELLE_KURZ_TEXT";
    }
    return "";
  }

  // Ordered: the first matching needle wins. `iconOnly` matchers are skipped for datapoint categories.
  var aufrissMatchers = [
    { needles: ["geschlecht"], value: "GESCHLECHT" },
    { needles: ["altersgruppe"], value: "ALTERSGRUPPE_SID" },
    { needles: ["dienstverhältnis", "dienstverhaeltnis"], value: "BEAMTER_VB" },
    { needles: ["berufsfamilie"], value: "BERUFSFAMILIE_LANGTEXT" },
    { needles: ["lehrlinge"], value: "LEHRLINGE", iconOnly: true },
    { needles: ["dienststelle", "stelle"], value: dienststelleAufriss }
  ];

  var promptCatalog = {
    emitOrder: [
      "p_p_art",
      "p_p_datenart",
      "p_p_gruppe_DrillFromGDB",
      "p_p_dienststelle_DrillFromGDB",
      "p_p_dezpv_DrillFromGDB",
      "p_p_range_DrillFromGDB",
      "p_p_stichtag_or_range",
      "p_p_dummy_validate",
      "p_p_art_DrillFromGDB",
      "p_p_kz_1",
      "p_p_kz_1_source",
      "p_p_noBlock_alleKZ",
      "p_p_KzBezeichnung_DrillFromGDB",
      "p_p_drillthroughFromGDB",
      "p_p_drillthroughMultipleDstPossible",
      "p_p_aktmon_DrillFromGDB",
      "p_p_aufspannen_1",
      "p_p_dummy_aufrissPrompt_v2",
      "p_p_aufspannen_2"
    ],
    constants: {
      stichtagOrRange: "Zeitraum",
      dummyValidate: "1",
      kzSource: "MASTER_FACT",
      noBlockAlleKz: "0",
      dummyAufriss: "0",
      drillthroughFromGdb: "ja",
      drillthroughMultipleDstPossible: "ja",
      tail: "&format=HTML&Download=false&prompt=true"
    }
  };

  var monthLabels = {
    "jänner": 1,
    januar: 1,
    jan: 1,
    februar: 2,
    feb: 2,
    "märz": 3,
    maerz: 3,
    mrz: 3,
    mar: 3,
    april: 4,
    apr: 4,
    mai: 5,
    may: 5,
    juni: 6,
    jun: 6,
    juli: 7,
    jul: 7,
    august: 8,
    aug: 8,
    september: 9,
    sep: 9,
    sept: 9,
    oktober: 10,
    okt: 10,
    oct: 10,
    november: 11,
    nov: 11,
    dezember: 12,
    dez: 12,
    dec: 12
  };

  var drillthroughLabels = {
    waitWindowTitle: "Drillthrough",
    waitWindowBody: "Bitte einen Moment Geduld. Die für den Drillthrough benötigten Informationen werden geladen.",
    treeMissingBody: "Die für den Drillthrough benötigten Organisationsdaten sind nicht verfügbar.",
    loadFailedBody: "Die für den Drillthrough benötigten Informationen konnten nicht geladen werden."
  };

  var HIERARCHY_TABLE_KEYS = {
    BW: "dienststelle_bw_hierarchy",
    DEZPV: "dienststelle_dezpv_hierarchy"
  };

  // Longest wait for the hierarchy table before the wait window reports a load failure. The table load
  // has no deadline of its own, so without this the window would say "please wait" forever.
  var DEFERRED_OPEN_TIMEOUT_MS = 120000;

  var datenart = {
    HASH: "FA2B3F9D85EEDABE42016D7F23BB9EBAB19F030A"
  };

  return {
    aufrissMatchers: aufrissMatchers,
    promptCatalog: promptCatalog,
    monthLabels: monthLabels,
    drillthroughLabels: drillthroughLabels,
    HIERARCHY_TABLE_KEYS: HIERARCHY_TABLE_KEYS,
    DEFERRED_OPEN_TIMEOUT_MS: DEFERRED_OPEN_TIMEOUT_MS,
    datenart: datenart
  };
});
