define([], function () {
  "use strict";

  return {
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
});
