define([], function () {
  "use strict";

  var AGGREGATIONSTYP_CAPTION_PATH =
    "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]";

  // Pack per vis bucket and grain; `default` applies to every grain not listed.
  var JAHR_FIRST_PACKS = { default: "jahr", jahrStichtag: "stichtag", stichtagProJahrH: "stichtag", stichtagProJahrV: "stichtag" };
  var PACKS_BY_BUCKET = {
    Line: { default: "stichtag", jahr: "jahr" },
    pie: JAHR_FIRST_PACKS,
    StackedBar: JAHR_FIRST_PACKS,
    StackedColumn: JAHR_FIRST_PACKS,
    List: { default: "list", jahr: "jahr" },
    "com.ibm.vis.custom.prognoseyearlinechart": { default: "stichtag" }
  };

  function hasOwn(_object, _key) {
    return Object.prototype.hasOwnProperty.call(_object, _key);
  }

  function hasKennzahlPackRule(_bucket) {
    return typeof _bucket === "string" && hasOwn(PACKS_BY_BUCKET, _bucket);
  }

  // A bucket without a rule uses the Jahr-first row (the binding plan's answer for a bucket it does not know).
  function resolveKennzahlPack(_bucket, _grouping) {
    var packs = hasKennzahlPackRule(_bucket) ? PACKS_BY_BUCKET[_bucket] : JAHR_FIRST_PACKS;
    return typeof _grouping === "string" && hasOwn(packs, _grouping) ? packs[_grouping] : packs.default;
  }

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
    hasKennzahlPackRule: hasKennzahlPackRule,
    resolveKennzahlPack: resolveKennzahlPack,
    buildKennzahlAggregationFilter: buildKennzahlAggregationFilter
  };
});
