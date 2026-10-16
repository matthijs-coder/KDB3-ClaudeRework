define([], function () {
  "use strict";

  return {
    personengruppe: {
      filterId: "personengruppe",
      filterLabel: "Personengruppe",
      itemName: "Personengruppe",
      condition: "Personengruppe",
      rightTableKey: "personengruppe",
      optionTableKey: "personengruppe_filter",
      allowedSichtValues: ["BW"],
      sichtValueKind: "display"
    },
    dienststellenleitung: {
      filterId: "dienststellenleitung",
      filterLabel: "Dienststellenleitung",
      itemName: "Dienststellenleitung",
      condition: "Dienststellenleitung",
      rightTableKey: "dienststellenleitung",
      optionTableKey: "dienststellenleitung_filter",
      allowedSichtValues: ["BW"],
      sichtValueKind: "display"
    }
  };
});
