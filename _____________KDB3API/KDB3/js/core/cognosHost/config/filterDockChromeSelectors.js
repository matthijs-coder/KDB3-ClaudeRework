define(["./chromeCatalogUtil.js"], function (u) {
  "use strict";

  var FILTER_ITEM = "filterItemWrapper";
  var POPUP_MOUNT = ".wa-filterDock-filterItemMount";
  var OPTION_WRAP = ".ba-common-listItem-wrapper";
  var OPTION_LABEL = ".ba-common-truncatedText__text";
  var OPTION_LABEL_TID = "ba-common-truncated-text__text-node";
  var BOTTOM = ".wa-filterDock-filterItem-bottom";
  var BOTTOM_TEXT = ".wa-filterDock-filterItemText";
  var FILTER_NAME = ".wa-filterDock-filterName";
  var CHECKBOX = "input.bx--checkbox";
  var CHECKBOX_LOOSE = 'input[type="checkbox"]';
  var ROLE_OPTION = '[role="option"]';
  var SELECTED = "is-selected";
  var FOOTER_TID = "ba-common-dialog__footer";
  var DATA_ID = "data-id";
  var OK_TID = "okClickable";
  var CANCEL_TID = "cancelClickable";

  var filterDock = {
    rootSelector: u.req("#filterDockContainer"),
    globalDockSelector: u.req("#filterDock__global"),
    pageContextDockSelector: u.req("#filterDock__other"),
    filterItemSelector: u.opt("." + FILTER_ITEM),
    filterItemWrapperClass: u.opt(FILTER_ITEM),
    popupMountSelector: u.opt(POPUP_MOUNT),
    popupMountFallbackSelector: u.opt(POPUP_MOUNT),
    optionSelector: u.opt(OPTION_WRAP),
    listItemWrapperSelector: u.opt(OPTION_WRAP),
    optionWrapperSelector: u.opt(OPTION_WRAP),
    filterLabelSelector: u.opt("[" + DATA_ID + "]"),
    filterDataIdAttr: u.opt(DATA_ID),
    optionLabelSelector: u.opt(OPTION_LABEL),
    optionLabelTid: u.opt(OPTION_LABEL_TID),
    optionLabelTidSelector: u.opt("[data-tid='" + OPTION_LABEL_TID + "']"),
    nativeFooterSelector: u.opt('[data-tid="' + FOOTER_TID + '"]:not(.KDB_singleSelectFooter)'),
    outClickCatcherSelector: u.opt("#filterOutClickCatcher"),
    okButtonSelector: u.opt('[data-tid="' + OK_TID + '"]'),
    cancelButtonSelector: u.opt('[data-tid="' + CANCEL_TID + '"]'),
    clearButtonSelector: u.opt('[data-tid="clearAllClickable"]'),
    closeButtonSelector: u.opt('[data-tid="mui-filterHeader-closeClickable"]'),
    roleOptionSelector: u.opt(ROLE_OPTION),
    checkboxSelector: u.opt(CHECKBOX),
    checkboxInputSelector: u.opt(CHECKBOX),
    sichtCheckboxSelector: u.opt(CHECKBOX_LOOSE),
    selectedOptionClass: u.opt(SELECTED),
    filterDockFilterNameSelector: u.opt(FILTER_NAME),
    filterNameSelector: u.opt(FILTER_NAME),
    filterItemBottomSelector: u.opt(BOTTOM),
    committedDisplayParentSelector: u.opt(BOTTOM),
    filterItemTextSelector: u.opt(BOTTOM_TEXT),
    committedDisplaySelector: u.opt(BOTTOM + " " + BOTTOM_TEXT),
    committedDisplayMatchSelector: u.opt(BOTTOM + ", " + BOTTOM_TEXT),
    alleOptionMountSelector: u.opt(".ba-common-root .ba-common-flexLayout"),
    footerOkButtonSelector: u.opt('[data-tid="' + OK_TID + '"]'),
    footerCancelButtonSelector: u.opt('[data-tid="' + CANCEL_TID + '"]'),
    disabledButtonClass: u.opt("bx--btn--disabled"),
    footerTid: u.opt(FOOTER_TID),
    footerCloneClassName: u.opt(FOOTER_TID + " is-transactional"),
    okButtonTid: u.opt(OK_TID),
    cancelButtonTid: u.opt(CANCEL_TID)
  };

  filterDock.optionLabelSelectors = {
    selector: [filterDock.optionLabelTidSelector.selector, OPTION_LABEL],
    required: false
  };

  return {
    filterDock: { entries: filterDock, strings: u.stringsFromEntries(filterDock) }
  };
});
