define(["./config.js"], function (_config) {
  "use strict";

  function buildMetricsTreeSources(_KDB, _sourceInput) {
    if (!_sourceInput || !Array.isArray(_sourceInput.rows)) {
      return { bySource: {}, sourceOrder: [], hasRenderableData: false };
    }

    const sourceKeys = resolveRelevantSources(_KDB, _sourceInput);
    const bySource = {};
    const renderableSourceOrder = [];

    for (let index = 0; index < sourceKeys.length; index += 1) {
      const sourceKey = sourceKeys[index];
      const sourceEntry = buildSourceEntry(_KDB, sourceKey, _sourceInput);

      bySource[sourceKey] = sourceEntry;
      if (sourceEntry.hasRenderableData) {
        renderableSourceOrder.push(sourceKey);
      }
    }

    return {
      bySource: bySource,
      sourceOrder: renderableSourceOrder,
      hasRenderableData: renderableSourceOrder.length > 0
    };
  }

  function resolveRelevantSources(_KDB, sourceInput) {
    if (sourceInput.sourceKey) {
      return [sourceInput.sourceKey];
    }

    const tableProperties = readObjectPath(_KDB, ["properties", "metricsTablesPropObj"]);
    return tableProperties ? Object.keys(tableProperties) : [];
  }

  function buildSourceEntry(_KDB, sourceKey, sourceInput) {
    const rows = sourceInput.rows;
    const sourceName = sourceInput.tableName ? sourceInput.tableName : sourceKey;
    const treeConfig = readTreeConfig(_KDB, sourceKey, sourceName);
    const tableConfig = readTableConfig(_KDB, sourceKey, sourceName, sourceInput);
    const nodes = buildMetricsTreeNodes(rows, treeConfig, tableConfig, sourceKey, !!sourceInput.isSuperUserAllowed);

    return {
      sourceKey: sourceKey,
      title: sourceName,
      rowCount: rows.length,
      nodes: nodes,
      hasRenderableData: nodes.length > 0,
      treeConfig: treeConfig,
      dataShape: rows[0] ? Object.keys(rows[0]) : []
    };
  }

  function readTreeConfig(_KDB, sourceKey, sourceName) {
    const treeProperties = readObjectPath(_KDB, ["properties", "metricsTreePropObj"]);
    if (!treeProperties) { return {}; }
    return treeProperties[sourceKey] || treeProperties[sourceName] || {};
  }

  function readTableConfig(_KDB, sourceKey, sourceName, sourceInput) {
    const tableProperties = readObjectPath(_KDB, ["properties", "metricsTablesPropObj"]);
    if (tableProperties && (tableProperties[sourceKey] || tableProperties[sourceName])) {
      return tableProperties[sourceKey] || tableProperties[sourceName];
    }
    return sourceInput.tableConfigObject ? sourceInput.tableConfigObject : {};
  }

  function readObjectPath(root, path) {
    let cursor = root;
    for (let index = 0; index < path.length; index += 1) {
      if (!cursor || typeof cursor !== "object") {
        return null;
      }
      cursor = cursor[path[index]];
    }

    return cursor && typeof cursor === "object" ? cursor : null;
  }

  function buildMetricsTreeNodes(_rows, _treeConfig, _tableConfig, _sourceKey, _isSuperUserAllowed) {
    if (!Array.isArray(_rows) || _rows.length === 0) {
      return [];
    }

    const columns = resolveMetricsColumns(_rows[0], _treeConfig, _tableConfig);
    const groupNodesById = {};
    const leafNodes = [];

    for (let index = 0; index < _rows.length; index += 1) {
      const row = _rows[index];
      if (!rowPassesFreigabe(row, columns.release, _isSuperUserAllowed)) {
        continue;
      }

      const code = resolveCode(row, columns, index);
      if (!code) {
        continue;
      }

      const parentId = buildGroupNodes(row, columns, _sourceKey, groupNodesById);
      leafNodes.push(buildLeafNode(row, columns, _sourceKey, code, parentId));
    }

    return Object.keys(groupNodesById).map(function (id) {
      return groupNodesById[id];
    }).concat(leafNodes);
  }

  function buildGroupNodes(row, columns, sourceKey, groupNodesById) {
    const pathTextParts = splitPathText(row[columns.pathText]?.display ?? "");
    let parentId = "#";
    const pathTrail = [];

    for (let index = 0; index < columns.pathColumns.length; index += 1) {
      const pathValue = row[columns.pathColumns[index]]?.display ?? "";
      if (!pathValue) {
        continue;
      }

      pathTrail.push(String(pathValue));
      const groupId = "group:" + sourceKey + ":" + pathTrail.join(">");
      if (!groupNodesById[groupId]) {
        groupNodesById[groupId] = {
          id: groupId,
          parent: parentId,
          text: pathTextParts[index] || String(pathValue),
          li_attr: {
            "data-parent": "1"
          },
          a_attr: {
            draggable: "false"
          }
        };
      }
      parentId = groupId;
    }

    return parentId;
  }

  function rowPassesFreigabe(row, releaseColumn, _isSuperUserAllowed) {
    if (!releaseColumn || !row) {
      return true;
    }

    const releaseRaw = readTrimmed(row, releaseColumn);
    if (!releaseRaw) {
      return true;
    }

    const freigabe = parseInt(releaseRaw, 10);
    if (isNaN(freigabe)) {
      return true;
    }
    return _isSuperUserAllowed === true || Boolean(freigabe);
  }

  function resolveCode(row, columns, index) {
    const codeValue = columns.code ? row[columns.code]?.display ?? "" : "";
    const displayValue = columns.display ? row[columns.display]?.display ?? "" : "";
    const langtextValue = columns.langtext ? row[columns.langtext]?.display ?? "" : "";
    return String(codeValue || displayValue || langtextValue || "kennzahl_" + index);
  }

  function splitPathText(pathText) {
    return pathText ? String(pathText).split("/") : [];
  }

  function buildLeafNode(_row, _columns, _sourceKey, _code, _parentId) {
    const fullText = resolveLangtext(_row, _code, _columns);
    const display = resolveDisplayText(_row, _code, _columns);
    const url = readTrimmed(_row, _columns.url);

    return {
      id: String(_code) + "_node",
      parent: _parentId,
      text: display,
      a_attr: {
        id: _code,
        class: "hasTooltip item itemOriginal",
        code: _code,
        display: display,
        langtext: fullText,
        title: fullText,
        "data-url": url,
        metricsTable: _sourceKey,
        draggType: "visualization",
        draggedElementType: "visualization",
        draggable: "true"
      }
    };
  }

  function resolveLangtext(row, code, columns) {
    const langtextValue = columns.langtext ? row[columns.langtext]?.display ?? "" : "";
    if (langtextValue != null && String(langtextValue).trim() !== "") {
      return String(langtextValue).trim();
    }

    const hardRaw = readTrimmed(row, columns.hardcoded);
    const displayRaw = readTrimmed(row, columns.display);
    const textPart = hardRaw || displayRaw || String(code);
    return String(code) + ": " + textPart + (isBetaRelease(row, columns.release) ? " (Beta)" : "");
  }

  function resolveDisplayText(row, code, columns) {
    const hardRaw = readTrimmed(row, columns.hardcoded);
    const displayRaw = readTrimmed(row, columns.display);
    const langtextRaw = readTrimmed(row, columns.langtext);
    return hardRaw || displayRaw || (langtextRaw ? getTextAfterColon(langtextRaw) : String(code));
  }

  function readTrimmed(row, columnName) {
    return columnName && row[columnName] != null ? String(row[columnName]?.display ?? "").trim() : "";
  }

  function isBetaRelease(row, releaseColumn) {
    const releaseRaw = readTrimmed(row, releaseColumn);
    if (!releaseRaw) {
      return false;
    }
    const freigabe = parseInt(releaseRaw, 10);
    return !isNaN(freigabe) && !freigabe;
  }

  function getTextAfterColon(value) {
    const colonIndex = String(value).indexOf(":");
    return colonIndex >= 0 ? String(value).slice(colonIndex + 1).trim() : String(value);
  }

  function resolveMetricsColumns(_sampleRow, _treeConfig, _tableConfig) {
    const tableConfig = _tableConfig && typeof _tableConfig === "object" ? _tableConfig : {};

    return {
      code: resolveMappedColumnName(_sampleRow, tableConfig, "code", _config.CODE_COLUMN_CANDIDATES),
      display: resolveMappedColumnName(_sampleRow, tableConfig, "kurztext", _config.DISPLAY_COLUMN_CANDIDATES),
      langtext: resolveColumnName(_sampleRow, _config.LANGTEXT_COLUMN_CANDIDATES),
      pathText: resolveColumnName(_sampleRow, _config.PATH_TEXT_COLUMN_CANDIDATES),
      release: resolveMappedColumnName(_sampleRow, tableConfig, "freigabe", _config.RELEASE_COLUMN_CANDIDATES),
      url: resolveColumnName(_sampleRow, _config.URL_COLUMN_CANDIDATES),
      hardcoded: readMappedColumnName(_sampleRow, tableConfig, "hardcoded"),
      pathColumns: resolvePathColumns(_sampleRow, _treeConfig)
    };
  }

  function readMappedColumnName(sampleRow, tableConfig, configKey) {
    const raw = tableConfig[configKey];
    if (raw != null && raw !== "") {
      const header = String(raw).trim();
      if (hasColumn(sampleRow, header)) {
        return header;
      }
    }

    return null;
  }

  function resolveMappedColumnName(sampleRow, tableConfig, configKey, candidates) {
    const mapped = readMappedColumnName(sampleRow, tableConfig, configKey);
    return mapped !== null ? mapped : resolveColumnName(sampleRow, candidates);
  }

  function resolvePathColumns(sampleRow, treeConfig) {
    const configuredColumns =
      treeConfig &&
      Array.isArray(treeConfig.pathColumnNamesArr) &&
      treeConfig.pathColumnNamesArr.length > 0
        ? treeConfig.pathColumnNamesArr
        : _config.DEFAULT_PATH_COLUMNS;

    return configuredColumns.filter(function (header) {
      return hasColumn(sampleRow, header);
    });
  }

  function resolveColumnName(sampleRow, candidates) {
    if (!sampleRow) {
      return null;
    }

    for (let index = 0; index < candidates.length; index += 1) {
      if (hasColumn(sampleRow, candidates[index])) {
        return candidates[index];
      }
    }

    return null;
  }

  function hasColumn(sampleRow, header) {
    return Boolean(sampleRow && Object.prototype.hasOwnProperty.call(sampleRow, header));
  }

  return {
    buildMetricsTreeSources: buildMetricsTreeSources,
    buildMetricsTreeNodes: buildMetricsTreeNodes,
    resolveMetricsColumns: resolveMetricsColumns
  };
});
