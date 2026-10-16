define(["./chromeCatalogUtil.js"], function (u) {
  "use strict";

  var dragDrop = {
    canvasDropboxSelector: u.opt(".page.pagegenericPage"),
    pageTemplateSelector: u.opt(".page.pagetemplateIndicator"),
    pageGenericSelector: u.opt(".pagegenericPage"),
    pageContainerSelector: u.opt(".pagecontainer")
  };

  var page = {
    exactPageRootSelector: u.opt(".pagegenericPage"),
    pageIdentityAttrs: u.opt(["data-cv-page-id", "data-page-id", "data-cv-page-identity", "data-page-identity", "id"]),
    tabIdentityAttrs: u.opt(["data-tab-id", "data-tab-identity", "data-cv-tab-id", "data-cv-tab-identity", "id"])
  };

  return {
    dragDrop: { entries: dragDrop, strings: u.stringsFromEntries(dragDrop) },
    page: { entries: page, strings: u.stringsFromEntries(page) }
  };
});
