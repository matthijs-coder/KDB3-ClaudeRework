define([], function () {
  const BASE_SHELL_ATTRIBUTES = ["data-kdb-claimed-run"];

  function cleanBaseShellForTransfer(widgetEl) {
    let attrIndex = 0;
    while (attrIndex < BASE_SHELL_ATTRIBUTES.length) {
      widgetEl.removeAttribute(BASE_SHELL_ATTRIBUTES[attrIndex]);
      attrIndex += 1;
    }
  }

  function cleanLaunchpadWidget(_KDB, _widgetElOrId) {
    const widgetEl = resolveWidgetEl(_widgetElOrId);
    if (widgetEl) {
      cleanBaseShellForTransfer(widgetEl);
    }
    return Promise.resolve();
  }

  function resolveWidgetEl(widgetElOrId) {
    if (widgetElOrId && widgetElOrId.nodeType === 1) {
      return widgetElOrId;
    }
    if (typeof document !== "undefined" && typeof document.getElementById === "function") {
      return document.getElementById(widgetElOrId);
    }
    return null;
  }

  return cleanLaunchpadWidget;
});
