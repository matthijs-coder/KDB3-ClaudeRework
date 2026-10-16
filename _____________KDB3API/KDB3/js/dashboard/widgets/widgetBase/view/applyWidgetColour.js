define([
  "./resolveWidgetShell.js",
  "./resolveEffectiveColour.js",
  "./syncTextHeaderColourClass.js"
], function (_resolveWidgetShellModule, _resolveEffectiveColour, _syncTextHeaderColourClass) {
  const _resolveWidgetShell = _resolveWidgetShellModule.resolveWidgetShell;

  function applyWidgetColour(_KDB, _widgetId, _input) {
    return Promise.resolve(applyColourSync(_KDB, _widgetId, _input || {}));
  }

  function applyColourSync(_KDB, widgetId, input) {
    const optionValue = input.optionValue != null ? input.optionValue : input.toColour;
    const shellEl = _resolveWidgetShell(_KDB, widgetId);
    if (!shellEl) {
      return { ok: false, colour: optionValue, errorCode: "WIDGET_BASE_DROP_FAILED", errorMessage: "Widget shell unavailable for colour update." };
    }
    const effectiveColour = _resolveEffectiveColour(_KDB, optionValue, shellEl);
    if (!effectiveColour) {
      return { ok: false, colour: optionValue, errorCode: "WIDGET_BASE_DROP_FAILED", errorMessage: "Colour value could not be resolved." };
    }
    try {
      shellEl.style.backgroundColor = effectiveColour;
      if (_syncTextHeaderColourClass.isTextWidget(input.widgetType, shellEl)) {
        _syncTextHeaderColourClass.syncTextHeaderColourClass(shellEl);
      }
      return { ok: true, colour: effectiveColour };
    } catch (err) {
      console.error("[widgetBase.applyWidgetColour] colour effect failed", widgetId, err);
      return { ok: false, colour: effectiveColour, errorCode: "WIDGET_BASE_DROP_FAILED", errorMessage: String(err && err.message ? err.message : err) };
    }
  }

  return applyWidgetColour;
});
