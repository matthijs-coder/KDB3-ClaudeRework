define([
  "../config/defaults.js"
], function (_defaults) {
  "use strict";

  function __controller(_KDB, _runtime) {
    const mountEl = resolveTemplateMount(_KDB);
    const textDimensions = resolveDefaultDimensions(_KDB, "text");
    const visualizationDimensions = resolveDefaultDimensions(_KDB, "visualization");
    const templates = {
      text: createTemplateRecord(mountEl, "text", textDimensions),
      visualization: createTemplateRecord(mountEl, "visualization", visualizationDimensions)
    };

    _runtime.domRefs = _runtime.domRefs || {};
    _runtime.domRefs.hideSpotEl = mountEl;
    _runtime.domRefs.avatarTemplates = templates;
    return templates;
  }

  function resolveTemplateMount(_KDB) {
    const hideSpotEl = _KDB && _KDB.elements && typeof _KDB.elements.launchpadHideSpot === "function"
      ? _KDB.elements.launchpadHideSpot()
      : null;
    return hideSpotEl || ensureFallbackMount();
  }

  function ensureFallbackMount() {
    let mountEl = document.getElementById(_defaults.templateIds.hiddenMount);

    if (mountEl) {
      return mountEl;
    }
    mountEl = document.createElement("div");
    mountEl.id = _defaults.templateIds.hiddenMount;
    mountEl.className = _defaults.classNames.hiddenMount;
    document.body.appendChild(mountEl);
    return mountEl;
  }

  function createTemplateRecord(mountEl, templateKey, dimensions) {
    const templateEl = ensureTemplate(mountEl, templateKey, dimensions);
    return {
      avatarHeight: dimensions.height,
      avatarId: _defaults.templateIds[templateKey],
      avatarWidth: dimensions.width,
      templateEl: templateEl
    };
  }

  function ensureTemplate(mountEl, templateKey, dimensions) {
    const templateId = _defaults.templateIds[templateKey];
    let templateEl = mountEl.querySelector("#" + templateId);
    let iconEl;

    if (!templateEl) {
      templateEl = document.createElement("div");
      iconEl = document.createElement("img");
      templateEl.id = templateId;
      templateEl.className = (templateKey === "text" ? "textAvatar" : "visAvatar") + " " + _defaults.classNames.template;
      templateEl.setAttribute("aria-hidden", "true");
      iconEl.setAttribute("alt", "");
      iconEl.setAttribute("aria-hidden", "true");
      templateEl.appendChild(iconEl);
      mountEl.appendChild(templateEl);
    }
    styleTemplate(templateEl, dimensions);
    styleIcon(templateEl.querySelector("img"), _defaults.avatarAssetPaths[templateKey]);
    return templateEl;
  }

  function styleTemplate(templateEl, dimensions) {
    templateEl.style.width = Math.round(dimensions.width) + "px";
    templateEl.style.height = Math.round(dimensions.height) + "px";
    templateEl.style.border = "1px solid #000";
    templateEl.style.borderRadius = "2px";
    templateEl.style.background = "linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(236, 236, 236, 0.98) 100%)";
    templateEl.style.boxSizing = "border-box";
    templateEl.style.display = "flex";
    templateEl.style.alignItems = "center";
    templateEl.style.justifyContent = "center";
    templateEl.style.overflow = "hidden";
    templateEl.style.position = "relative";
  }

  function styleIcon(iconEl, src) {
    if (!iconEl) {
      return;
    }
    iconEl.setAttribute("src", src);
    iconEl.style.display = "block";
    iconEl.style.width = "100%";
    iconEl.style.height = "100%";
    iconEl.style.objectFit = "fill";
    iconEl.style.opacity = "0.9";
  }

  function resolveDefaultDimensions(_KDB, draggedElementType) {
    const config = draggedElementType === "text"
      ? (_KDB.properties && _KDB.properties.textWidgetPropObj) || {}
      : (_KDB.properties && _KDB.properties.visualizationsPropObj) || {};
    const fallback = _defaults.defaultDimensions[draggedElementType];

    return {
      height: parseDimensionToPx(config.defaultHeight, fallback.height),
      width: parseDimensionToPx(config.defaultWidth, fallback.width)
    };
  }

  function parseDimensionToPx(rawValue, fallbackPx) {
    const fallback = fallbackPx || 300;
    const parsed = typeof rawValue === "number" ? rawValue : parseFloat(rawValue);
    return isFinite(parsed) ? parsed : fallback;
  }

  return __controller;
});
