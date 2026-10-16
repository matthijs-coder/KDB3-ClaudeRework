define([], function () {
  "use strict";

  var AGGREGATIONSTYP_CAPTION_PATH =
    "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]";

  function resolveAggregationInclude(_pack, _jahrCaption) {
    if (_pack === "stichtag") {
      return ["Stichtag"];
    }
    if (_pack === "jahr") {
      return [_jahrCaption];
    }
    if (_pack === "list") {
      return ["Stichtag", _jahrCaption];
    }
    return null;
  }

  function buildKennzahlAggregationFilter(_defaults, _pack) {
    var defaults = _defaults || {};
    var jahrCaption = defaults.jahrCaption;
    var include = jahrCaption && resolveAggregationInclude(_pack, jahrCaption);
    var filter = {};
    if (include) {
      filter[AGGREGATIONSTYP_CAPTION_PATH] = { include: include };
    }
    return {
      ok: true,
      filter: filter,
      extraFilter: defaults.extraFilter || null
    };
  }

  return {
    buildKennzahlAggregationFilter: buildKennzahlAggregationFilter
  };
});
