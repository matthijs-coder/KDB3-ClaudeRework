define(["../config/resolveVisualizationBindingConfig.js"], function (_resolveVisualizationBindingConfig) {
  "use strict";

  function includeOf(_filter, _key) {
    var shape = _filter && _filter[_key];
    if (!shape) { return null; }
    return "include" in shape ? shape.include : null;
  }

  function readAggregationInclude(_filter) {
    var filter = _filter || {};
    var named = includeOf(filter, "AggregationstypId");
    if (named == null) { named = includeOf(filter, "AggregationstypName"); }
    if (named != null) { return named; }
    var keys = Object.keys(filter);
    for (var i = 0; i < keys.length; i += 1) {
      if (/aggregationstyp/i.test(keys[i])) { return includeOf(filter, keys[i]) || []; }
    }
    return [];
  }

  function joinCaptions(_include) {
    if (!Array.isArray(_include)) { return ""; }
    var captions = [];
    for (var i = 0; i < _include.length; i += 1) {
      var caption = String(_include[i] == null ? "" : _include[i]).trim();
      if (caption) { captions.push(caption); }
    }
    return captions.join(", ");
  }

  function resolveTitleAggregationLabel(_options) {
    try {
      var options = _options || {};
      var metric = options.metric || {};
      var settings = options.settings || {};
      var code = String(metric.code == null ? "" : metric.code).trim();
      if (!code) { return ""; }
      var visType = settings.visType || _resolveVisualizationBindingConfig.resolveDefaultVisualizationType(options._KDB);
      var pack = _resolveVisualizationBindingConfig.resolveKennzahlPack(visType, settings.grouping, options._KDB);
      var defaults = _resolveVisualizationBindingConfig.resolveKennzahlDefaults(code, options._KDB);
      var built = _resolveVisualizationBindingConfig.buildKennzahlAggregationFilter(defaults, pack);
      var joined = joinCaptions(readAggregationInclude(built.filter));
      return joined ? "(" + joined + ")" : "";
    } catch (err) {
      console.error("[widgetVis.resolveTitleAggregationLabel] failed", err);
      return "";
    }
  }

  return resolveTitleAggregationLabel;
});
