define([
  "../config/defaults.js"
], function (_defaults) {
  "use strict";

  function __controller(_runtime, _sourceEl, _draggedElementType, _session) {
    const sourceEl = _sourceEl || null;
    const avatarEl = createAvatarEl(_runtime, sourceEl, _draggedElementType, _session || {});

    removeRuntimeElement(_runtime, "sourceCopyEl");
    removeRuntimeElement(_runtime, "avatarEl");
    _runtime.domRefs.sourceCopyEl = buildHiddenSourceCopy(_runtime, sourceEl);
    _runtime.domRefs.avatarEl = avatarEl;
    _runtime.sourceRuntime = {
      draggedElementType: _draggedElementType,
      sourceEl: sourceEl
    };
    markActiveSource(_runtime, sourceEl);
    document.body.appendChild(avatarEl);
    return {
      avatarEl: avatarEl,
      copyId: _runtime.domRefs.sourceCopyEl ? _runtime.domRefs.sourceCopyEl.id : null
    };
  }

  function createAvatarEl(_runtime, sourceEl, draggedElementType, session) {
    const templateEl = resolveTemplateEl(_runtime, draggedElementType);
    const avatarEl = templateEl && typeof templateEl.cloneNode === "function"
      ? templateEl.cloneNode(true)
      : cloneSourceOrFallback(sourceEl);

    avatarEl.removeAttribute("id");
    avatarEl.classList.add(_defaults.classNames.avatarClone);
    avatarEl.style.position = "fixed";
    avatarEl.style.pointerEvents = "none";
    avatarEl.style.zIndex = "9999";
    avatarEl.style.opacity = "0.95";
    avatarEl.style.width = Math.round(session.defaultWidth || 300) + "px";
    avatarEl.style.height = Math.round(session.defaultHeight || 300) + "px";
    avatarEl.style.maxWidth = "none";
    avatarEl.style.maxHeight = "none";
    avatarEl.style.transformOrigin = "top left";
    avatarEl.style.transform = "scale(" + String(session.scaleX || 1) + ", " + String(session.scaleY || 1) + ")";
    return avatarEl;
  }

  function resolveTemplateEl(_runtime, draggedElementType) {
    const templateKey = draggedElementType === "text" ? "text" : "visualization";
    const templates = _runtime && _runtime.domRefs ? _runtime.domRefs.avatarTemplates : null;
    const templateInfo = templates ? templates[templateKey] : null;
    return templateInfo ? templateInfo.templateEl : null;
  }

  function cloneSourceOrFallback(sourceEl) {
    if (sourceEl && typeof sourceEl.cloneNode === "function") {
      return sourceEl.cloneNode(true);
    }
    return document.createElement("div");
  }

  function buildHiddenSourceCopy(_runtime, sourceEl) {
    const hideSpotEl = _runtime && _runtime.domRefs ? _runtime.domRefs.hideSpotEl : null;
    let copyEl;

    if (!hideSpotEl || !sourceEl || typeof sourceEl.cloneNode !== "function") {
      return null;
    }
    copyEl = sourceEl.cloneNode(false);
    copyEl.removeAttribute("id");
    copyEl.id = String(sourceEl.getAttribute("code") || sourceEl.id || "item") + "_copy_" + Date.now();
    copyEl.classList.add(_defaults.classNames.itemCopy);
    copyEl.classList.remove(_defaults.classNames.itemOriginal);
    hideSpotEl.appendChild(copyEl);
    return copyEl;
  }

  function markActiveSource(_runtime, sourceEl) {
    const markedEls = [];
    const treeNodeEl = sourceEl && sourceEl.closest ? sourceEl.closest(".jstree-node") : null;

    if (sourceEl && sourceEl.classList) {
      sourceEl.classList.add(_defaults.classNames.activeSource);
      markedEls.push(sourceEl);
    }
    if (treeNodeEl && treeNodeEl.classList) {
      treeNodeEl.classList.add(_defaults.classNames.activeSource);
      markedEls.push(treeNodeEl);
    }
    _runtime.domRefs.sourceMarkedEls = markedEls;
  }

  function removeRuntimeElement(_runtime, key) {
    const element = _runtime && _runtime.domRefs ? _runtime.domRefs[key] : null;

    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
    if (_runtime && _runtime.domRefs) {
      _runtime.domRefs[key] = null;
    }
  }

  return __controller;
});
