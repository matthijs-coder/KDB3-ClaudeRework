define(["./chromeCatalogUtil.js"], function (_u) {
  "use strict";

  var ACTION_BAR_LEADING = '[id="com.ibm.bi.dashboard.toolbars.actionBar"] .leading';
  var PAGE_GENERIC_CLASSES = "page pagegenericPage";

  var root = {
    kdbWidget: _u.opt(".KDB3Widget"),
    dashboardClassHost: _u.req("#main"),
    pageViewContent: _u.req(".pageViewContent"),
    dashboardFrame: _u.req(".dashboardFrame"),
    contentViewPane: _u.req(".pane.paneContent.contentViewPane"),
    footerMountRoot: _u.req(".ba-common-tabList__container"),
    loadingIndicatorSelector: _u.opt(".loadingIndicatorContainer")
  };

  var toolbar = {
    actionBarLeadingSelector: _u.req(ACTION_BAR_LEADING)
  };

  var pdf = {
    loadingMountSelector: _u.opt(".ba-common-container.ba-common-tabList__innerContainer")
  };

  var footer = {
    pageClassNames: _u.opt(PAGE_GENERIC_CLASSES)
  };

  return {
    root: { entries: root, strings: _u.stringsFromEntries(root) },
    toolbar: { entries: toolbar, strings: _u.stringsFromEntries(toolbar) },
    pdf: { entries: pdf, strings: _u.stringsFromEntries(pdf) },
    footer: { entries: footer, strings: _u.stringsFromEntries(footer) }
  };
});
