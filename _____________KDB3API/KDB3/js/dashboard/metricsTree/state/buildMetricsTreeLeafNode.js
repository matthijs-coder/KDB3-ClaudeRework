define([], function () {
  "use strict";

  function __controller(_row, _columns, _sourceKey, _code, _parentId) {
    try {
      const fullText = resolveLangtext(_row, _code, _columns);
      const display = resolveDisplayText(_row, _code, _columns);
      const url = readTrimmed(_row, _columns.url);

      return {
        id: buildLeafNodeId(_code),
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
          draggedElementType: "visualization"
        }
      };
    } catch (err) {
      console.error("[metricsTree.buildMetricsTreeLeafNode] leaf build failed", err);
      throw err;
    }
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

  function buildLeafNodeId(code) { return String(code) + "_node"; }

  return __controller;
});
