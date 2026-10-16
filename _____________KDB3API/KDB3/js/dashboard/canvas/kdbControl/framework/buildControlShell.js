define([
  "./createFrameworkElement.js",
  "./buildSettingsPanel.js",
  "./buildToolboxPanel.js",
  "../config/domSelectors.js",
  "../config/labels.js",
  "../config/icons.js"
], function (_createElement, _buildSettingsPanel, _buildToolboxPanel, _domSelectors, _labels, _icons) {
  "use strict";

  var HEADER_TEXTS = _labels.header;

  function createHeaderIcon(src, alt) {
    var img = document.createElement("img");
    img.className = "kdb-control__header-icon";
    img.src = src;
    if (alt) {
      img.alt = alt;
    } else {
      img.setAttribute("role", "presentation");
      img.alt = "";
    }
    return img;
  }

  function createSettingsButton(_KDB) {
    var button = _createElement("button", "kdb-control-header-settings",
      "kdb-control__header-icon-button kdb-control__header-icon-settings", {
        type: "button",
        "data-header-action": "select-settings",
        "aria-label": HEADER_TEXTS.settingsButton,
        title: HEADER_TEXTS.settingsButton
      });
    var glyph = createHeaderIcon(_icons.readIconSrc(_KDB, "kdbControlHeaderIconSettingsSrc"), "");
    glyph.className = "kdb-control__header-icon kdb-control__header-icon--settings-glyph";
    button.appendChild(glyph);
    return button;
  }

  function createHandbookLink(_KDB) {
    var handbookUrl = _icons.readHandbookUrl(_KDB);
    var link = _createElement("a", null, "kdb-control__header-icon-button kdb-control__header-icon-info", handbookUrl
      ? { href: handbookUrl, target: "_blank", rel: "noopener noreferrer", title: HEADER_TEXTS.handbook, "aria-label": HEADER_TEXTS.handbook }
      : { href: "#", tabindex: "-1", "aria-label": HEADER_TEXTS.handbookInactive, "aria-hidden": "true" });
    link.appendChild(createHeaderIcon(_icons.readIconSrc(_KDB, "kdbControlHeaderIconInfoSrc"), handbookUrl ? HEADER_TEXTS.handbook : ""));
    if (!handbookUrl) {
      link.addEventListener("click", function (event) {
        event.preventDefault();
      });
    }
    return link;
  }

  function buildControlHeader(_KDB) {
    var wrap = _createElement("div", null, "kdb-control__header", null);
    var title = _createElement("div", "kdb-control-header-title", "kdb-control__header-title", null);
    title.textContent = HEADER_TEXTS.title;
    var actions = _createElement("div", null, "kdb-control__header-actions", null);
    actions.appendChild(createSettingsButton(_KDB));
    actions.appendChild(createHandbookLink(_KDB));
    wrap.appendChild(title);
    wrap.appendChild(actions);
    return wrap;
  }

  function createPanelToggle(panelId, label, id) {
    var button = _createElement("button", id, "kdb-control__top-toggle kdb-toggle", { type: "button", "data-panel-id": panelId });
    button.textContent = label;
    button.setAttribute("title", label);
    return button;
  }

  function buildMainToggles() {
    var row = _createElement("div", "kdb-control-main-toggles", "kdb-control__main-toggles", null);
    row.appendChild(createPanelToggle("metrics", _labels.mainToggles.metrics, "kdb-control_metrics_toggle"));
    row.appendChild(createPanelToggle("toolbox", _labels.mainToggles.toolbox, null));
    return row;
  }

  function buildCollapseArrow() {
    var arrow = _createElement("button", "kdb-control-arrow", "kdb-control__collapse-arrow", { type: "button", "aria-expanded": "true" });
    arrow.textContent = "\u25c0";
    arrow.setAttribute("title", arrow.textContent);
    return arrow;
  }

  // Builds the detached control panel: header, settings panel, save/load slot, main toggles, metrics/toolbox panels, arrow.
  function buildControlShell(_KDB) {
    var root = _createElement("div", "kdb-control-root", "kdb-control", null);
    var content = _createElement("div", "kdb-control-content", "kdb-control__content", null);
    content.appendChild(buildControlHeader(_KDB));

    var settingsOuter = _createElement("div", "kdb-control-settings-outer", "kdb-control__settings-outer", null);
    settingsOuter.appendChild(_buildSettingsPanel(_KDB));
    var saveLoadSlot = _createElement("div", _domSelectors.saveLoadSlotId, "kdb-control__save-load-slot", { "aria-hidden": "true" });

    var mainBlocks = _createElement("div", "kdb-control-main-blocks", "kdb-control__main-blocks", null);
    mainBlocks.appendChild(_createElement("div", "kdb-control_metrics_container", "kdb-control__panel kdb-control__panel-metrics", null));
    mainBlocks.appendChild(_buildToolboxPanel(_KDB));

    content.appendChild(settingsOuter);
    content.appendChild(saveLoadSlot);
    content.appendChild(buildMainToggles());
    content.appendChild(mainBlocks);
    root.appendChild(content);
    root.appendChild(buildCollapseArrow());
    return root;
  }

  return buildControlShell;
});
