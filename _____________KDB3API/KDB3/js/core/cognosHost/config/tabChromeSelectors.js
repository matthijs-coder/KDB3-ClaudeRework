define(["./chromeCatalogUtil.js"], function (u) {
  "use strict";

  var TOOLTIP = ".ba-common-tabList__tooltip";
  var TAB_ITEM = '.ba-common-tabList__item[role="tab"][data-index]';
  var LABEL_TID = "ba-common-truncated-text__text-node";
  var SELECTED_BEM = "ba-common-tabList__tab--selected";

  var tab = {
    selectedTab: u.opt(".dashboardFrame .pageTabContent.selected > :first-child"),
    selectedTabButton: u.opt(".ba-common-tabList__list .ba-common-tabList__item.is-selected")
  };

  var tabs = {
    primaryTabButtonSelector: u.req(TOOLTIP),
    tabWrapperSelector: u.req(TOOLTIP),
    fallbackTabButtonSelector: u.opt(".ba-common-tooltip"),
    tabButtonItemSelector: u.req(TAB_ITEM),
    tabListSelector: u.req(".ba-common-tabList"),
    tabLabelTidSelector: u.opt("[data-tid='" + LABEL_TID + "']"),
    tabLabelTruncatedTextSelector: u.opt(".ba-common-truncatedText__text"),
    tabLabelTextSelector: u.opt(".ba-common-tabList__labelText"),
    tabLabelSelector: u.opt(".ba-common-tabList__label"),
    tabEditIconHostSelector: u.opt(TOOLTIP),
    tabEditIconInsertAfterSelector: u.opt(TAB_ITEM),
    tabEditPseudoTabItemClass: u.opt("ba-common-tabList__item is-label"),
    tabEditPseudoTabRole: u.opt("tab"),
    tabEditLabelContainerClass: u.opt("ba-common-tabList__label__container"),
    tabEditSvgIconClass: u.opt("ba-common-svgIcon is-clickable"),
    tabEditSubTitleClass: u.opt("subTitle"),
    tabEditInputClass: u.opt("svgIcon"),
    tabIndexAttribute: u.opt("data-index"),
    tabIdAttribute: u.opt("data-tab-id"),
    pageIdAttribute: u.opt("data-page-id"),
    activeSelectedAttribute: u.opt("aria-selected"),
    activeSelectedValue: u.opt("true"),
    selectedClassGeneric: u.opt("selected"),
    activeClassGeneric: u.opt("active"),
    selectedClassBem: u.opt(SELECTED_BEM),
    tabContentSelector: u.opt(".ba-common-page, .ba-common-pageView, [data-cv-page-id]")
  };

  tabs.tabLabelSelectors = {
    selector: [
      tabs.tabLabelTidSelector.selector,
      tabs.tabLabelTruncatedTextSelector.selector,
      tabs.tabLabelTextSelector.selector,
      tabs.tabLabelSelector.selector
    ],
    required: false
  };

  tabs.activeClassNames = {
    selector: ["selected", "active", SELECTED_BEM],
    required: false
  };

  return {
    tab: { entries: tab, strings: u.stringsFromEntries(tab) },
    tabs: { entries: tabs, strings: u.stringsFromEntries(tabs) }
  };
});
