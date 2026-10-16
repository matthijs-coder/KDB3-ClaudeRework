define(["../../../core/cognosHost/config/tabChromeSelectors.js"], function (_tabChrome) {
  "use strict";

  var chrome = _tabChrome.tabs.strings;
  var tabIndexAttribute = chrome.tabIndexAttribute;
  var tabIdAttribute = chrome.tabIdAttribute;
  var pageIdAttribute = chrome.pageIdAttribute;
  var activeSelectedAttribute = chrome.activeSelectedAttribute;
  var activeSelectedValue = chrome.activeSelectedValue;
  var activeClassNames = chrome.activeClassNames;

  return {
    primaryTabButtonSelector: chrome.primaryTabButtonSelector,
    tabWrapperSelector: chrome.tabWrapperSelector,
    fallbackTabButtonSelector: chrome.fallbackTabButtonSelector,
    tabButtonItemSelector: chrome.tabButtonItemSelector,
    tabListSelector: chrome.tabListSelector,
    tabLabelSelectors: chrome.tabLabelSelectors,
    tabEditIconHostSelector: chrome.tabEditIconHostSelector,
    tabEditIconInsertAfterSelector: chrome.tabEditIconInsertAfterSelector,
    tabEditPseudoTabItemClass: chrome.tabEditPseudoTabItemClass,
    tabEditPseudoTabRole: chrome.tabEditPseudoTabRole,
    tabEditLabelContainerClass: chrome.tabEditLabelContainerClass,
    tabEditSvgIconClass: chrome.tabEditSvgIconClass,
    tabEditSubTitleClass: chrome.tabEditSubTitleClass,
    tabEditInputClass: chrome.tabEditInputClass,
    tabIndexAttribute: tabIndexAttribute,
    tabIndexBase: 0,
    tabIdAttribute: tabIdAttribute,
    pageIdAttribute: pageIdAttribute,
    activeSelectedAttribute: activeSelectedAttribute,
    activeSelectedValue: activeSelectedValue,
    activeClassNames: activeClassNames,
    activeTabSelector: "[" + activeSelectedAttribute + "='" + activeSelectedValue + "'], ." + activeClassNames.join(", ."),
    tabContentSelector: chrome.tabContentSelector
  };
});
