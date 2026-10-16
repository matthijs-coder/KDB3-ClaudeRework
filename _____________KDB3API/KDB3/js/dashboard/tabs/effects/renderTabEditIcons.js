define([
  "../config/defaults.js",
  "../config/selectors.js",
  "./tabEditIconActions.js"
], function (_defaults, _selectors, _iconActions) {
  "use strict";

  const ICON_CONFIG = [
    { key: "delete", wrapperClass: _defaults.EDIT_ICON_WRAPPER_CLOSE_CLASS, spanClass: _defaults.EDIT_ICON_SPAN_CLOSE_CLASS, extraClass: _defaults.EDIT_ICON_DELETE_CLASS, file: _defaults.EDIT_ICON_DELETE_FILE, title: _defaults.EDIT_ICON_DELETE_TITLE },
    { key: "duplicate", wrapperClass: _defaults.EDIT_ICON_WRAPPER_DUPLICATE_CLASS, spanClass: _defaults.EDIT_ICON_SPAN_DUPLICATE_CLASS, extraClass: _defaults.EDIT_ICON_DUPLICATE_CLASS, file: _defaults.EDIT_ICON_DUPLICATE_FILE, title: _defaults.EDIT_ICON_DUPLICATE_TITLE },
    { key: "move", wrapperClass: _defaults.EDIT_ICON_WRAPPER_MOVE_CLASS, spanClass: _defaults.EDIT_ICON_SPAN_MOVE_CLASS, extraClass: _defaults.EDIT_ICON_MOVE_CLASS, file: _defaults.EDIT_ICON_MOVE_FILE, title: _defaults.EDIT_ICON_MOVE_TITLE }
  ];

  const WRAPPER_CLASSES = ICON_CONFIG.map(function (cfg) { return cfg.wrapperClass; });

  function renderTabEditIcons(wrapperEl, context) {
    if (!wrapperEl || !wrapperEl.querySelector) { return {}; }
    removeExistingIconWrappers(wrapperEl);
    const host = wrapperEl;
    const insertAfter = host.querySelector(_selectors.tabEditIconInsertAfterSelector || _selectors.tabButtonItemSelector);
    const icons = {};
    let anchor = insertAfter;
    ICON_CONFIG.forEach(function (cfg) {
      const wrapper = createIconWrapper(cfg, context);
      icons[cfg.key] = wrapper;
      if (anchor && anchor.parentNode) {
        anchor.parentNode.insertBefore(wrapper, anchor.nextSibling);
        anchor = wrapper;
      } else {
        host.appendChild(wrapper);
        anchor = wrapper;
      }
    });
    return icons;
  }

  function removeTabEditIcons(iconRefs) {
    Object.keys(iconRefs || {}).forEach(function (key) {
      const el = iconRefs[key];
      if (el && el.parentNode) { el.parentNode.removeChild(el); }
    });
  }

  function removeExistingIconWrappers(wrapperEl) {
    if (!wrapperEl || !wrapperEl.querySelectorAll) { return; }
    WRAPPER_CLASSES.forEach(function (className) {
      const existing = wrapperEl.querySelectorAll("." + className);
      let index = 0;
      while (index < existing.length) {
        const el = existing[index];
        if (el && el.parentNode) { el.parentNode.removeChild(el); }
        index += 1;
      }
    });
  }

  function resolveActionLogName(cfg) {
    if (cfg.key === "duplicate") { return "copy"; }
    return cfg.key;
  }

  function createIconWrapper(cfg, context) {
    const actionName = resolveActionLogName(cfg);
    const tabName = context && context.tabName != null ? String(context.tabName) : "";
    const tabIndex = context && typeof context.tabIndex === "number" ? context.tabIndex : -1;
    const tabId = context && typeof context.tabId === "string" ? context.tabId : null;
    const enabled = _iconActions.isIconEnabled(cfg, context);
    const top = document.createElement("div");
    top.className = cfg.wrapperClass;
    top.setAttribute("aria-disabled", enabled ? "false" : "true");

    const item = document.createElement("div");
    item.className = _selectors.tabEditPseudoTabItemClass;
    item.setAttribute("role", _selectors.tabEditPseudoTabRole);
    item.setAttribute("tabindex", "-1");
    item.setAttribute("aria-selected", "false");

    const container = document.createElement("div");
    container.className = _selectors.tabEditLabelContainerClass;

    const span = document.createElement("span");
    span.className = cfg.spanClass;

    const svgIcon = document.createElement("div");
    svgIcon.className = _selectors.tabEditSvgIconClass;
    svgIcon.setAttribute("focusable", "false");

    const input = document.createElement("input");
    input.type = "image";
    input.className = _selectors.tabEditInputClass + " " + _defaults.EDIT_ICON_CLASS + " " + cfg.extraClass;
    input.src = _defaults.EDIT_ICON_IMAGES_BASE + String(cfg.file || "");
    input.title = String(cfg.title || "");
    input.setAttribute("aria-disabled", enabled ? "false" : "true");

    svgIcon.appendChild(input);
    span.appendChild(svgIcon);
    container.appendChild(span);

    const subTitle = document.createElement("div");
    subTitle.className = _selectors.tabEditSubTitleClass;
    container.appendChild(subTitle);

    item.appendChild(container);
    top.appendChild(item);
    _iconActions.bindIconClick(cfg, context, enabled, top, input, tabIndex, tabId, actionName, tabName);
    return top;
  }

  return { renderTabEditIcons: renderTabEditIcons, removeTabEditIcons: removeTabEditIcons };
});
