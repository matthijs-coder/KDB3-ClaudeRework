define([
  "../config/selectors.js"
], function (_selectors) {
  function resolveRenderRoot(_KDB) {
    const core = _KDB && _KDB.runtime && _KDB.runtime.core && _KDB.runtime.core.domRefs;
    return core && core.renderParentEl ? core.renderParentEl : null;
  }

  function resolvePanel(_KDB, _widgetId) {
    const widgetId = String(_widgetId || "");
    const runtime = _KDB.runtime && _KDB.runtime.widgetSettings;
    const refs = runtime && runtime.domRefs ? runtime.domRefs[widgetId] : null;
    if (refs && refs.panel) {
      return refs.panel;
    }
    const root = resolveRenderRoot(_KDB);
    if (!root || typeof root.querySelector !== "function") {
      return null;
    }
    return root.querySelector(_selectors.panelRootSelectorFor(widgetId));
  }

  function resolveWidgetType(payload) {
    const kind = String(payload.kind || payload.widgetType || payload.type || "").toLowerCase();
    if (kind === "text") {
      return { supported: true, widgetType: "text" };
    }
    if (kind === "vis" || kind === "live") {
      return { supported: true, widgetType: "live" };
    }
    return { supported: false, widgetType: null };
  }

  function validateShellRootClass(widgetEl, widgetType, widgetId) {
    const requiredClass = shellClassRequiredOnRoot(widgetType);
    if (!widgetEl.classList.contains(requiredClass)) {
      return {
        ok: false,
        skipped: true,
        widgetId: widgetId,
        widgetType: widgetType,
        reasonCode: "WIDGET_SETTINGS_SHELL_CLASS_MISMATCH",
        errorMessage: buildShellRootClassMismatchMessage(widgetEl, widgetType, requiredClass)
      };
    }
    return null;
  }

  function shellClassRequiredOnRoot(widgetType) {
    return widgetType === "text" ? _selectors.textWidgetClassName : _selectors.liveWidgetClassName;
  }

  function buildShellRootClassMismatchMessage(widgetEl, widgetType, requiredClass) {
    const descendantSelector = widgetType === "text" ? _selectors.textWidgetClass : _selectors.liveWidgetClass;
    const hasDescendantClass = !!(widgetEl.querySelector && widgetEl.querySelector(descendantSelector));
    const rootRequirement = "Widget settings require \"" + requiredClass + "\" on the shell root element for CSS ancestor selectors.";
    if (hasDescendantClass) {
      return rootRequirement + " A descendant matches " + descendantSelector + " but the shell root does not.";
    }
    return rootRequirement + " Shell root is missing required class \"" + requiredClass + "\".";
  }

  function resolveWidgetEl(_KDB, widgetId) {
    if (!widgetId) {
      return null;
    }
    let widgetEl = null;
    if (typeof document !== "undefined" && typeof document.getElementById === "function") {
      widgetEl = document.getElementById(widgetId);
    }
    if (widgetEl && widgetEl.nodeType === 1) {
      return widgetEl;
    }
    const root = resolveRenderRoot(_KDB);
    if (root && typeof root.querySelector === "function") {
      widgetEl = root.querySelector(_selectors.widgetIdSelector(widgetId));
    }
    return widgetEl && widgetEl.nodeType === 1 ? widgetEl : null;
  }

  function resolveWidgetElForPayload(_KDB, widgetId, payload) {
    if (payload && (payload.widgetEl || payload.shellRoot)) {
      return payload.widgetEl || payload.shellRoot;
    }
    return resolveWidgetEl(_KDB, widgetId);
  }

  function resolveMetricsTableName(payload, widgetEl) {
    const fromPayload = readMetricsTableFromPayload(payload);
    if (fromPayload) {
      return fromPayload;
    }
    const legacy = String((payload && payload.kennzahlenTable) || "").trim();
    if (legacy) {
      return legacy;
    }
    return readKennzahlenTable(widgetEl) || "";
  }

  function readMetricsTableFromPayload(payload) {
    const direct = String((payload && payload.metricsTable) || "").trim();
    if (direct) {
      return direct;
    }
    const dropPayload = payload && payload.dropRequest && payload.dropRequest.payload;
    return dropPayload ? String(dropPayload.metricsTable || "").trim() : "";
  }

  function readKennzahlenTable(widgetEl) {
    if (!widgetEl || !widgetEl.getAttribute) {
      return "";
    }
    return widgetEl.getAttribute(_selectors.kennzahlenTableAttr) || widgetEl.getAttribute(_selectors.kennzahlenTableAttrAlt) || "";
  }

  return {
    resolveWidgetType: resolveWidgetType,
    validateShellRootClass: validateShellRootClass,
    resolveWidgetEl: resolveWidgetEl,
    resolveWidgetElForPayload: resolveWidgetElForPayload,
    resolveMetricsTableName: resolveMetricsTableName,
    readMetricsTableFromPayload: readMetricsTableFromPayload,
    resolvePanel: resolvePanel
  };
});
