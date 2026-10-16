define([
  "../view/syncTitleLink.js",
  "../dom.js",
  "./buildVisualizationTitleText.js",
  "./resolveTitleAggregationLabel.js",
  "./applyPreRenderTitle.js",
  "../../../../core/cognosHost/config/widgetChromeSelectors.js"
], function (_syncTitleLink, _dom, _titleTextHelpers, _resolveTitleAggregationLabel, _applyPreRenderTitle, _widgetChrome) {
  "use strict";
  var widget = _widgetChrome.widget.strings;
  var _buildVisualizationTitleText = _titleTextHelpers.buildVisualizationTitleText;
  var _buildTitleSuffixParts = _titleTextHelpers.buildTitleSuffixParts;

  function asTrimmed(_value) {
    return String(_value == null ? "" : _value).trim();
  }

  // Post-render is DOM-only, like legacy alterVisTitle's span text write.
  function setDomTitle(_widgetId, _titleText) {
    var shell = document.getElementById(String(_widgetId))
      || document.querySelector('[data-kdb-widget-id="' + String(_widgetId) + '"]');
    var spanEl = shell ? shell.querySelector(widget.vizTitleSpanSelector) : null;
    if (spanEl && spanEl.textContent !== _titleText) {
      spanEl.textContent = _titleText;
    }
    return { updated: !!spanEl };
  }

  function enrichMetricDescriptor(_options) {
    var options = _options || {};
    var derived = options.derived || {};
    var metric = options.metric || {};
    var code = asTrimmed(derived.code || metric.code);
    var langtext = asTrimmed(derived.langtext);
    var url = asTrimmed(derived.url);
    var treeApi = options._KDB && options._KDB.api && options._KDB.api.metricsTree;
    if ((!langtext || !url) && code && treeApi && typeof treeApi.resolveMetricByCode === "function") {
      var descriptor = treeApi.resolveMetricByCode(code);
      if (descriptor && descriptor.resolved) {
        if (!langtext) {
          langtext = asTrimmed(descriptor.langtext);
        }
        if (!url) {
          url = asTrimmed(descriptor.url);
        }
      }
    }
    return { code: code, langtext: langtext, url: url };
  }

  function applyTooltipAndLink(_options) {
    var options = _options || {};
    var shell = document.getElementById(String(options.widgetId))
      || document.querySelector('[data-kdb-widget-id="' + String(options.widgetId) + '"]');
    var titleEl = shell ? shell.querySelector(widget.vizTitleSelector) : null;
    var spanEl = shell ? shell.querySelector(widget.vizTitleSpanSelector) : null;
    var resolved = enrichMetricDescriptor(options);
    var metric = options.metric || {};
    var derived = options.derived || {};
    var display = asTrimmed(metric.display || derived.display || resolved.code);
    var aggregationLabel = _resolveTitleAggregationLabel(options);
    var suffixText = (_buildTitleSuffixParts(options) || []).join(" ").trim();
    var tooltipBase = asTrimmed(resolved.langtext || (resolved.code ? resolved.code + ": " + display : display));
    var tooltipText = (tooltipBase + " " + aggregationLabel + " " + suffixText).replace(/\s+/g, " ").trim();
    var diagnostics = { tooltip: { updated: false }, link: { linked: false } };
    if (titleEl && tooltipText) {
      titleEl.setAttribute("title", tooltipText);
      diagnostics.tooltip = { updated: true, text: tooltipText };
    }
    if (!spanEl) {
      diagnostics.link = { linked: false, reason: "no_title_span" };
      return diagnostics;
    }
    var href = resolved.url;
    var parent = spanEl.parentElement;
    var anchor = parent && parent.tagName === "A" && parent.classList && parent.classList.contains("kdb_hyperlink")
      ? parent
      : null;
    if (href) {
      if (!anchor) {
        anchor = document.createElement("a");
        anchor.className = "kdb_hyperlink";
        anchor.setAttribute("target", "_blank");
        anchor.setAttribute("rel", "noopener");
        spanEl.parentNode.insertBefore(anchor, spanEl);
        anchor.appendChild(spanEl);
      }
      if (anchor.getAttribute("href") !== href) {
        anchor.setAttribute("href", href);
      }
      diagnostics.link = { linked: true, href: href };
    } else if (anchor) {
      anchor.parentNode.insertBefore(spanEl, anchor);
      anchor.parentNode.removeChild(anchor);
      diagnostics.link = { linked: false, unwrapped: true };
    }
    return diagnostics;
  }

  function syncVisualizationTitle(_options) {
    var options = _options || {};
    var diagnostics = { dom: null, titleLink: null, tooltip: null, link: null, errors: [] };
    var titleText = "";
    try {
      titleText = _buildVisualizationTitleText(options);
      if (titleText) {
        diagnostics.dom = setDomTitle(options.widgetId, titleText);
      }
      var runtime = options.runtime || {};
      var domRefs = runtime.domRefs || {};
      if (!domRefs.titleLinkEl) {
        domRefs = Object.assign({}, domRefs, _dom.resolveVisualizationContent(options.widgetId));
        runtime.domRefs = domRefs;
      }
      diagnostics.titleLink = _syncTitleLink(domRefs.titleLinkEl, titleText);
      var titleDecorations = applyTooltipAndLink(options);
      diagnostics.tooltip = titleDecorations.tooltip;
      diagnostics.link = titleDecorations.link;
    } catch (err) {
      console.error("[widgetVis.syncVisualizationTitle] failed", options.widgetId, err);
      diagnostics.errors.push(String(err && err.message ? err.message : err));
    }
    return {
      ok: diagnostics.errors.length === 0,
      titleText: titleText,
      diagnostics: diagnostics
    };
  }

  return {
    applyPreRenderTitle: _applyPreRenderTitle,
    buildVisualizationTitleText: _buildVisualizationTitleText,
    syncVisualizationTitle: syncVisualizationTitle
  };
});
