define([], function () {
  "use strict";

  function addWarning(_warnings, _code, _message) {
    _warnings.push({ code: _code, message: _message });
  }

  function normalizeRegexSource(_regexText, _warnings) {
    var source = String(_regexText || "");
    var normalized = source.replace(/\\\\/g, "\\");
    if (normalized !== source) {
      addWarning(
        _warnings,
        "DASHBOARD_PDF_ENVIRONMENT_REGEX_NORMALIZED",
        "environmentRegex contained a duplicated escape layer and was normalized."
      );
    }
    return normalized;
  }

  function resolveAttachmentEnvironment(_config, _source, _warnings) {
    var regexText = _config && _config.environmentRegex;
    var regex;
    var match;
    if (!regexText) return "UNKNOWN";
    try {
      regex = new RegExp(normalizeRegexSource(regexText, _warnings));
    } catch (error) {
      addWarning(
        _warnings,
        "DASHBOARD_PDF_ENVIRONMENT_REGEX_INVALID",
        "Invalid environmentRegex: " + String(error && error.message ? error.message : error)
      );
      return "UNKNOWN";
    }
    match = regex.exec(String(_source || ""));
    if (!match) {
      addWarning(
        _warnings,
        "DASHBOARD_PDF_ENVIRONMENT_UNRESOLVED",
        "environmentRegex did not match the environment URL."
      );
      return "UNKNOWN";
    }
    return match[1] && /^(dev|test)$/i.test(String(match[1]))
      ? String(match[1]).toUpperCase()
      : "PROD";
  }

  return resolveAttachmentEnvironment;
});
