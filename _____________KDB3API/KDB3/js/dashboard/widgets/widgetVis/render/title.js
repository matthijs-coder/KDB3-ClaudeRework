define([
  "../dom.js",
  "../runtime.js",
  "../visTypes.js",
  "./visProperties.js",
  "../../../../core/cognosHost/config/widgetChromeSelectors.js"
], function (_dom, _visRuntime, _visTypes, _visProperties, _widgetChrome) {
  "use strict";

  var widget = _widgetChrome.widget.strings;

  function asTrimmed(_value) {
    return String(_value == null ? "" : _value).trim();
  }

  function normalizeSpaces(_value) {
    return asTrimmed(_value).replace(/\s+/g, " ");
  }

  function escapeRegExp(_value) {
    return String(_value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function isDefaultChoice(_value) {
    var normalized = asTrimmed(_value).toLowerCase();
    return normalized === "" || normalized === "default" || normalized === "none";
  }

  function normalizeTopNLabel(_topN) {
    var value = asTrimmed(_topN);
    if (isDefaultChoice(value)) {
      return "";
    }
    var match = value.toLowerCase().match(/^top-?(\d+)$/);
    return match ? "Top-" + match[1] : value;
  }

  function buildSuffixRegex(_phrase) {
    return new RegExp("\\s+" + escapeRegExp(_phrase) + "\\s*$", "i");
  }

  function buildDimensionSuffixRegex(_dimLabel) {
    return new RegExp("\\s+nach\\s+" + escapeRegExp(_dimLabel) + "\\s*$", "i");
  }

  function hasDimensionSuffix(_title, _dimension) {
    var title = normalizeSpaces(_title);
    var dimLabel = normalizeSpaces(_dimension);
    return !!(title && !isDefaultChoice(dimLabel) && buildDimensionSuffixRegex(dimLabel).test(title));
  }

  function hasPhraseSuffix(_title, _phrase) {
    var title = normalizeSpaces(_title);
    return !!(title && _phrase && buildSuffixRegex(_phrase).test(title));
  }

  function stripKnownRenderedSuffixes(_baseTitle, _dimension, _topN, _aggregationLabel) {
    var out = normalizeSpaces(_baseTitle);
    var dimLabel = normalizeSpaces(_dimension);
    var topLabel = normalizeTopNLabel(_topN);
    var aggregationLabel = normalizeSpaces(_aggregationLabel);
    if (!out) {
      return "";
    }
    if (topLabel) {
      out = out.replace(buildSuffixRegex(topLabel), "").trim();
    }
    if (!isDefaultChoice(dimLabel)) {
      out = out.replace(buildDimensionSuffixRegex(dimLabel), "").trim();
    }
    if (aggregationLabel) {
      out = out.replace(buildSuffixRegex(aggregationLabel), "").trim();
    }
    return normalizeSpaces(out);
  }

  function readIncludeOf(_filter, _key) {
    var shape = _filter && _filter[_key];
    if (!shape) {
      return null;
    }
    return "include" in shape ? shape.include : null;
  }

  function readAggregationInclude(_filter) {
    var filter = _filter || {};
    var named = readIncludeOf(filter, "AggregationstypId");
    if (named == null) {
      named = readIncludeOf(filter, "AggregationstypName");
    }
    if (named != null) {
      return named;
    }
    var keys = Object.keys(filter);
    var index;
    for (index = 0; index < keys.length; index += 1) {
      if (/aggregationstyp/i.test(keys[index])) {
        return readIncludeOf(filter, keys[index]) || [];
      }
    }
    return [];
  }

  function resolveTitleAggregationLabel(_options) {
    var options = _options || {};
    var code = asTrimmed((options.metric || {}).code);
    if (!code) {
      return "";
    }
    var settings = options.settings || {};
    var visType = settings.visType || _visTypes.resolveDefaultVisualizationType(options._KDB);
    var pack = _visTypes.resolveKennzahlPack(visType, settings.grouping, options._KDB);
    var defaults = _visTypes.resolveKennzahlDefaults(code, options._KDB);
    var include = readAggregationInclude(_visTypes.buildKennzahlAggregationFilter(defaults, pack).filter);
    var captions = Array.isArray(include) ? include.map(asTrimmed).filter(Boolean) : [];
    return captions.length ? "(" + captions.join(", ") + ")" : "";
  }

  function readDomBootstrapTitle(_widgetId) {
    var shell = _dom.resolveWidgetShell(_widgetId);
    if (!shell || typeof shell.getAttribute !== "function") {
      return "";
    }
    return normalizeSpaces(shell.getAttribute("kdb_kennzahldisplay") || shell.getAttribute("KDB_KENNZAHLDISPLAY")
      || shell.getAttribute("KDB_display") || shell.getAttribute("kdb_display") || "");
  }

  function readCognosTitle(_KDB, _widgetId) {
    var facet = _visRuntime.readHostFacet(_KDB, "visualizationFacet");
    if (!facet || typeof facet.getVisTitle !== "function") {
      return "";
    }
    var outcome = facet.getVisTitle(String(_widgetId));
    return outcome && outcome.ok === true ? normalizeSpaces(outcome.data) : "";
  }

  function hasTopNResultValues(_options) {
    var helper = _options.helperTableResult;
    var derived = _options.derived || {};
    return !!(helper && Array.isArray(helper.topNResultValues) && helper.topNResultValues.length > 0)
      || (Array.isArray(derived.topNResultValues) && derived.topNResultValues.length > 0);
  }

  function buildTitleSuffixParts(_options) {
    var options = _options || {};
    var settings = options.settings || {};
    var parts = [];
    if (!isDefaultChoice(settings.dimension)) {
      parts.push("nach " + normalizeSpaces(settings.dimension));
    }
    var topLabel = normalizeTopNLabel(settings.topNChoice);
    if (!isDefaultChoice(settings.dimension) && topLabel && hasTopNResultValues(options)) {
      parts.push(topLabel);
    }
    return parts;
  }

  function buildVisualizationTitleText(_options) {
    var options = _options || {};
    var metric = options.metric || {};
    var settings = options.settings || {};
    var dimension = settings.dimension;
    var topNChoice = settings.topNChoice;
    var aggregationLabel = resolveTitleAggregationLabel(options);
    var baseTitle = normalizeSpaces(metric.display || metric.code || "");
    if (!baseTitle) {
      baseTitle = readDomBootstrapTitle(options.widgetId);
    }
    if (!baseTitle) {
      baseTitle = stripKnownRenderedSuffixes(readCognosTitle(options._KDB, options.widgetId), dimension, topNChoice, aggregationLabel);
    }
    baseTitle = stripKnownRenderedSuffixes(baseTitle, dimension, topNChoice, aggregationLabel);
    var parts = [baseTitle];
    if (aggregationLabel && !hasPhraseSuffix(baseTitle, normalizeSpaces(aggregationLabel))) {
      parts.push(aggregationLabel);
    }
    buildTitleSuffixParts(options).forEach(function (_suffix, _index) {
      if (_index === 0 && hasDimensionSuffix(baseTitle, dimension)) {
        return;
      }
      if (_index === 1 && hasPhraseSuffix(parts.join(" "), _suffix)) {
        return;
      }
      parts.push(_suffix);
    });
    return parts.filter(Boolean).join(" ");
  }

  // Cognos setTitle runs once, pre-render (legacy parity): calling it after
  // render reopened the note-editable title in inline-edit mode (2026-07-13).
  async function applyPreRenderTitle(_options) {
    var options = _options || {};
    try {
      var facet = _visRuntime.readHostFacet(options._KDB, "visualizationFacet");
      var titleText = buildVisualizationTitleText(options);
      if (!titleText || !facet || typeof facet.setVisTitle !== "function") {
        return { updated: false };
      }
      var outcome = await Promise.resolve(facet.setVisTitle(String(options.widgetId), titleText, { signal: options.signal }));
      if (_visProperties.isAbortedOutcome(outcome)) {
        return { updated: false, aborted: true };
      }
      return outcome && outcome.ok === true ? { updated: true, titleText: titleText } : { updated: false };
    } catch (err) {
      console.error("[widgetVis.applyPreRenderTitle] setVisTitle failed", options.widgetId, err);
      return { updated: false, error: String(err && err.message ? err.message : err) };
    }
  }

  function readMetricDescriptor(_options) {
    var derived = _options.derived || {};
    var metric = _options.metric || {};
    var code = asTrimmed(derived.code || metric.code);
    var langtext = asTrimmed(derived.langtext);
    var url = asTrimmed(derived.url);
    var treeApi = _options._KDB && _options._KDB.api && _options._KDB.api.metricsTree;
    if ((!langtext || !url) && code && treeApi) {
      var descriptor = treeApi.resolveMetricByCode(code);
      if (descriptor && descriptor.resolved) {
        langtext = langtext || asTrimmed(descriptor.langtext);
        url = url || asTrimmed(descriptor.url);
      }
    }
    return { code: code, langtext: langtext, url: url };
  }

  function syncHyperlink(_spanEl, _href) {
    var parent = _spanEl.parentElement;
    var anchor = parent && parent.tagName === "A" && parent.classList && parent.classList.contains("kdb_hyperlink") ? parent : null;
    if (_href) {
      if (!anchor) {
        anchor = document.createElement("a");
        anchor.className = "kdb_hyperlink";
        anchor.setAttribute("target", "_blank");
        anchor.setAttribute("rel", "noopener");
        _spanEl.parentNode.insertBefore(anchor, _spanEl);
        anchor.appendChild(_spanEl);
      }
      if (anchor.getAttribute("href") !== _href) {
        anchor.setAttribute("href", _href);
      }
      return { linked: true, href: _href };
    }
    if (anchor) {
      anchor.parentNode.insertBefore(_spanEl, anchor);
      anchor.parentNode.removeChild(anchor);
      return { linked: false, unwrapped: true };
    }
    return { linked: false };
  }

  function applyTooltipAndLink(_options) {
    var shell = _dom.resolveWidgetShell(_options.widgetId);
    var titleEl = shell ? shell.querySelector(widget.vizTitleSelector) : null;
    var spanEl = shell ? shell.querySelector(widget.vizTitleSpanSelector) : null;
    var resolved = readMetricDescriptor(_options);
    var metric = _options.metric || {};
    var display = asTrimmed(metric.display || (_options.derived || {}).display || resolved.code);
    var suffixText = buildTitleSuffixParts(_options).join(" ").trim();
    var tooltipBase = asTrimmed(resolved.langtext || (resolved.code ? resolved.code + ": " + display : display));
    var tooltipText = (tooltipBase + " " + resolveTitleAggregationLabel(_options) + " " + suffixText).replace(/\s+/g, " ").trim();
    var diagnostics = { tooltip: { updated: false }, link: { linked: false } };
    if (titleEl && tooltipText) {
      titleEl.setAttribute("title", tooltipText);
      diagnostics.tooltip = { updated: true, text: tooltipText };
    }
    diagnostics.link = spanEl ? syncHyperlink(spanEl, resolved.url) : { linked: false, reason: "no_title_span" };
    return diagnostics;
  }

  // Post-render is DOM-only, like legacy alterVisTitle's span text write.
  function writeDomTitle(_widgetId, _titleText) {
    var shell = _dom.resolveWidgetShell(_widgetId);
    var spanEl = shell ? shell.querySelector(widget.vizTitleSpanSelector) : null;
    if (spanEl && spanEl.textContent !== _titleText) {
      spanEl.textContent = _titleText;
    }
    return { updated: !!spanEl };
  }

  function writeTitleLinkText(_titleLinkEl, _titleText) {
    if (!_titleLinkEl || !_titleText) {
      return { updated: false, skipped: "missing_title_link_or_text" };
    }
    if (_titleLinkEl.textContent !== _titleText) {
      _titleLinkEl.textContent = _titleText;
    }
    return { updated: true };
  }

  function syncVisualizationTitle(_options) {
    var options = _options || {};
    var diagnostics = { dom: null, titleLink: null, tooltip: null, link: null, errors: [] };
    var titleText = "";
    try {
      titleText = buildVisualizationTitleText(options);
      if (titleText) {
        diagnostics.dom = writeDomTitle(options.widgetId, titleText);
      }
      var runtime = options.runtime || {};
      var domRefs = runtime.domRefs || {};
      if (!domRefs.titleLinkEl) {
        domRefs = Object.assign({}, domRefs, _dom.resolveVisualizationContent(options.widgetId));
        runtime.domRefs = domRefs;
      }
      diagnostics.titleLink = writeTitleLinkText(domRefs.titleLinkEl, titleText);
      var decorations = applyTooltipAndLink(options);
      diagnostics.tooltip = decorations.tooltip;
      diagnostics.link = decorations.link;
    } catch (err) {
      console.error("[widgetVis.syncVisualizationTitle] failed", options.widgetId, err);
      diagnostics.errors.push(String(err && err.message ? err.message : err));
    }
    return { ok: diagnostics.errors.length === 0, titleText: titleText, diagnostics: diagnostics };
  }

  return {
    buildVisualizationTitleText: buildVisualizationTitleText,
    resolveTitleAggregationLabel: resolveTitleAggregationLabel,
    applyPreRenderTitle: applyPreRenderTitle,
    syncVisualizationTitle: syncVisualizationTitle
  };
});
