define([
  "../config.js",
  "../config/selectors.js",
  "./dropdownUi.js"
], function (_config, _selectors, _dropdownUi) {
  function buildWidgetToolbar(_KDB, context) {
    const toolbar = document.createElement("div");
    const image = document.createElement("input");
    toolbar.className = "KDB_widgetSettingsButton";
    toolbar.classList.add(context.widgetType === "text" ? _selectors.textWidgetClassName : _selectors.liveWidgetClassName);
    toolbar.setAttribute("aria-label", "WidgetSettings");
    toolbar.setAttribute("data-kdb-widget-toolbar", String(context.widgetId));
    image.type = "image";
    image.className = _selectors.svgIconClass;
    image.src = _config.readImagePath() + "settings.svg";
    image.alt = "Widget settings";
    image.setAttribute("data-kdb-widget-settings-toggle", "1");
    toolbar.appendChild(image);
    return toolbar;
  }

  function placeWidgetToolbar(_KDB, context) {
    const widgetEl = context.widgetEl;
    const widgetId = String(context.widgetId || "");
    const existing = widgetEl.querySelector(_selectors.toolbarSelectorFor(widgetId));
    if (existing) {
      return existing;
    }
    const toolbar = buildWidgetToolbar(_KDB, context);
    if (window.getComputedStyle(widgetEl).position === "static") {
      widgetEl.style.position = "relative";
    }
    const header = widgetEl.querySelector(_selectors.contentWrapperHeaderSelector) || widgetEl.querySelector(_selectors.widgetHeaderSelector);
    let icons = header ? header.querySelector(_selectors.widgetIconsSelector) : null;
    if (!icons && header) {
      icons = document.createElement("div");
      icons.className = _selectors.widgetIconsClassName;
      header.appendChild(icons);
    }
    if (icons && typeof icons.insertAdjacentElement === "function") {
      icons.insertAdjacentElement("afterbegin", toolbar);
    } else if (header) {
      header.appendChild(toolbar);
    } else {
      widgetEl.appendChild(toolbar);
    }
    return toolbar;
  }

  function findOwningWidgetEl(toolbar, widgetId) {
    let current = toolbar;
    while (current) {
      if (current.id === widgetId || (current.getAttribute && current.getAttribute(_selectors.widgetIdAttr) === widgetId)) {
        return current;
      }
      current = current.parentNode;
    }
    return null;
  }

  function onToolbarClick(event) {
    let widgetId = "";
    try {
      const toolbar = event.currentTarget;
      widgetId = toolbar.getAttribute(_selectors.toolbarAttr) || "";
      const widgetEl = findOwningWidgetEl(toolbar, widgetId);
      const panel = widgetEl
        ? widgetEl.querySelector(_selectors.panelRootSelectorFor(widgetId)) || widgetEl.querySelector(_selectors.panelRootSelector)
        : null;
      if (!panel) {
        return;
      }
      panel.classList.toggle(_selectors.visibleClass);
      if (!panel.classList.contains(_selectors.visibleClass)) {
        _dropdownUi.closeVisibleDropdowns(panel, { resetTransform: false });
      }
    } catch (err) {
      console.error("[widgetSettings.onToolbarClick] failed", { widgetId: widgetId }, err);
    }
  }

  function bindWidgetToolbar(_KDB, context) {
    const toolbar = context.toolbarEl;
    const widgetId = String(context.widgetId || "");
    const runtime = _KDB.runtime.widgetSettings;
    const controllerKey = "toolbar:" + widgetId;
    if (!toolbar || toolbar.getAttribute(_selectors.toolbarBoundAttr) === "1") {
      return false;
    }
    if (runtime.abortControllers[controllerKey]) {
      runtime.abortControllers[controllerKey].abort();
    }
    runtime.abortControllers[controllerKey] = new AbortController();
    toolbar.setAttribute(_selectors.toolbarAttr, widgetId);
    toolbar.addEventListener("click", onToolbarClick, { signal: runtime.abortControllers[controllerKey].signal });
    toolbar.setAttribute(_selectors.toolbarBoundAttr, "1");
    return true;
  }

  return {
    placeWidgetToolbar: placeWidgetToolbar,
    bindWidgetToolbar: bindWidgetToolbar
  };
});
