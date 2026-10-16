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
    pageIdentityAttrs: {
      selector: ["data-cv-page-id", "data-page-id", "data-cv-page-identity", "data-page-identity", "id"],
      required: false
    },
    tabIdentityAttrs: {
      selector: ["data-tab-id", "data-tab-identity", "data-cv-tab-id", "data-cv-tab-identity", "id"],
      required: false
    }
  };

  return {
    dragDrop: { entries: dragDrop, strings: u.stringsFromEntries(dragDrop) },
    page: { entries: page, strings: u.stringsFromEntries(page) }
  };
});
