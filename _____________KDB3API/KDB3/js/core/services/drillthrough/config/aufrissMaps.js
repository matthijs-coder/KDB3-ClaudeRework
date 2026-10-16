define([], function () {
  "use strict";

  return {
    iconMatchers: [
      { needles: ["geschlecht"], value: "GESCHLECHT" },
      { needles: ["altersgruppe"], value: "ALTERSGRUPPE_SID" },
      { needles: ["dienstverhältnis", "dienstverhaeltnis"], value: "BEAMTER_VB" },
      { needles: ["berufsfamilie"], value: "BERUFSFAMILIE_LANGTEXT" },
      { needles: ["lehrlinge"], value: "LEHRLINGE" },
      { needles: ["dienststelle", "stelle"], value: function (_sicht) {
        var upper = String(_sicht || "").toUpperCase().trim();
        if (upper === "BW") {
          return "DIENSTSTELLE_LANG_SID";
        }
        if (upper === "DEZPV") {
          return "DIENSTSTELLE_KURZ_TEXT";
        }
        return "";
      } }
    ],
    datapointMatchers: [
      { needles: ["geschlecht"], value: "GESCHLECHT" },
      { needles: ["altersgruppe"], value: "ALTERSGRUPPE_SID" },
      { needles: ["dienstverhältnis", "dienstverhaeltnis"], value: "BEAMTER_VB" },
      { needles: ["berufsfamilie"], value: "BERUFSFAMILIE_LANGTEXT" },
      { needles: ["dienststelle", "stelle"], value: function (_sicht) {
        var upper = String(_sicht || "").toUpperCase().trim();
        if (upper === "BW") {
          return "DIENSTSTELLE_LANG_SID";
        }
        if (upper === "DEZPV") {
          return "DIENSTSTELLE_KURZ_TEXT";
        }
        return "";
      } }
    ]
  };
});
