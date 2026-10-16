define([
  "../config/columnCandidates.js"
], function (_columnCandidates) {
  "use strict";

  function __controller(_sampleRow, _treeConfig, _tableConfig) {
    const tableConfig = _tableConfig && typeof _tableConfig === "object" ? _tableConfig : {};

    return {
      code: resolveMappedColumnName(_sampleRow, tableConfig, "code", _columnCandidates.CODE_COLUMN_CANDIDATES),
      display: resolveMappedColumnName(
        _sampleRow,
        tableConfig,
        "kurztext",
        _columnCandidates.DISPLAY_COLUMN_CANDIDATES
      ),
      langtext: resolveColumnName(_sampleRow, _columnCandidates.LANGTEXT_COLUMN_CANDIDATES),
      pathText: resolveColumnName(_sampleRow, _columnCandidates.PATH_TEXT_COLUMN_CANDIDATES),
      release: resolveMappedColumnName(
        _sampleRow,
        tableConfig,
        "freigabe",
        _columnCandidates.RELEASE_COLUMN_CANDIDATES
      ),
      url: resolveColumnName(_sampleRow, _columnCandidates.URL_COLUMN_CANDIDATES),
      hardcoded: resolveHardcodedColumnName(_sampleRow, tableConfig),
      pathColumns: resolvePathColumns(_sampleRow, _treeConfig)
    };
  }

  function resolveMappedColumnName(_sampleRow, tableConfig, configKey, candidates) {
    const raw = tableConfig ? tableConfig[configKey] : undefined;
    if (raw != null && raw !== "") {
      const header = String(raw).trim();
      if (hasColumn(_sampleRow, header)) {
        return header;
      }
    }

    return resolveColumnName(_sampleRow, candidates);
  }

  function resolveHardcodedColumnName(_sampleRow, tableConfig) {
    const raw = tableConfig ? tableConfig.hardcoded : undefined;
    if (raw != null && raw !== "") {
      const header = String(raw).trim();
      if (hasColumn(_sampleRow, header)) {
        return header;
      }
    }

    return null;
  }

  function resolvePathColumns(_sampleRow, _treeConfig) {
    const configuredColumns =
      _treeConfig &&
      Array.isArray(_treeConfig.pathColumnNamesArr) &&
      _treeConfig.pathColumnNamesArr.length > 0
        ? _treeConfig.pathColumnNamesArr
        : _columnCandidates.DEFAULT_PATH_COLUMNS;
    const resolvedColumns = [];

    for (let index = 0; index < configuredColumns.length; index += 1) {
      if (hasColumn(_sampleRow, configuredColumns[index])) {
        resolvedColumns.push(configuredColumns[index]);
      }
    }

    return resolvedColumns;
  }

  function resolveColumnName(_sampleRow, candidates) {
    if (!_sampleRow) {
      return null;
    }

    for (let index = 0; index < candidates.length; index += 1) {
      if (hasColumn(_sampleRow, candidates[index])) {
        return candidates[index];
      }
    }

    return null;
  }

  function hasColumn(sampleRow, header) {
    return Boolean(sampleRow && Object.prototype.hasOwnProperty.call(sampleRow, header));
  }

  return __controller;
});
