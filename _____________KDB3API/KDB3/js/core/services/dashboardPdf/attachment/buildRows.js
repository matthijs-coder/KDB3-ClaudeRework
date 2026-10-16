define([
  "../../../utils/kit/errors.js",
  "../config.js",
  "./filterRows.js",
  "./text.js"
], function (_errors, _config, _filterRows, _text) {
  "use strict";

  var METADATA_READ_FAILED = "DASHBOARD_PDF_ATTACHMENT_METADATA_READ_FAILED";
  var METADATA_KEYS = ["dataSteward", "dataspotLink", "environmentRegex", "updateCycle", "dataFreshness", "dataSource", "dataSourceLoading"];

  function readOutcomeFailureMessage(outcome, fallback) {
    var diagnostics = outcome && outcome.diagnostics;
    var first = Array.isArray(diagnostics) ? diagnostics[0] : null;
    if (first && first.message) return String(first.message);
    if (outcome && outcome.reason) return String(outcome.reason);
    return fallback;
  }

  /**
   * @returns {string|number|boolean|null} the dashboard's file name
   * @throws {Error} coded EXPORT_FAILED when the host facet cannot provide a plain value
   */
  function readDashboardFileName(dashboardFacet) {
    var unavailable = "Dashboard file name is unavailable.";
    if (!dashboardFacet || typeof dashboardFacet.getFileName !== "function") {
      throw _errors.codedError(_config.CODES.EXPORT_FAILED, unavailable);
    }
    var outcome = dashboardFacet.getFileName();
    if (!outcome || outcome.ok !== true) {
      throw _errors.codedError(_config.CODES.EXPORT_FAILED, readOutcomeFailureMessage(outcome, unavailable));
    }
    if (outcome.data != null && (typeof outcome.data === "object" || typeof outcome.data === "function")) {
      throw _errors.codedError(_config.CODES.EXPORT_FAILED, unavailable);
    }
    return outcome.data;
  }

  // Metadata is optional in the attachment: failures become warnings and the value falls back to null.
  function readDashboardMetadata(dashboardFacet, methodName, warnings) {
    try {
      if (!dashboardFacet || typeof dashboardFacet[methodName] !== "function") return null;
      var outcome = dashboardFacet[methodName]();
      if (outcome && outcome.ok === true) {
        var data = outcome.data;
        return data == null || typeof data === "object" || typeof data === "function" ? null : data;
      }
      warnings.push({ code: METADATA_READ_FAILED, message: methodName + " failed: " + readOutcomeFailureMessage(outcome, "unavailable") });
    } catch (error) {
      warnings.push({ code: METADATA_READ_FAILED, message: methodName + " failed: " + String(error && error.message ? error.message : error) });
    }
    return null;
  }

  function addWarning(warnings, code, message) {
    warnings.push({ code: code, message: message });
  }

  function normalizeRegexSource(regexText, warnings) {
    var source = String(regexText || "");
    var normalized = source.replace(/\\\\/g, "\\");
    if (normalized !== source) {
      addWarning(warnings, "DASHBOARD_PDF_ENVIRONMENT_REGEX_NORMALIZED", "environmentRegex contained a duplicated escape layer and was normalized.");
    }
    return normalized;
  }

  function resolveAttachmentEnvironment(config, source, warnings) {
    var regexText = config && config.environmentRegex;
    if (!regexText) return "UNKNOWN";
    var regex;
    try {
      regex = new RegExp(normalizeRegexSource(regexText, warnings));
    } catch (error) {
      addWarning(warnings, "DASHBOARD_PDF_ENVIRONMENT_REGEX_INVALID", "Invalid environmentRegex: " + String(error && error.message ? error.message : error));
      return "UNKNOWN";
    }
    var match = regex.exec(String(source || ""));
    if (!match) {
      addWarning(warnings, "DASHBOARD_PDF_ENVIRONMENT_UNRESOLVED", "environmentRegex did not match the environment URL.");
      return "UNKNOWN";
    }
    return match[1] && /^(dev|test)$/i.test(String(match[1])) ? String(match[1]).toUpperCase() : "PROD";
  }

  function pushMetadataWarnings(config, warnings) {
    var missing = METADATA_KEYS.filter(function (key) {
      return !config || config[key] == null || String(config[key]).trim() === "";
    });
    if (missing.length) {
      addWarning(warnings, "DASHBOARD_PDF_ATTACHMENT_METADATA_MISSING", "Attachment metadata is missing: " + missing.join(", ") + ".");
    }
  }

  function readOwnerState(ownerApi) {
    return (ownerApi && typeof ownerApi.getState === "function" ? ownerApi.getState() : null) || {};
  }

  function formatDate(date) {
    function pad(num) { return num < 10 ? "0" + String(num) : String(num); }
    return pad(date.getDate()) + "." + pad(date.getMonth() + 1) + "." + String(date.getFullYear());
  }

  /**
   * Builds the rows of the "Anhang" page: file name, filters, data-source info, system and steward.
   * @returns {Promise<Array<{kind: "data"|"section"|"spacer", label?: string, value?: string}>>}
   * @throws {Error} coded FILTER_PREPARATION_FAILED / SCOPE_TARGET_RESOLVE_FAILED
   */
  async function buildAttachmentRows(_KDB, manifest, warnings) {
    var config = (_KDB.properties && _KDB.properties.pdfAttachmentPageObj) || {};
    var dashboardFacet = _KDB.runtime.dashboardPdf.dashboardFacet;
    var dashboardVersion = readDashboardMetadata(dashboardFacet, "getDashboardVersion", warnings);
    var environmentSource = readDashboardMetadata(dashboardFacet, "getEnvironmentSource", warnings);
    var singleSelectState = await _filterRows.ensureFreshSingleSelectInventory(_KDB);
    var filterRows = await _filterRows.collectAttachmentFilterRows(_KDB, manifest, {
      sichtState: readOwnerState(_KDB.api && _KDB.api.sicht),
      dienststelleState: readOwnerState(_KDB.api && _KDB.api.dienststelle),
      specialState: readOwnerState(_KDB.api && _KDB.api.specialSingleSelect)
    }, singleSelectState, warnings);
    pushMetadataWarnings(config, warnings);
    if (!dashboardVersion) {
      addWarning(warnings, "DASHBOARD_PDF_DASHBOARD_VERSION_MISSING", "Dashboard version is unavailable.");
    }
    return [
      { kind: "data", label: "Dashboard-Name", value: _text.toDisplayText(manifest.fileName) },
      { kind: "spacer" },
      { kind: "section", label: "Filter:" },
      { kind: "data", label: "Globale Filter: ", value: filterRows.globalText }
    ].concat(filterRows.tabRows.map(function (row) {
      return { kind: "data", label: row.label, value: row.value || "" };
    })).concat([
      { kind: "spacer" },
      { kind: "section", label: "Daten-Quellen-Beladung " + _text.toDisplayText(config.dataSourceLoading) },
      { kind: "data", label: "Quelle: ", value: _text.toDisplayText(config.dataSource) },
      { kind: "data", label: "Datenaktualität: ", value: _text.toDisplayText(config.dataFreshness) },
      { kind: "data", label: "Aktualisierungszyklus: ", value: _text.toDisplayText(config.updateCycle) },
      { kind: "spacer" },
      { kind: "section", label: "Erweiterende Informationen", value: _text.toDisplayText(config.additionalInfo) },
      { kind: "data", label: "Verwendetes System: ", value: "Cognos Analytics " + _text.toDisplayText(dashboardVersion) },
      { kind: "data", label: "Umgebung", value: resolveAttachmentEnvironment(config, environmentSource, warnings) },
      { kind: "data", label: "Erstellungsdatum: ", value: formatDate(new Date()) },
      { kind: "data", label: "Kennzahlen: ", value: "siehe Dataspot: " + _text.toDisplayText(config.dataspotLink) },
      { kind: "data", label: "Data Steward", value: _text.toDisplayText(config.dataSteward) }
    ]);
  }

  return { buildAttachmentRows: buildAttachmentRows, readDashboardFileName: readDashboardFileName };
});
