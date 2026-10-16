define(["./config.js"], function (_config) {
  "use strict";

  function resolveWidgetShell(_widgetId) {
    return _widgetId ? document.getElementById(_widgetId) : null;
  }

  function resolveEditableNodes(_widgetId, _shellEl) {
    var shellEl = _shellEl || resolveWidgetShell(_widgetId);
    if (!shellEl) {
      return null;
    }
    var contentEl = shellEl.querySelector(_config.contentWrapperSelector) || shellEl;
    var editableEl = contentEl.querySelector(_config.textFillSelector + " " + _config.editableSelector)
      || contentEl.querySelector(_config.editableSelector)
      || document.getElementById(_widgetId + "Editable");
    if (editableEl && !shellEl.contains(editableEl)) {
      editableEl = null;
    }
    var paragraphEl = editableEl ? editableEl.querySelector("p") : null;
    var spanEl = editableEl ? editableEl.querySelector("span") : null;
    return {
      shellEl: shellEl,
      contentEl: contentEl,
      editableEl: editableEl,
      paragraphEl: paragraphEl,
      spanEl: spanEl,
      textNodeForFont: spanEl || paragraphEl || editableEl
    };
  }

  function buildTextContentDom(_initialText) {
    var text = _initialText != null ? String(_initialText) : _config.defaultText;
    var staticContent = document.createElement("div");
    staticContent.className = _config.staticContentClass;
    var textFill = document.createElement("div");
    textFill.className = _config.textFillClass;
    var editable = document.createElement("div");
    editable.className = _config.editableClass;
    var paragraph = document.createElement("p");
    var span = document.createElement("span");
    span.textContent = text;
    paragraph.appendChild(span);
    editable.appendChild(paragraph);
    textFill.appendChild(editable);
    staticContent.appendChild(textFill);
    return staticContent;
  }

  function placeTextContentDom(_widgetId, _shellEl, _contentEl) {
    if (!_shellEl || !_contentEl) {
      return null;
    }
    var mountTarget = _shellEl.querySelector(_config.contentWrapperSelector) || _shellEl;
    if (!mountTarget.querySelector(_config.staticContentSelector)) {
      mountTarget.appendChild(_contentEl);
    }
    return resolveEditableNodes(_widgetId, _shellEl);
  }

  function syncTextContentDom(_nodes, _text) {
    if (!_nodes) {
      return "";
    }
    var text = _text != null ? String(_text) : "";
    if (_nodes.paragraphEl && _nodes.spanEl) {
      _nodes.spanEl.textContent = text;
    } else if (_nodes.paragraphEl) {
      _nodes.paragraphEl.textContent = text;
    } else if (_nodes.editableEl) {
      _nodes.editableEl.textContent = text;
    } else {
      return "";
    }
    return text;
  }

  function normalizeRestyleValue(_value) {
    var restyle = _config.restyle;
    var raw = _value == null ? "" : String(_value).trim();
    if (!raw || raw === "default" || raw === "reinigen") {
      return { ok: true, appliedClass: raw === "default" ? restyle.defaultClass : null, settingsValue: raw || "default" };
    }
    if (raw === restyle.defaultClass) {
      return { ok: true, appliedClass: restyle.defaultClass, settingsValue: "default" };
    }
    if (restyle.knownHeaderClasses.indexOf(raw) >= 0) {
      return { ok: true, appliedClass: raw, settingsValue: raw };
    }
    var mapped = restyle.optionKeyToClass[raw.toLowerCase()] || restyle.optionKeyToClass[raw];
    if (mapped === null) {
      return { ok: true, appliedClass: null, settingsValue: raw };
    }
    if (mapped) {
      return { ok: true, appliedClass: mapped, settingsValue: raw };
    }
    return { ok: false, errorCode: "WIDGET_TEXT_RESTYLE_VALUE_INVALID" };
  }

  function removeKnownHeaderClasses(_shellEl) {
    return _config.restyle.knownHeaderClasses.filter(function (className) {
      if (!_shellEl.classList.contains(className)) {
        return false;
      }
      _shellEl.classList.remove(className);
      return true;
    });
  }

  function applyRestyle(_shellEl, _restyleValue) {
    var normalized = normalizeRestyleValue(_restyleValue);
    if (!normalized.ok) {
      return normalized;
    }
    var cleared = removeKnownHeaderClasses(_shellEl);
    if (normalized.appliedClass) {
      _shellEl.classList.add(normalized.appliedClass);
    }
    return {
      ok: true,
      appliedClass: normalized.appliedClass || null,
      settingsValue: normalized.settingsValue,
      diagnostics: { clearedClasses: cleared, appliedClass: normalized.appliedClass || null }
    };
  }

  return {
    resolveWidgetShell: resolveWidgetShell,
    resolveEditableNodes: resolveEditableNodes,
    buildTextContentDom: buildTextContentDom,
    placeTextContentDom: placeTextContentDom,
    syncTextContentDom: syncTextContentDom,
    applyRestyle: applyRestyle
  };
});
