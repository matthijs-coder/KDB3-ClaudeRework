define([
  "./config.js",
  "../../../core/utils/kit/runtime.js"
], function (_config, _rt) {
  "use strict";

  const AVATAR_ZINDEX = "9999";

  // Hidden templates the drag avatar is cloned from. They live in the launchpad hide spot when it
  // exists, otherwise in a fallback mount that this module owns and removes again on destroy.
  function createAvatarTemplates(_KDB, rt) {
    const launchpadMountEl = readLaunchpadMount(_KDB);
    const mountEl = launchpadMountEl || ensureFallbackMount(rt);
    const templates = {
      text: createTemplateRecord(mountEl, "text", readTemplateDimensions(_KDB, "text")),
      visualization: createTemplateRecord(mountEl, "visualization", readTemplateDimensions(_KDB, "visualization"))
    };

    rt.domRefs.hideSpotEl = mountEl;
    rt.domRefs.avatarTemplates = templates;
    return templates;
  }

  function removeAvatarTemplates(rt) {
    const templates = rt.domRefs.avatarTemplates || {};

    Object.keys(templates).forEach(function (templateKey) {
      removeElement(templates[templateKey] && templates[templateKey].templateEl);
    });
    removeElement(rt.domRefs.ownedMountEl);
    rt.domRefs.avatarTemplates = null;
    rt.domRefs.ownedMountEl = null;
    rt.domRefs.hideSpotEl = null;
  }

  function readLaunchpadMount(_KDB) {
    return _KDB && _KDB.elements && typeof _KDB.elements.launchpadHideSpot === "function"
      ? _KDB.elements.launchpadHideSpot()
      : null;
  }

  function ensureFallbackMount(rt) {
    let mountEl = document.getElementById(_config.templateIds.hiddenMount);

    if (mountEl) {
      return mountEl;
    }
    mountEl = document.createElement("div");
    mountEl.id = _config.templateIds.hiddenMount;
    mountEl.className = _config.classNames.hiddenMount;
    document.body.appendChild(mountEl);
    rt.domRefs.ownedMountEl = mountEl;
    return mountEl;
  }

  function createTemplateRecord(mountEl, templateKey, dimensions) {
    return {
      avatarHeight: dimensions.height,
      avatarId: _config.templateIds[templateKey],
      avatarWidth: dimensions.width,
      templateEl: ensureTemplate(mountEl, templateKey, dimensions)
    };
  }

  function ensureTemplate(mountEl, templateKey, dimensions) {
    const templateId = _config.templateIds[templateKey];
    let templateEl = mountEl.querySelector("#" + templateId);
    let iconEl;

    if (!templateEl) {
      templateEl = document.createElement("div");
      iconEl = document.createElement("img");
      templateEl.id = templateId;
      templateEl.className = (templateKey === "text" ? "textAvatar" : "visAvatar") + " " + _config.classNames.template;
      templateEl.setAttribute("aria-hidden", "true");
      iconEl.setAttribute("alt", "");
      iconEl.setAttribute("aria-hidden", "true");
      templateEl.appendChild(iconEl);
      mountEl.appendChild(templateEl);
    }
    styleTemplate(templateEl, dimensions);
    styleIcon(templateEl.querySelector("img"), _config.avatarAssetPaths[templateKey]);
    return templateEl;
  }

  function styleTemplate(templateEl, dimensions) {
    Object.assign(templateEl.style, {
      width: Math.round(dimensions.width) + "px",
      height: Math.round(dimensions.height) + "px",
      border: "1px solid #000",
      borderRadius: "2px",
      background: "linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(236, 236, 236, 0.98) 100%)",
      boxSizing: "border-box",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      position: "relative"
    });
  }

  function styleIcon(iconEl, src) {
    if (!iconEl) {
      return;
    }
    iconEl.setAttribute("src", src);
    Object.assign(iconEl.style, {
      display: "block",
      width: "100%",
      height: "100%",
      objectFit: "fill",
      opacity: "0.9"
    });
  }

  function readTemplateDimensions(_KDB, draggedElementType) {
    const properties = _KDB.properties || {};
    const settings = (draggedElementType === "text" ? properties.textWidgetPropObj : properties.visualizationsPropObj) || {};
    const fallback = _config.defaultDimensions[draggedElementType];

    return {
      height: parseDimensionToPx(settings.defaultHeight, fallback.height),
      width: parseDimensionToPx(settings.defaultWidth, fallback.width)
    };
  }

  function parseDimensionToPx(rawValue, fallbackPx) {
    const parsed = typeof rawValue === "number" ? rawValue : parseFloat(rawValue);
    return isFinite(parsed) ? parsed : (fallbackPx || 300);
  }

  function createDragAvatar(rt, sourceEl, draggedElementType, session) {
    const avatarEl = createAvatarEl(rt, sourceEl, draggedElementType, session || {});

    removeRuntimeElement(rt, "sourceCopyEl");
    removeRuntimeElement(rt, "avatarEl");
    rt.domRefs.sourceCopyEl = buildHiddenSourceCopy(rt, sourceEl);
    rt.domRefs.avatarEl = avatarEl;
    rt.sourceRuntime = { draggedElementType: draggedElementType, sourceEl: sourceEl };
    markActiveSource(rt, sourceEl);
    document.body.appendChild(avatarEl);
    return {
      avatarEl: avatarEl,
      copyId: rt.domRefs.sourceCopyEl ? rt.domRefs.sourceCopyEl.id : null
    };
  }

  function createAvatarEl(rt, sourceEl, draggedElementType, session) {
    const templateKey = draggedElementType === "text" ? "text" : "visualization";
    const templateInfo = rt.domRefs.avatarTemplates ? rt.domRefs.avatarTemplates[templateKey] : null;
    const templateEl = templateInfo ? templateInfo.templateEl : null;
    const avatarEl = templateEl && typeof templateEl.cloneNode === "function"
      ? templateEl.cloneNode(true)
      : cloneSourceOrFallback(sourceEl);

    avatarEl.removeAttribute("id");
    avatarEl.classList.add(_config.classNames.avatarClone);
    Object.assign(avatarEl.style, {
      position: "fixed",
      pointerEvents: "none",
      zIndex: AVATAR_ZINDEX,
      opacity: "0.95",
      width: Math.round(session.defaultWidth || 300) + "px",
      height: Math.round(session.defaultHeight || 300) + "px",
      maxWidth: "none",
      maxHeight: "none",
      transformOrigin: "top left",
      transform: "scale(" + String(session.scaleX || 1) + ", " + String(session.scaleY || 1) + ")"
    });
    return avatarEl;
  }

  function cloneSourceOrFallback(sourceEl) {
    if (sourceEl && typeof sourceEl.cloneNode === "function") {
      return sourceEl.cloneNode(true);
    }
    return document.createElement("div");
  }

  function buildHiddenSourceCopy(rt, sourceEl) {
    const hideSpotEl = rt.domRefs.hideSpotEl;
    let copyEl;

    if (!hideSpotEl || !sourceEl || typeof sourceEl.cloneNode !== "function") {
      return null;
    }
    copyEl = sourceEl.cloneNode(false);
    copyEl.removeAttribute("id");
    copyEl.id = String(sourceEl.getAttribute("code") || sourceEl.id || "item") + "_copy_" + Date.now();
    copyEl.classList.add(_config.classNames.itemCopy);
    copyEl.classList.remove(_config.classNames.itemOriginal);
    hideSpotEl.appendChild(copyEl);
    return copyEl;
  }

  function markActiveSource(rt, sourceEl) {
    const markedEls = [];
    const treeNodeEl = sourceEl && sourceEl.closest ? sourceEl.closest(".jstree-node") : null;

    if (sourceEl && sourceEl.classList) {
      sourceEl.classList.add(_config.classNames.activeSource);
      markedEls.push(sourceEl);
    }
    if (treeNodeEl && treeNodeEl.classList) {
      treeNodeEl.classList.add(_config.classNames.activeSource);
      markedEls.push(treeNodeEl);
    }
    rt.domRefs.sourceMarkedEls = markedEls;
  }

  function moveDragAvatar(rt, event, session) {
    const avatarEl = rt.domRefs.avatarEl;
    const pointerEvent = event && (event.originalEvent || event);

    if (!avatarEl || !pointerEvent || !session) {
      return false;
    }
    avatarEl.style.left = Math.round(pointerEvent.clientX - (session.offsetX || 0)) + "px";
    avatarEl.style.top = Math.round(pointerEvent.clientY - (session.offsetY || 0)) + "px";
    avatarEl.style.width = Math.round(session.defaultWidth || 300) + "px";
    avatarEl.style.height = Math.round(session.defaultHeight || 300) + "px";
    return true;
  }

  // The 1px native drag image is removed on the next tick; the timer is tracked so that finishing
  // or destroying the session cancels it and removes the element.
  function suppressNativeDragImage(event, rt) {
    const dragEvent = event && (event.originalEvent || event);
    const dataTransfer = dragEvent ? dragEvent.dataTransfer : null;
    let dragImageEl;

    if (!dataTransfer || typeof dataTransfer.setDragImage !== "function") {
      return false;
    }
    removeRuntimeElement(rt, "nativeDragImageEl");
    dragImageEl = document.createElement("div");
    Object.assign(dragImageEl.style, { width: "1px", height: "1px", opacity: "0" });
    document.body.appendChild(dragImageEl);
    try {
      dataTransfer.setDragImage(dragImageEl, 0, 0);
    } catch (error) {
      console.error("[dragDrop.suppressNativeDragImage] failed", error);
      removeElement(dragImageEl);
      return false;
    }
    rt.domRefs.nativeDragImageEl = dragImageEl;
    _rt.scheduleTimeout(rt.timers, "nativeDragImage", removeRuntimeElement.bind(null, rt, "nativeDragImageEl"), 0);
    return true;
  }

  function removeRuntimeElement(rt, key) {
    removeElement(rt.domRefs[key]);
    rt.domRefs[key] = null;
  }

  function removeElement(element) {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }

  return {
    createAvatarTemplates: createAvatarTemplates,
    createDragAvatar: createDragAvatar,
    moveDragAvatar: moveDragAvatar,
    removeAvatarTemplates: removeAvatarTemplates,
    removeRuntimeElement: removeRuntimeElement,
    suppressNativeDragImage: suppressNativeDragImage
  };
});
