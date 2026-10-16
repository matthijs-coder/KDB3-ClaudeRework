define([], function () {
  "use strict";

  function createTablePayload(input, tableKey, widgetId, rows, sourceRows) {
    const rowCount = readRowCount(sourceRows || rows);
    return {
      tableKey: tableKey,
      tableHandle: input.tableHandle || tableKey,
      tableName: input.tableName || tableKey,
      title: input.title,
      widgetId: widgetId || input.widgetId,
      role: input.role,
      isCoreTable: input.isCoreTable === true,
      shape: input.shape,
      pick: input.pick,
      rows: rows,
      sourceRows: sourceRows || null,
      rowCount: rowCount,
      isHierarchy: false,
      hasData: rowCount > 0,
    };
  }

  function readRowCount(rows) {
    if (!rows) {
      return 0;
    }
    if (typeof rows.rowCount === "number") {
      return rows.rowCount;
    }
    if (Array.isArray(rows)) {
      return rows.length;
    }
    return 0;
  }

  return createTablePayload;
});
