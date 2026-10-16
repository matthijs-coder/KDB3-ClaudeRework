define([
  "../config/defaults.js",
  "../runtime/ensureWidgetRuntime.js",
  "../effects/manageScopedTextFontStyle.js",
  "./forceTextDomReflow.js",
  "../config/normalizeFontSizeValue.js"
], function (_defaults, _ensureWidgetRuntime, _manageScopedTextFontStyle, _forceTextDomReflow, _normalizeFontSizeValue) {
  function __controller(_KDB, _widgetId, _nodes, _fontSizeValue, _options) {
    try {
      var normalized = _normalizeFontSizeValue(_fontSizeValue);
      if (!normalized.ok) {
        return normalized;
      }
      var runtime = _ensureWidgetRuntime(_KDB, _widgetId);
      var target = _nodes && _nodes.textNodeForFont ? _nodes.textNodeForFont : null;
      if (!target) {
        return { ok: false, errorCode: "WIDGET_TEXT_FONT_TARGET_MISSING" };
      }
      clearInlineFontSize(_nodes);
      if (normalized.isAutomatic) {
        _manageScopedTextFontStyle.removeFixedFontSize(_KDB, _widgetId);
        target.style.fontSize = "";
        runtime.fontSize = _defaults.automaticFontSize;
        var reflowResult = _forceTextDomReflow(_KDB, _widgetId, _nodes);
        return {
          ok: true,
          appliedValue: _defaults.automaticFontSize,
          diagnostics: {
            target: targetTag(_nodes),
            responsive: true,
            cognosFontSize: normalized.cognosValue,
            reflow: reflowResult.ok === true
          },
          settingsValue: _defaults.automaticFontSize
        };
      }
      ensureTextFittedSpan(_nodes);
      _manageScopedTextFontStyle.applyFixedFontSize(_KDB, _widgetId, normalized.pixelValue);
      runtime.fontSize = normalized.settingsValue;
      return {
        ok: true,
        appliedValue: normalized.settingsValue,
        diagnostics: {
          target: targetTag(_nodes),
          responsive: false,
          cognosFontSize: normalized.cognosValue,
          cssFontSize: normalized.cssValue
        },
        settingsValue: normalized.settingsValue
      };
    } catch (err) {
      console.error("[widgetText.applyTextFontSize] failed", { widgetId: _widgetId }, err);
      return { ok: false, errorCode: "WIDGET_TEXT_FONT_APPLY_FAILED", errorMessage: String(err && err.message ? err.message : err) };
    }
  }

  function targetTag(_nodes) {
    if (_nodes.spanEl) {
      return "span";
    }
    if (_nodes.paragraphEl) {
      return "paragraph";
    }
    return "editable";
  }

  function clearInlineFontSize(_nodes) {
    var candidates = [
      _nodes && _nodes.textNodeForFont,
      _nodes && _nodes.spanEl,
      _nodes && _nodes.paragraphEl,
      _nodes && _nodes.editableEl
    ];
    candidates.forEach(function (node) {
      if (node && node.style) {
        node.style.fontSize = "";
      }
    });
  }

  function ensureTextFittedSpan(_nodes) {
    if (_nodes && _nodes.spanEl && _nodes.spanEl.classList) {
      _nodes.spanEl.classList.add(_defaults.textFittedClass);
      return;
    }
    var spans = _nodes && _nodes.editableEl ? _nodes.editableEl.querySelectorAll("span") : [];
    for (var index = 0; index < spans.length; index += 1) {
      if (spans[index].classList) {
        spans[index].classList.add(_defaults.textFittedClass);
      }
    }
  }

  return __controller;
});
