define([
  "../config/controlDefinitions.js",
  "../config/selectors.js",
  "./buildSettingsIcon.js",
  "./dropdownPopulate.js"
], function (_controlDefinitions, _selectors, buildSettingsIcon, _dropdownPopulate) {
  const SHOW_VALUES_NEST = ".KDB_showValuesContainer > .KDB_IconsDropdown[data-kdb-dropdown-kind=\"";
  const COMMON_DROPDOWNS = [
    { configKey: "backgroundColor", selector: ".KDB_backgroundColorContainer", isColor: true }
  ];
  const LIVE_DROPDOWNS = [
    { configKey: "visualization", selector: ".KDB_visualizationsContainer" },
    { configKey: "grouping", selector: ".KDB_groupingContainer" },
    { configKey: "showValues", selector: ".KDB_showValuesContainer" },
    { configKey: "iterator", selector: SHOW_VALUES_NEST + "iterator\"]" },
    { configKey: "zoom", selector: SHOW_VALUES_NEST + "zoom\"]" },
    { configKey: "valueCaption", selector: SHOW_VALUES_NEST + "valueCaption\"]" },
    { configKey: "dimension", selector: ".KDB_dimensionsContainer", propertyKey: "dimensions" },
    { configKey: "topN", selector: ".KDB_topNContainer" },
    { configKey: "move", selector: ".KDB_moveContainer" }
  ];
  const TEXT_DROPDOWNS = [
    { configKey: "restyle", selector: ".KDB_layoutContainer", dropdownKind: "layout" },
    { configKey: "move", selector: ".KDB_moveContainer" },
    { configKey: "fontSize", selector: ".KDB_fontSizeContainer" }
  ];

  function createDiv(className) {
    const el = document.createElement("div");
    el.className = className;
    return el;
  }

  function buildTitle() {
    const titleWrap = createDiv(_selectors.widgetTitleClass + " " + _selectors.titleShownClass + " KDB_settingsTitleWrap");
    const textArea = createDiv(_selectors.textAreaClass);
    const title = document.createElement("p");
    titleWrap.setAttribute("title", "Einstellungen");
    title.className = _selectors.responsiveFontSizeClass + " KDB_settingsHeadlineFixed";
    title.textContent = "Einstellungen";
    textArea.appendChild(title);
    titleWrap.appendChild(textArea);
    return titleWrap;
  }

  function buildBadges() {
    const badges = createDiv(_selectors.badgeContainerClass);
    badges.setAttribute("aria-hidden", "true");
    return badges;
  }

  function buildRoot(_KDB, widgetId, widgetType) {
    const root = createDiv("KDB_widgetSettings");
    const headerRow = createDiv("KDB_widgetSettingsHeaderRow");
    const leading = createDiv("KDB_settingsLeading");
    const titleStretch = createDiv("KDB_settingsTitleStretch");
    const icons = createDiv(_selectors.settingsIconsClass);
    root.setAttribute("data-kdb-widget-settings-root", String(widgetId));
    root.setAttribute("data-kdb-widget-type", widgetType);
    leading.appendChild(buildSettingsIcon(_KDB, _controlDefinitions.info));
    titleStretch.appendChild(buildTitle());
    headerRow.appendChild(leading);
    headerRow.appendChild(titleStretch);
    headerRow.appendChild(icons);
    root.appendChild(headerRow);
    root.appendChild(buildBadges());
    return { root: root, icons: icons };
  }

  function appendIcons(_KDB, icons, widgetType, tableName) {
    const definitions = widgetType === "text" ? _controlDefinitions.text : _controlDefinitions.live;
    definitions.forEach(function (definition) {
      icons.appendChild(buildSettingsIcon(_KDB, definition, definition.usesTable ? tableName : null));
    });
  }

  function populateDropdowns(_KDB, context, specs) {
    specs.forEach(function (spec) {
      if (spec.propertyKey) {
        _dropdownPopulate.populateTableDropdown(_KDB, context, "dimension", spec.selector, spec.propertyKey);
        return;
      }
      _dropdownPopulate.populateStaticDropdown(_KDB, context.root, spec.configKey, spec.selector, spec.isColor === true, spec.dropdownKind);
    });
  }

  function buildDropdownOptions(_KDB, context) {
    populateDropdowns(_KDB, context, COMMON_DROPDOWNS);
    populateDropdowns(_KDB, context, context.widgetType === "text" ? TEXT_DROPDOWNS : LIVE_DROPDOWNS);
  }

  function buildWidgetSettingsPanel(_KDB, context) {
    const widgetType = context.widgetType === "text" ? "text" : "live";
    const built = buildRoot(_KDB, context.widgetId, widgetType);
    appendIcons(_KDB, built.icons, widgetType, context.kennzahlenTable);
    buildDropdownOptions(_KDB, {
      root: built.root,
      widgetId: context.widgetId,
      widgetType: widgetType,
      kennzahlenTable: context.kennzahlenTable
    });
    return built.root;
  }

  return {
    buildWidgetSettingsPanel: buildWidgetSettingsPanel
  };
});
