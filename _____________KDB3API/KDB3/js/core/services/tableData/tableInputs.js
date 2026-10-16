define(["./config.js", "./tableState.js"], function (_config, _tableState) {
  "use strict";

  const readString = _tableState.readString;
  const ARRAY_MESSAGE = "tableDataService input must be an array.";
  const ITEM_MESSAGE = "tableDataService input item must include tableName or widgetId.";
  const PICK_KEYS = { display: 1, use: 1, d: 1, u: 1, value: 1, v: 1, label: 1, caption: 1 };

  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function isPickKey(key) {
    return hasOwn(PICK_KEYS, key);
  }

  function normalizeShape(value) {
    const shape = readString(value);
    return shape && shape.toLowerCase() === "column" ? "column" : "row";
  }

  function appendPickKey(picked, seen, key) {
    if (isPickKey(key) && seen[key] !== true) {
      seen[key] = true;
      picked.push(key);
    }
  }

  function appendPickMapping(picked, seen, outputKey, sourceKey) {
    const output = readString(outputKey);
    const source = readString(sourceKey);
    const seenKey = output + ":" + source;
    if (isPickKey(output) && isPickKey(source) && seen[seenKey] !== true) {
      const mapping = {};
      mapping[output] = source;
      seen[seenKey] = true;
      picked.push(mapping);
    }
  }

  function appendPickItem(picked, seen, item) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      const key = readString(item);
      if (key) {
        appendPickKey(picked, seen, key);
      }
      return;
    }
    Object.keys(item).forEach(function (key) {
      appendPickMapping(picked, seen, key, item[key]);
    });
  }

  function normalizePick(value) {
    if (!Array.isArray(value)) {
      return _config.DEFAULT_PICK.slice();
    }
    const picked = [];
    const seen = {};
    value.forEach(function (item) {
      appendPickItem(picked, seen, item);
    });
    const isDefault = picked.length === 2 && seen.display === true && seen.use === true;
    return picked.length && !isDefault ? picked : _config.DEFAULT_PICK.slice();
  }

  function normalizeTableInput(item) {
    const isObject = item && typeof item === "object" && !Array.isArray(item);
    const byName = isObject && hasOwn(item, "tableName");
    if (!isObject || !(byName || hasOwn(item, "widgetId"))) {
      throw new Error(ITEM_MESSAGE);
    }
    const key = readString(byName ? item.tableName : item.widgetId);
    if (!key) {
      throw new Error(ITEM_MESSAGE);
    }
    const normalized = byName
      ? { tableHandle: key, tableName: key, title: null, widgetId: null }
      : { tableHandle: key, tableName: null, title: null, widgetId: key };
    normalized.title = readString(item.title) || readString(item.name);
    normalized.widgetId = readString(item.widgetId) || normalized.widgetId;
    normalized.role = readString(item.role);
    normalized.shape = normalizeShape(item.shape);
    normalized.pick = normalizePick(item.pick);
    if (item.isCoreTable === true) {
      normalized.isCoreTable = true;
    }
    return normalized;
  }

  function normalizeTableInputs(input) {
    if (!Array.isArray(input)) {
      throw new Error(ARRAY_MESSAGE);
    }
    return input.map(function (item) {
      return normalizeTableInput(item);
    });
  }

  function resolveTableKey(input) {
    const source = input || {};
    return source.tableHandle || source.tableName;
  }

  // A single input unwraps to its own result; several inputs give an array.
  function mapInputs(inputs, fn) {
    const results = inputs.map(function (input) {
      return fn(input);
    });
    return inputs.length === 1 ? results[0] : results;
  }

  function mapInputsAsync(inputs, fn) {
    const promises = inputs.map(function (input) {
      return fn(input);
    });
    return inputs.length === 1 ? promises[0] : Promise.all(promises);
  }

  return {
    normalizeTableInputs: normalizeTableInputs,
    resolveTableKey: resolveTableKey,
    mapInputs: mapInputs,
    mapInputsAsync: mapInputsAsync,
  };
});
