define([
  "./collectAttachmentFilterRows.js",
  "./sanitizeAttachmentText.js",
  "./resolveAttachmentEnvironment.js",
  "./attachmentFilterInstanceSupport.js"
], function (_collectAttachmentFilterRows, _sanitizeAttachmentText, _resolveAttachmentEnvironment, _instanceSupport) {
  "use strict";

  function readState(_ownerApi) {
    return _ownerApi && typeof _ownerApi.getState === "function" ? _ownerApi.getState() : null;
  }

  function readDashboardFacet(_KDB) {
    var runtime = _KDB && _KDB.runtime ? _KDB.runtime.dashboardPdf : null;
    return runtime && runtime.dashboardFacet ? runtime.dashboardFacet : null;
  }

  function readOutcomeFailureMessage(_outcome) {
    var diagnostics = _outcome && _outcome.diagnostics;
    var first = Array.isArray(diagnostics) ? diagnostics[0] : null;
    if (first && first.message) return String(first.message);
    if (_outcome && _outcome.reason) return String(_outcome.reason);
    return "unavailable";
  }

  function readDashboardMetadata(_dashboardFacet, _methodName, _warnings) {
    try {
      var outcome;
      var data;
      if (!_dashboardFacet || typeof _dashboardFacet[_methodName] !== "function") {
        return null;
      }
      outcome = _dashboardFacet[_methodName]();
      if (outcome && outcome.ok === true) {
        data = outcome.data;
        if (data != null && (typeof data === "object" || typeof data === "function")) {
          return null;
        }
        return data == null ? null : data;
      }
      _warnings.push({
        code: "DASHBOARD_PDF_ATTACHMENT_METADATA_READ_FAILED",
        message: _methodName + " failed: " + readOutcomeFailureMessage(outcome)
      });
      return null;
    } catch (error) {
      _warnings.push({
        code: "DASHBOARD_PDF_ATTACHMENT_METADATA_READ_FAILED",
        message: _methodName + " failed: " + String(error && error.message ? error.message : error)
      });
      return null;
    }
  }

  function toText(_value) {
    return _sanitizeAttachmentText.toDisplayText(_value);
  }

  function formatDate(_dateObj) {
    function pad(_num) { return _num < 10 ? "0" + String(_num) : String(_num); }
    return pad(_dateObj.getDate()) + "." + pad(_dateObj.getMonth() + 1) + "." + String(_dateObj.getFullYear());
  }

  function pushMetadataWarnings(_config, _warnings) {
    var keys = ["dataSteward", "dataspotLink", "environmentRegex", "updateCycle", "dataFreshness", "dataSource", "dataSourceLoading"];
    var missing = keys.filter(function (key) {
      return !_config || _config[key] == null || String(_config[key]).trim() === "";
    });
    if (missing.length) {
      _warnings.push({
        code: "DASHBOARD_PDF_ATTACHMENT_METADATA_MISSING",
        message: "Attachment metadata is missing: " + missing.join(", ") + "."
      });
    }
  }

  async function buildAttachmentRows(_KDB, _manifest, _warnings) {
    var config = (_KDB.properties && _KDB.properties.pdfAttachmentPageObj) || {};
    var sichtState;
    var dienststelleState;
    var specialSingleSelectState;
    var dashboardFacet = readDashboardFacet(_KDB);
    var dashboardVersion = readDashboardMetadata(dashboardFacet, "getDashboardVersion", _warnings);
    var environmentSource = readDashboardMetadata(dashboardFacet, "getEnvironmentSource", _warnings);
    await _instanceSupport.ensureFreshSingleSelectInventory(_KDB);
    sichtState = readState(_KDB.api && _KDB.api.sicht) || {};
    dienststelleState = readState(_KDB.api && _KDB.api.dienststelle) || {};
    specialSingleSelectState = readState(_KDB.api && _KDB.api.specialSingleSelect) || {};
    var filterRows = await _collectAttachmentFilterRows(_KDB, _manifest, {
      sichtState: sichtState,
      dienststelleState: dienststelleState,
      specialState: specialSingleSelectState
    }, _warnings);
    var now = new Date();
    var rows;
    pushMetadataWarnings(config, _warnings);
    if (!dashboardVersion) {
      _warnings.push({ code: "DASHBOARD_PDF_DASHBOARD_VERSION_MISSING", message: "Dashboard version is unavailable." });
    }
    rows = [
      { kind: "data", label: "Dashboard-Name", value: toText(_manifest.fileName) },
      { kind: "spacer" },
      { kind: "section", label: "Filter:" },
      { kind: "data", label: "Globale Filter: ", value: filterRows.globalText }
    ].concat(filterRows.tabRows.map(function (row) {
      return { kind: "data", label: row.label, value: row.value || "" };
    })).concat([
      { kind: "spacer" },
      { kind: "section", label: "Daten-Quellen-Beladung " + toText(config.dataSourceLoading) },
      { kind: "data", label: "Quelle: ", value: toText(config.dataSource) },
      { kind: "data", label: "Datenaktualität: ", value: toText(config.dataFreshness) },
      { kind: "data", label: "Aktualisierungszyklus: ", value: toText(config.updateCycle) },
      { kind: "spacer" },
      { kind: "section", label: "Erweiterende Informationen", value: toText(config.additionalInfo) },
      { kind: "data", label: "Verwendetes System: ", value: "Cognos Analytics " + toText(dashboardVersion) },
      { kind: "data", label: "Umgebung", value: _resolveAttachmentEnvironment(config, environmentSource, _warnings) },
      { kind: "data", label: "Erstellungsdatum: ", value: formatDate(now) },
      { kind: "data", label: "Kennzahlen: ", value: "siehe Dataspot: " + toText(config.dataspotLink) },
      { kind: "data", label: "Data Steward", value: toText(config.dataSteward) }
    ]);
    return rows;
  }

  return buildAttachmentRows;
});
