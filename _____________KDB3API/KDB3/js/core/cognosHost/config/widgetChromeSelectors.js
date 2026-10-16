define(["./chromeCatalogUtil.js"], function (u) {
  "use strict";

  var HEADER = ".widgetHeader";
  var EXPAND = ".expandModeContainer";
  var DATA_ICON = "dataWidgetIcon";

  var widget = {
    widgetClass: u.opt(".widget"),
    textWidgetClass: u.opt(".textWidget"),
    liveWidgetClass: u.opt(".liveWidget"),
    textWidgetClassName: u.opt("textWidget"),
    liveWidgetClassName: u.opt("liveWidget"),
    contentWrapperSelector: u.opt(".widgetContentWrapper"),
    contentWrapperHeaderSelector: u.opt(".widgetContentWrapper " + HEADER),
    widgetHeaderSelector: u.opt(HEADER),
    widgetIconsSelector: u.opt(".widgetIcons"),
    widgetIconsClassName: u.opt("widgetIcons"),
    staticContentSelector: u.opt(".staticContent"),
    textFillSelector: u.opt(".textFillNoScroll"),
    editableSelector: u.opt(".note-editable"),
    dataWidgetIconClass: u.opt(DATA_ICON),
    dataWidgetIconSelector: u.opt("." + DATA_ICON),
    liveWidgetAnnotationsClass: u.opt("liveWidgetAnnotations"),
    svgIconClass: u.opt("svgIcon"),
    textIconClass: u.opt("textIcon"),
    textFittedClass: u.opt("textFitted"),
    bemContentSelector: u.opt(".widget-content, .ba-common-widget__content"),
    bemHeaderSelector: u.opt(".widget-header, .ba-common-widget__header"),
    bemTitleSelector: u.opt("a, .ba-common-widget__header-title"),
    vizTitleSelector: u.opt(".widgetHeader .widgetTitle"),
    vizTitleSpanSelector: u.opt(".widgetHeader .widgetTitle .note-editable p span"),
    widgetTitleClass: u.opt("widgetTitle"),
    titleShownClass: u.opt("titleShown"),
    textAreaClass: u.opt("textArea"),
    responsiveFontSizeClass: u.opt("responsiveFontSize"),
    badgeContainerClass: u.opt("badgeContainer"),
    tooltipNodeSelector: u.opt("[data-node=content] .text, [data-node=content] .value")
  };

  var focusMode = {
    resizeEdgeTopRightSelector: u.opt("div.resizeEdge.topRight > *"),
    expandModeContainerSelector: u.opt(EXPAND),
    expandedWidgetSelectorPrefix: u.opt(EXPAND + ' [id="'),
    collapseSvgFocusModeSelector: u.opt('[role="button"].collapseSvg.focusMode'),
    collapseSvgSelector: u.opt(".collapseSvg"),
    canvasIconsSelector: u.opt(".widgetIcons > .dataWidgetIcon")
  };

  var legend = {
    titleSelector: u.opt(".Legend .lgd-title, .legend .lgd-title"),
    captionSelector: u.opt(".Legend .legendCaption, .legend .legendCaption"),
    captionLegacySelector: u.opt(
      '.Legend [data-visual-item="widget.legend.labels"], .legend [data-visual-item="widget.legend.labels"]'
    ),
    observeRootSelector: u.opt(".Legend, .legend"),
    captionClass: u.opt("legendCaption"),
    captionDataItem: u.opt("widget.legend.labels")
  };

  return {
    widget: { entries: widget, strings: u.stringsFromEntries(widget) },
    focusMode: { entries: focusMode, strings: u.stringsFromEntries(focusMode) },
    legend: { entries: legend, strings: u.stringsFromEntries(legend) }
  };
});
