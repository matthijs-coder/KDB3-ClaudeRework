define([
  "./config.js",
  "./view.js",
  "./textStyle.js",
  "./widgetRuntime.js"
], function (_config, _view, _textStyle, _widgetRuntime) {
  "use strict";

  var AUTOMATIC_ALIASES = ["", "default", "Default", "Automatic", "automatic", "auto"];

  function normalizeFontSizeValue(_value) {
    var raw = _value == null ? "" : String(_value).trim();
    if (AUTOMATIC_ALIASES.indexOf(raw) >= 0) {
      return { ok: true, isAutomatic: true, cognosValue: "auto", settingsValue: _config.automaticFontSize };
    }
    var match = /^([1-9][0-9]{0,2})(px)?$/.exec(raw.replace(/;$/, ""));
    if (!match) {
      return { ok: false, errorCode: "WIDGET_TEXT_FONT_VALUE_INVALID" };
    }
    return {
      ok: true,
      isAutomatic: false,
      pixelValue: match[1],
      cssValue: match[1] + "px",
      cognosValue: match[1],
      settingsValue: match[1] + "px"
    };
  }

  // Cognos re-fits automatic text on window resize, so the refit dispatches a global resize event.
  function forceTextDomReflow(_widgetId, _nodes) {
    var nodes = _nodes && _nodes.editableEl ? _nodes : _view.resolveEditableNodes(_widgetId, null);
    var editableEl = nodes && nodes.editableEl ? nodes.editableEl : null;
    if (!editableEl) {
      return { ok: false, errorCode: "WIDGET_TEXT_REFLOW_TARGET_MISSING" };
    }
    editableEl.classList.add(_config.textFittedClass);
    var previousDisplay = editableEl.style.display;
    editableEl.style.display = "none";
    void editableEl.offsetHeight;
    editableEl.style.display = previousDisplay;
    void editableEl.offsetHeight;
    window.dispatchEvent(new Event("resize"));
    return { ok: true, target: "editable" };
  }

  // The reflow only nudges Cognos to re-fit; a failure must not fail the font change.
  function tryReflow(_widgetId, _nodes) {
    try {
      return forceTextDomReflow(_widgetId, _nodes);
    } catch (err) {
      console.error("[widgetText.forceTextDomReflow] failed", { widgetId: _widgetId }, err);
      return { ok: false, errorCode: "WIDGET_TEXT_REFLOW_FAILED", errorMessage: String(err && err.message ? err.message : err) };
    }
  }

  function targetTag(_nodes) {
    if (_nodes.spanEl) {
      return "span";
    }
    return _nodes.paragraphEl ? "paragraph" : "editable";
  }

  function clearInlineFontSize(_nodes) {
    [_nodes.textNodeForFont, _nodes.spanEl, _nodes.paragraphEl, _nodes.editableEl].forEach(function (node) {
      if (node && node.style) {
        node.style.fontSize = "";
      }
    });
  }

  function ensureTextFittedSpan(_nodes) {
    if (_nodes.spanEl && _nodes.spanEl.classList) {
      _nodes.spanEl.classList.add(_config.textFittedClass);
      return;
    }
    var spans = _nodes.editableEl ? _nodes.editableEl.querySelectorAll("span") : [];
    for (var index = 0; index < spans.length; index += 1) {
      spans[index].classList.add(_config.textFittedClass);
    }
  }

  function applyFontSizeToDom(_KDB, _widgetId, _nodes, _normalized) {
    var runtime = _widgetRuntime.ensureWidgetRuntime(_KDB, _widgetId);
    clearInlineFontSize(_nodes);
    if (_normalized.isAutomatic) {
      _textStyle.removeFixedFontSize(_KDB, _widgetId);
      _nodes.textNodeForFont.style.fontSize = "";
      runtime.fontSize = _config.automaticFontSize;
      var reflowResult = tryReflow(_widgetId, _nodes);
      return {
        ok: true,
        appliedValue: _config.automaticFontSize,
        diagnostics: {
          target: targetTag(_nodes),
          responsive: true,
          cognosFontSize: _normalized.cognosValue,
          reflow: reflowResult.ok === true
        },
        settingsValue: _config.automaticFontSize
      };
    }
    ensureTextFittedSpan(_nodes);
    _textStyle.applyFixedFontSize(_KDB, _widgetId, _normalized.pixelValue);
    runtime.fontSize = _normalized.settingsValue;
    return {
      ok: true,
      appliedValue: _normalized.settingsValue,
      diagnostics: {
        target: targetTag(_nodes),
        responsive: false,
        cognosFontSize: _normalized.cognosValue,
        cssFontSize: _normalized.cssValue
      },
      settingsValue: _normalized.settingsValue
    };
  }

  async function writeHostFontSize(_KDB, _widgetId, _cognosValue) {
    var facet = _widgetRuntime.readRuntimeRoot(_KDB).widgetsFacet;
    if (!facet || typeof facet.setWidgetProperty !== "function") {
      return;
    }
    try {
      var outcome = await facet.setWidgetProperty(_widgetId, "fontSize", _cognosValue);
      if (outcome && outcome.ok !== true && outcome.errorCode === "WIDGETS_WRITE_FAILED") {
        console.warn("[widgetText.applyFontSize] Cognos fontSize apply failed", _widgetId, outcome);
      }
    } catch (err) {
      console.warn("[widgetText.applyFontSize] Cognos fontSize apply failed", _widgetId, err);
    }
  }

  async function applyFontSize(_KDB, _widgetId, _nodes, _fontSizeValue) {
    var normalized = normalizeFontSizeValue(_fontSizeValue);
    if (!normalized.ok) {
      return normalized;
    }
    if (!_nodes || !_nodes.textNodeForFont) {
      return { ok: false, errorCode: "WIDGET_TEXT_FONT_TARGET_MISSING" };
    }
    await writeHostFontSize(_KDB, _widgetId, normalized.cognosValue);
    return applyFontSizeToDom(_KDB, _widgetId, _nodes, normalized);
  }

  return {
    applyFontSize: applyFontSize
  };
});
