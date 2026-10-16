define(["./readVisualizationFacet.js", "./resolveTitleAggregationLabel.js"], function (_readVisualizationFacet, _resolveTitleAggregationLabel) {
  "use strict";
  function asTrimmed(_value) { return String(_value == null ? "" : _value).trim(); }
  function normalizeSpaces(_value) { return asTrimmed(_value).replace(/\s+/g, " "); }
  function escapeRegExp(_value) { return String(_value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  function isDefaultDim(_dimension) {
    var normalized = asTrimmed(_dimension).toLowerCase();
    return normalized === "" || normalized === "default" || normalized === "none";
  }
  function isDefaultTopN(_topN) {
    var normalized = asTrimmed(_topN).toLowerCase();
    return normalized === "" || normalized === "default" || normalized === "none";
  }
  function normalizeTopNLabel(_topN) {
    var value = asTrimmed(_topN);
    if (isDefaultTopN(value)) { return ""; }
    var match = value.toLowerCase().match(/^top-?(\d+)$/);
    return match ? "Top-" + match[1] : value;
  }
  function readDomBootstrapTitle(_widgetId) {
    var id = String(_widgetId);
    var shell = document.getElementById(id) || document.querySelector('[data-kdb-widget-id="' + id + '"]');
    if (!shell || typeof shell.getAttribute !== "function") { return ""; }
    return normalizeSpaces(shell.getAttribute("kdb_kennzahldisplay") || shell.getAttribute("KDB_KENNZAHLDISPLAY")
      || shell.getAttribute("KDB_display") || shell.getAttribute("kdb_display") || "");
  }
  function stripKnownRenderedSuffixes(_baseTitle, _dimension, _topN, _aggregationLabel) {
    var out = normalizeSpaces(_baseTitle);
    var dimLabel = normalizeSpaces(_dimension);
    var topLabel = normalizeTopNLabel(_topN);
    var aggregationLabel = normalizeSpaces(_aggregationLabel);
    if (!out) { return ""; }
    if (topLabel) { out = out.replace(new RegExp("\\s+" + escapeRegExp(topLabel) + "\\s*$", "i"), "").trim(); }
    if (!isDefaultDim(dimLabel)) {
      out = out.replace(new RegExp("\\s+nach\\s+" + escapeRegExp(dimLabel) + "\\s*$", "i"), "").trim();
    }
    if (aggregationLabel) {
      out = out.replace(new RegExp("\\s+" + escapeRegExp(aggregationLabel) + "\\s*$", "i"), "").trim();
    }
    return normalizeSpaces(out);
  }
  function hasDimensionSuffix(_baseTitle, _dimension) {
    var title = normalizeSpaces(_baseTitle);
    var dimLabel = normalizeSpaces(_dimension);
    return !!(title && !isDefaultDim(dimLabel)
      && new RegExp("\\s+nach\\s+" + escapeRegExp(dimLabel) + "\\s*$", "i").test(title));
  }
  function hasTopNSuffix(_baseTitle, _topN) {
    var title = normalizeSpaces(_baseTitle);
    var topLabel = normalizeTopNLabel(_topN);
    return !!(title && topLabel && new RegExp("\\s+" + escapeRegExp(topLabel) + "\\s*$", "i").test(title));
  }
  function hasAggregationSuffix(_baseTitle, _aggregationLabel) {
    var title = normalizeSpaces(_baseTitle);
    var label = normalizeSpaces(_aggregationLabel);
    return !!(title && label && new RegExp("\\s+" + escapeRegExp(label) + "\\s*$", "i").test(title));
  }
  function readCognosTitle(_KDB, _widgetId) {
    var visualizationFacet = _readVisualizationFacet(_KDB);
    var outcome;
    if (!visualizationFacet || typeof visualizationFacet.getVisTitle !== "function") { return ""; }
    try {
      outcome = visualizationFacet.getVisTitle(String(_widgetId));
      if (!outcome || outcome.ok !== true) { return ""; }
      return normalizeSpaces(outcome.data);
    } catch (ignore) { return ""; }
  }
  function resolveTopNResultValues(_options) {
    var helper = _options.helperTableResult;
    if (helper && Array.isArray(helper.topNResultValues) && helper.topNResultValues.length > 0) {
      return helper.topNResultValues;
    }
    var derived = _options.derived || {};
    if (Array.isArray(derived.topNResultValues) && derived.topNResultValues.length > 0) {
      return derived.topNResultValues;
    }
    return [];
  }
  function buildTitleSuffixParts(_options) {
    var options = _options || {};
    var settings = options.settings || {};
    var dimension = settings.dimension;
    var topNChoice = settings.topNChoice != null ? settings.topNChoice : settings.topN;
    var parts = [];
    if (!isDefaultDim(dimension)) { parts.push("nach " + normalizeSpaces(dimension)); }
    var topLabel = normalizeTopNLabel(topNChoice);
    if (!isDefaultDim(dimension) && topLabel && resolveTopNResultValues(options).length > 0) { parts.push(topLabel); }
    return parts;
  }
  function buildVisualizationTitleText(_options) {
    var options = _options || {};
    var metric = options.metric || {};
    var settings = options.settings || {};
    var dimension = settings.dimension;
    var topNChoice = settings.topNChoice != null ? settings.topNChoice : settings.topN;
    var aggregationLabel = _resolveTitleAggregationLabel(options);
    var baseTitle = normalizeSpaces(metric.display || metric.code || "");
    if (!baseTitle) { baseTitle = readDomBootstrapTitle(options.widgetId); }
    if (!baseTitle) { baseTitle = stripKnownRenderedSuffixes(readCognosTitle(options._KDB, options.widgetId), dimension, topNChoice, aggregationLabel); }
    baseTitle = stripKnownRenderedSuffixes(baseTitle, dimension, topNChoice, aggregationLabel);
    var parts = [baseTitle];
    if (aggregationLabel && !hasAggregationSuffix(baseTitle, aggregationLabel)) { parts.push(aggregationLabel); }
    var suffixParts = buildTitleSuffixParts(options);
    for (var i = 0; i < suffixParts.length; i += 1) {
      var suffix = suffixParts[i];
      if (i === 0 && hasDimensionSuffix(baseTitle, dimension)) { continue; }
      if (i === 1 && hasTopNSuffix(parts.join(" "), suffix)) { continue; }
      parts.push(suffix);
    }
    return parts.filter(function (_part) { return _part; }).join(" ");
  }

  return {
    buildVisualizationTitleText: buildVisualizationTitleText,
    buildTitleSuffixParts: buildTitleSuffixParts
  };
});
