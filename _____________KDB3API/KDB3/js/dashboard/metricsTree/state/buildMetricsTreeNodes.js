define([
  "./resolveMetricsColumns.js",
  "./buildMetricsTreeLeafNode.js"
], function (_resolveMetricsColumns, _buildMetricsTreeLeafNode) {
  "use strict";

  function __controller(_rows, _treeConfig, _tableConfig, _sourceKey, _isSuperUserAllowed) {
    try {
      if (!Array.isArray(_rows) || _rows.length === 0) {
        return [];
      }

      const columns = _resolveMetricsColumns(_rows[0], _treeConfig, _tableConfig);
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
        leafNodes.push(_buildMetricsTreeLeafNode(row, columns, _sourceKey, code, parentId));
      }

      return Object.keys(groupNodesById).map(function (id) {
        return groupNodesById[id];
      }).concat(leafNodes);
    } catch (err) {
      console.error("[metricsTree.buildMetricsTreeNodes] node build failed", err);
      throw err;
    }
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
      const groupId = buildGroupId(sourceKey, pathTrail);
      if (!groupNodesById[groupId]) {
        groupNodesById[groupId] = {
          id: groupId,
          parent: parentId,
          text: pathTextParts[index] || String(pathValue),
          li_attr: {
            "data-parent": "1"
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

    const superUser = _isSuperUserAllowed === true ? 1 : 0;
    const freigabe = parseInt(releaseRaw, 10);
    if (isNaN(freigabe)) {
      return true;
    }
    return Boolean(superUser || freigabe);
  }

  function resolveCode(row, columns, index) {
    const codeValue = columns.code ? row[columns.code]?.display ?? "" : "";
    const displayValue = columns.display ? row[columns.display]?.display ?? "" : "";
    const langtextValue = columns.langtext ? row[columns.langtext]?.display ?? "" : "";
    return String(codeValue || displayValue || langtextValue || "kennzahl_" + index);
  }

  function readTrimmed(row, columnName) {
    return columnName && row[columnName] != null ? String(row[columnName]?.display ?? "").trim() : "";
  }

  function splitPathText(pathText) {
    return pathText ? String(pathText).split("/") : [];
  }

  function buildGroupId(sourceKey, pathTrail) {
    return "group:" + sourceKey + ":" + pathTrail.join(">");
  }

  return __controller;
});
