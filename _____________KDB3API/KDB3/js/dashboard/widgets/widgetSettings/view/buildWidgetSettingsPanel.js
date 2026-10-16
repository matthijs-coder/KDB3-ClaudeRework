define([
  "../config/controlDefinitions.js",
  "../config/selectors.js",
  "./buildSettingsIcon.js",
  "./buildDropdownOptions.js"
], function (_controlDefinitions, _selectors, _buildSettingsIcon, _buildDropdownOptions) {
  function __controller(_KDB, _context) {
    try {
      const widgetType = normalizeWidgetType(_context.widgetType);
      const built = buildRoot(_KDB, _context.widgetId, widgetType);
      appendIcons(_KDB, built.icons, widgetType, _context.kennzahlenTable);
      _buildDropdownOptions(_KDB, {
        root: built.root,
        widgetId: _context.widgetId,
        widgetType: widgetType,
        kennzahlenTable: _context.kennzahlenTable
      });
      return built.root;
    } catch (err) {
      console.error("[widgetSettings.buildWidgetSettingsPanel] failed", { widgetId: _context && _context.widgetId }, err);
      throw err;
    }
  }

  function buildRoot(_KDB, widgetId, widgetType) {
    try {
      const root = document.createElement("div");
      const headerRow = document.createElement("div");
      const leading = document.createElement("div");
      const titleStretch = document.createElement("div");
      const icons = document.createElement("div");
      root.className = "KDB_widgetSettings";
      root.setAttribute("data-kdb-widget-settings-root", String(widgetId));
      root.setAttribute("data-kdb-widget-type", widgetType);
      headerRow.className = "KDB_widgetSettingsHeaderRow";
      leading.className = "KDB_settingsLeading";
      leading.appendChild(_buildSettingsIcon(_KDB, _controlDefinitions.info));
      titleStretch.className = "KDB_settingsTitleStretch";
      titleStretch.appendChild(buildTitle());
      icons.className = _selectors.settingsIconsClass;
      headerRow.appendChild(leading);
      headerRow.appendChild(titleStretch);
      headerRow.appendChild(icons);
      root.appendChild(headerRow);
      root.appendChild(buildBadges());
      return { root: root, icons: icons };
    } catch (err) {
      console.error("[widgetSettings.buildRoot] failed", { widgetId: widgetId }, err);
      throw err;
    }
  }

  function buildTitle() {
    try {
      const titleWrap = document.createElement("div");
      const textArea = document.createElement("div");
      const title = document.createElement("p");
      titleWrap.className = _selectors.widgetTitleClass + " " + _selectors.titleShownClass + " KDB_settingsTitleWrap";
      titleWrap.setAttribute("title", "Einstellungen");
      textArea.className = _selectors.textAreaClass;
      title.className = _selectors.responsiveFontSizeClass + " KDB_settingsHeadlineFixed";
      title.textContent = "Einstellungen";
      textArea.appendChild(title);
      titleWrap.appendChild(textArea);
      return titleWrap;
    } catch (err) {
      console.error("[widgetSettings.buildTitle] failed", err);
      throw err;
    }
  }

  function buildBadges() {
    try {
      const badges = document.createElement("div");
      badges.className = _selectors.badgeContainerClass;
      badges.setAttribute("aria-hidden", "true");
      return badges;
    } catch (err) {
      console.error("[widgetSettings.buildBadges] failed", err);
      throw err;
    }
  }

  function appendIcons(_KDB, icons, widgetType, tableName) {
    try {
      const definitions = widgetType === "text" ? _controlDefinitions.text : _controlDefinitions.live;
      let index = 0;
      while (index < definitions.length) {
        icons.appendChild(_buildSettingsIcon(_KDB, definitions[index], definitions[index].usesTable ? tableName : null));
        index += 1;
      }
    } catch (err) {
      console.error("[widgetSettings.appendIcons] failed", { widgetType: widgetType }, err);
      throw err;
    }
  }

  function normalizeWidgetType(widgetType) {
    return widgetType === "text" ? "text" : "live";
  }

  return __controller;
});
