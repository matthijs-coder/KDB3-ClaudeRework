define([
  "../config.js",
  "../config/defaults.js",
  "./confirm.js"
], function (_config, _defaults, _confirm) {
  "use strict";

  // The edit icons next to a tab label (rename, delete, duplicate, move): DOM build, removal and click binding.

  const ICON_CONFIG = _config.editIcons;
  const MUTATION_UI = _config.mutationUi;
  const WRAPPER_CLASSES = ICON_CONFIG.map(function (cfg) { return cfg.wrapperClass; });

  function renderTabEditIcons(wrapperEl, context) {
    if (!wrapperEl || !wrapperEl.querySelector) { return {}; }
    removeExistingIconWrappers(wrapperEl);
    const selectors = _config.selectors;
    let anchor = wrapperEl.querySelector(selectors.tabEditIconInsertAfterSelector || selectors.tabButtonItemSelector);
    const icons = {};
    ICON_CONFIG.forEach(function (cfg) {
      const wrapper = createIconWrapper(cfg, context);
      icons[cfg.key] = wrapper;
      if (anchor && anchor.parentNode) {
        anchor.parentNode.insertBefore(wrapper, anchor.nextSibling);
      } else {
        wrapperEl.appendChild(wrapper);
      }
      anchor = wrapper;
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
    WRAPPER_CLASSES.forEach(function (className) {
      Array.from(wrapperEl.querySelectorAll("." + className)).forEach(function (el) {
        if (el.parentNode) { el.parentNode.removeChild(el); }
      });
    });
  }

  function createIconWrapper(cfg, context) {
    const selectors = _config.selectors;
    const tabIndex = context && typeof context.tabIndex === "number" ? context.tabIndex : -1;
    const tabId = context && typeof context.tabId === "string" ? context.tabId : null;
    // Icons render disabled while a tab mutation runs.
    const enabled = !_confirm.isTabMutationInFlight(context && context._KDB);
    const top = createDiv(cfg.wrapperClass);
    top.setAttribute("aria-disabled", enabled ? "false" : "true");

    const item = createDiv(selectors.tabEditPseudoTabItemClass);
    item.setAttribute("role", selectors.tabEditPseudoTabRole);
    item.setAttribute("tabindex", "-1");
    item.setAttribute("aria-selected", "false");

    const container = createDiv(selectors.tabEditLabelContainerClass);
    const span = document.createElement("span");
    span.className = cfg.spanClass;

    const svgIcon = createDiv(selectors.tabEditSvgIconClass);
    svgIcon.setAttribute("focusable", "false");

    const input = document.createElement("input");
    input.type = "image";
    input.className = selectors.tabEditInputClass + " " + _defaults.EDIT_ICON_CLASS + " " + cfg.extraClass;
    input.src = _defaults.EDIT_ICON_IMAGES_BASE + String(cfg.file || "");
    input.title = String(cfg.title || "");
    input.setAttribute("aria-disabled", enabled ? "false" : "true");

    svgIcon.appendChild(input);
    span.appendChild(svgIcon);
    container.appendChild(span);
    container.appendChild(createDiv(selectors.tabEditSubTitleClass));
    item.appendChild(container);
    top.appendChild(item);
    bindIconClick(cfg, context, enabled, top, input, tabIndex, tabId);
    return top;
  }

  function createDiv(className) {
    const el = document.createElement("div");
    el.className = className;
    return el;
  }

  function bindIconClick(cfg, context, enabled, top, input, tabIndex, tabId) {
    const handler = enabled && MUTATION_UI[cfg.key]
      ? onMutationIconClick.bind(null, cfg.key, context && context._KDB, tabIndex, tabId)
      : onDisabledIconClick;
    top.addEventListener("click", handler);
    input.addEventListener("click", handler);
  }

  // DOM click boundary. Legacy parity: the icon drops focus (no persistent "selected" look; lets the focusout
  // watchdog remove the icons) and the rename session ends before the dialog opens, also when it is cancelled.
  async function onMutationIconClick(operation, _KDB, tabIndex, tabId, ev) {
    ev.preventDefault();
    ev.stopPropagation();
    blurIconTarget(ev);
    if (!_KDB) { return false; }
    try {
      endActiveEditSession(_KDB);
      await _confirm.confirmAndDispatchTabMutation(_KDB, operation, { tabIndex: tabIndex, tabId: tabId });
    } catch (err) {
      console.warn("[tabs.editIcon] " + operation + " click handling failed", err);
    }
    return false;
  }

  function onDisabledIconClick(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    blurIconTarget(ev);
    return false;
  }

  function blurIconTarget(ev) {
    const el = ev && ev.target;
    if (el && typeof el.blur === "function") { el.blur(); }
  }

  // A failed rename commit must not block the icon action.
  function endActiveEditSession(_KDB) {
    const session = _KDB.runtime && _KDB.runtime.tabs && _KDB.runtime.tabs.editSession;
    if (!session || typeof session.commit !== "function") { return; }
    try {
      session.commit();
    } catch (err) {
      console.warn("[tabs.editIcon] ending edit session failed", err);
    }
  }

  return { renderTabEditIcons: renderTabEditIcons, removeTabEditIcons: removeTabEditIcons, bindIconClick: bindIconClick };
});
