define([
  "./buildMetricsTreeNodes.js"
], function (_buildMetricsTreeNodes) {
  "use strict";

  function __controller(_KDB, _sourceInput) {
    if (!_sourceInput || !Array.isArray(_sourceInput.rows)) {
      return emptyResult();
    }

    const sourceOrder = resolveRelevantSources(_KDB, _sourceInput);
    const bySource = {};
    const renderableSourceOrder = [];

    for (let index = 0; index < sourceOrder.length; index += 1) {
      const sourceKey = sourceOrder[index];
      const sourceEntry = buildSourceEntry(_KDB, sourceKey, _sourceInput);
      if (!sourceEntry) {
        continue;
      }

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
    if (tableProperties) {
      return Object.keys(tableProperties);
    }

    return [];
  }

  function buildSourceEntry(_KDB, sourceKey, sourceInput) {
    const rows = sourceInput.rows;
    const sourceName = sourceInput && sourceInput.tableName ? sourceInput.tableName : sourceKey;
    const treeConfig = getTreeConfig(_KDB, sourceKey, sourceName);
    const tableConfig = getTableConfig(_KDB, sourceKey, sourceName, sourceInput);
    const nodes = _buildMetricsTreeNodes(rows, treeConfig, tableConfig, sourceKey, !!sourceInput.isSuperUserAllowed);

    return {
      sourceKey: sourceKey,
      title: sourceName,
      rowCount: rows.length,
      nodes: nodes,
      hasRenderableData: nodes.length > 0,
      treeConfig: treeConfig,
      dataShape: getDataShape(rows)
    };
  }

  function getTreeConfig(_KDB, sourceKey, sourceName) {
    const treeProperties = readObjectPath(_KDB, ["properties", "metricsTreePropObj"]);
    if (!treeProperties) { return {}; }
    return treeProperties[sourceKey] || treeProperties[sourceName] || {};
  }

  function getTableConfig(_KDB, sourceKey, sourceName, sourceInput) {
    const tableProperties = readObjectPath(_KDB, ["properties", "metricsTablesPropObj"]);
    if (tableProperties && (tableProperties[sourceKey] || tableProperties[sourceName])) {
      return tableProperties[sourceKey] || tableProperties[sourceName];
    }
    return sourceInput && sourceInput.tableConfigObject ? sourceInput.tableConfigObject : {};
  }

  function getDataShape(rows) {
    return rows && rows[0] ? Object.keys(rows[0]) : [];
  }

  function emptyResult() {
    return { bySource: {}, sourceOrder: [], hasRenderableData: false };
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

  return __controller;
});
