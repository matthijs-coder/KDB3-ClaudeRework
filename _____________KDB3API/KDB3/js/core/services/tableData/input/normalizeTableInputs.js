define([], function () {
  "use strict";

  function normalizeTableInputs(_input) {
    if (!Array.isArray(_input)) {
      throw new Error("tableDataService input must be an array.");
    }
    const inputs = [];
    for (let index = 0; index < _input.length; index += 1) {
      inputs.push(normalizeTableInput(_input[index]));
    }
    return inputs;
  }

  function normalizeTableInput(_input) {
    if (!isPublicTableInputItem(_input)) {
      throw new Error("tableDataService input item must include tableName, tableid, or widgetId.");
    }
    if (Object.prototype.hasOwnProperty.call(_input, "tableName")) {
      return normalizeTableNameInput(_input);
    }
    if (Object.prototype.hasOwnProperty.call(_input, "tableid")) {
      return normalizeTableIdInput(_input);
    }
    return normalizeWidgetIdInput(_input);
  }

  function normalizeTableIdInput(_input) {
    const tableid = readString(_input.tableid);
    if (tableid) {
      return applyInputMetadata(_input, { tableHandle: tableid, tableName: null, title: null, widgetId: tableid });
    }
    throw new Error("tableDataService input item must include tableName, tableid, or widgetId.");
  }

  function normalizeWidgetIdInput(_input) {
    const widgetId = readString(_input.widgetId);
    if (widgetId) {
      return applyInputMetadata(_input, { tableHandle: widgetId, tableName: null, title: null, widgetId: widgetId });
    }
    throw new Error("tableDataService input item must include tableName, tableid, or widgetId.");
  }

  function normalizeTableNameInput(_input) {
    const tableName = readString(_input.tableName);
    if (tableName) {
      return applyInputMetadata(_input, { tableHandle: tableName, tableName: tableName, title: null, widgetId: null });
    }
    throw new Error("tableDataService input item must include tableName, tableid, or widgetId.");
  }

  function isPublicTableInputItem(_input) {
    if (!_input || typeof _input !== "object" || Array.isArray(_input)) {
      return false;
    }
    return hasOwn(_input, "tableName") || hasOwn(_input, "tableid") || hasOwn(_input, "widgetId");
  }

  function applyInputMetadata(_input, normalized) {
    normalized.title = readString(_input.title) || readString(_input.name);
    normalized.widgetId = readString(_input.widgetId) || normalized.widgetId;
    normalized.role = readString(_input.role);
    normalized.shape = normalizeShape(_input.shape);
    normalized.pick = normalizePick(_input.pick);
    if (_input.isCoreTable === true) {
      normalized.isCoreTable = true;
    }
    return normalized;
  }

  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function readString(_value) {
    const value = String(_value == null ? "" : _value).trim();
    return value || null;
  }

  function normalizeShape(_value) {
    const shape = readString(_value);
    return shape && shape.toLowerCase() === "column" ? "column" : "row";
  }

  function normalizePick(_value) {
    const defaultPick = ["display", "use"];
    const picked = [];
    const seen = {};
    if (!Array.isArray(_value)) {
      return defaultPick;
    }
    for (let index = 0; index < _value.length; index += 1) {
      appendPickItem(picked, seen, _value[index]);
    }
    if (!picked.length || (picked.length === 2 && seen.display === true && seen.use === true)) {
      return defaultPick;
    }
    return picked;
  }

  function appendPickItem(picked, seen, item) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      const key = readString(item);
      if (key) {
        appendPickKey(picked, seen, key);
      }
      return;
    }
    const keys = Object.keys(item);
    for (let index = 0; index < keys.length; index += 1) {
      appendPickMapping(picked, seen, keys[index], item[keys[index]]);
    }
  }

  function appendPickKey(picked, seen, key) {
    if (isAllowedPickKey(key) && seen[key] !== true) {
      seen[key] = true;
      picked.push(key);
    }
  }

  function appendPickMapping(picked, seen, outputKey, sourceKey) {
    const output = readString(outputKey);
    const source = readString(sourceKey);
    const seenKey = output + ":" + source;
    if (isAllowedPickKey(output) && isAllowedPickKey(source) && seen[seenKey] !== true) {
      const mapping = {};
      mapping[output] = source;
      seen[seenKey] = true;
      picked.push(mapping);
    }
  }

  function isAllowedPickKey(key) {
    return key === "display" || key === "use" || key === "d" || key === "u" || key === "value" || key === "v" || key === "label" || key === "caption";
  }

  return normalizeTableInputs;
});
