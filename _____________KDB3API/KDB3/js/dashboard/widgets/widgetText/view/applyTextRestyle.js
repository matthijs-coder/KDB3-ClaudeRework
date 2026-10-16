define(["../config/restyleClasses.js"], function (_restyleClasses) {
  function __controller(_KDB, _widgetId, _shellEl, _restyleValue) {
    try {
      if (!_shellEl) {
        return { ok: false, errorCode: "WIDGET_TEXT_RESTYLE_TARGET_MISSING" };
      }
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
        diagnostics: {
          clearedClasses: cleared,
          appliedClass: normalized.appliedClass || null
        }
      };
    } catch (err) {
      console.error("[widgetText.applyTextRestyle] failed", { widgetId: _widgetId }, err);
      return { ok: false, errorCode: "WIDGET_TEXT_RESTYLE_APPLY_FAILED", errorMessage: String(err && err.message ? err.message : err) };
    }
  }

  function normalizeRestyleValue(_value) {
    var raw = _value == null ? "" : String(_value).trim();
    if (!raw || raw === "default" || raw === "reinigen") {
      return { ok: true, appliedClass: raw === "default" ? _restyleClasses.defaultClass : null, settingsValue: raw || "default" };
    }
    if (raw === _restyleClasses.defaultClass) {
      return { ok: true, appliedClass: _restyleClasses.defaultClass, settingsValue: "default" };
    }
    if (_restyleClasses.knownHeaderClasses.indexOf(raw) >= 0) {
      return { ok: true, appliedClass: raw, settingsValue: raw };
    }
    var mapped = _restyleClasses.optionKeyToClass[raw.toLowerCase()] || _restyleClasses.optionKeyToClass[raw];
    if (mapped === null) {
      return { ok: true, appliedClass: null, settingsValue: raw };
    }
    if (mapped) {
      return { ok: true, appliedClass: mapped, settingsValue: raw };
    }
    return { ok: false, errorCode: "WIDGET_TEXT_RESTYLE_VALUE_INVALID" };
  }

  function removeKnownHeaderClasses(_shellEl) {
    var cleared = [];
    _restyleClasses.knownHeaderClasses.forEach(function (className) {
      if (_shellEl.classList.contains(className)) {
        _shellEl.classList.remove(className);
        cleared.push(className);
      }
    });
    return cleared;
  }

  return __controller;
});
