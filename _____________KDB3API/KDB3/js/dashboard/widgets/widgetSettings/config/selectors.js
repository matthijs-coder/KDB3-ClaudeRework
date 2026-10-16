define(["../../../../core/cognosHost/config/widgetChromeSelectors.js"], function (_widgetChrome) {
  var chrome = _widgetChrome.widget.strings;
  var focus = _widgetChrome.focusMode.strings;
  var settingsIconsSelector = ".KDB_widgetSettingsIcons";
  var dataIconSelector = chrome.dataWidgetIconSelector;

  function byAttr(attr, value) {
    return "[" + attr + "=\"" + String(value) + "\"]";
  }

  function widgetIdSelector(widgetId) {
    return byAttr("data-kdb-widget-id", widgetId);
  }

  function panelRootSelectorFor(widgetId) {
    return byAttr("data-kdb-widget-settings-root", widgetId);
  }

  function toolbarSelectorFor(widgetId) {
    return byAttr("data-kdb-widget-toolbar", widgetId);
  }

  return {
    widgetClass: chrome.widgetClass,
    textWidgetClass: chrome.textWidgetClass,
    liveWidgetClass: chrome.liveWidgetClass,
    textWidgetClassName: chrome.textWidgetClassName,
    liveWidgetClassName: chrome.liveWidgetClassName,
    widgetIdAttr: "data-kdb-widget-id",
    contentWrapperSelector: chrome.contentWrapperSelector,
    contentWrapperHeaderSelector: chrome.contentWrapperHeaderSelector,
    widgetHeaderSelector: chrome.widgetHeaderSelector,
    widgetIconsSelector: chrome.widgetIconsSelector,
    widgetIconsClassName: chrome.widgetIconsClassName,
    dataWidgetIconClass: chrome.dataWidgetIconClass,
    dataWidgetIconSelector: dataIconSelector,
    liveWidgetAnnotationsClass: chrome.liveWidgetAnnotationsClass,
    svgIconClass: chrome.svgIconClass,
    textIconClass: chrome.textIconClass,
    widgetTitleClass: chrome.widgetTitleClass,
    titleShownClass: chrome.titleShownClass,
    textAreaClass: chrome.textAreaClass,
    responsiveFontSizeClass: chrome.responsiveFontSizeClass,
    badgeContainerClass: chrome.badgeContainerClass,
    settingsIconsClass: "KDB_widgetSettingsIcons",
    settingsIconsSelector: settingsIconsSelector,
    settingsIconChildSelector: settingsIconsSelector + " > " + dataIconSelector,
    focusPanelIconsSelector: settingsIconsSelector + " > " + dataIconSelector + ", " + focus.canvasIconsSelector,
    focusPanelPointerIconSelector: settingsIconsSelector + " > " + dataIconSelector + ", .KDB_settingsLeading > " + dataIconSelector,
    panelRootClass: "KDB_widgetSettings",
    panelRootSelector: ".KDB_widgetSettings",
    panelRootAttr: "data-kdb-widget-settings-root",
    focusPanelRootAttr: "data-kdb-focus-mode-settings-root",
    panelWidgetTypeAttr: "data-kdb-widget-type",
    panelVisTypeAttr: "data-kdb-vis-type",
    toolbarClass: "KDB_widgetSettingsButton",
    toolbarSelector: ".KDB_widgetSettingsButton",
    toolbarAttr: "data-kdb-widget-toolbar",
    settingsToggleAttr: "data-kdb-widget-settings-toggle",
    visibleClass: "KDB_visible",
    hideClass: "KDB_hide",
    dropdownSelector: ".KDB_IconsDropdown",
    dropdownVisibleSelector: ".KDB_IconsDropdown.KDB_visible",
    dropdownOptionSelector: chrome.dataWidgetIconSelector + "[data-kdb-option-value]",
    dropdownOptionInDropdownSelector: ".KDB_IconsDropdown " + chrome.dataWidgetIconSelector + "[data-kdb-option-value]",
    optionSelectedClass: "KDB_optionSelected",
    dropdownPendingClass: "KDB_dropdownPending",
    settingsBoundAttr: "data-kdb-settings-bound",
    toolbarBoundAttr: "data-kdb-toolbar-bound",
    settingsIconActionAttr: "data-kdb-settings-icon-action",
    settingsIconKindAttr: "data-kdb-settings-icon-kind",
    dropdownKindAttr: "data-kdb-dropdown-kind",
    optionKeyAttr: "data-kdb-option-key",
    optionValueAttr: "data-kdb-option-value",
    defaultOptionAttr: "data-kdb-default",
    kennzahlenTableAttr: "kdb_kennzahlentable",
    kennzahlenTableAttrAlt: "KDB_KENNZAHLENTABLE",
    tableNameAttr: "table-name",
    byAttr: byAttr,
    widgetIdSelector: widgetIdSelector,
    panelRootSelectorFor: panelRootSelectorFor,
    toolbarSelectorFor: toolbarSelectorFor
  };
});
