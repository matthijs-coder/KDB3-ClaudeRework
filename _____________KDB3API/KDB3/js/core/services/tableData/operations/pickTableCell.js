define([], function () {
  "use strict";

  function pickTableCell(_cell, _pick) {
    try {
      const picked = normalizePick(_pick);
      const output = {};
      for (let index = 0; index < picked.length; index += 1) {
        appendPickedItem(output, _cell, picked[index]);
      }
      return output;
    } catch (error) {
      console.error("[tableDataService.pickTableCell] failed", error);
      throw error;
    }
  }

  function appendPickedItem(output, cell, item) {
    if (typeof item === "string") {
      appendPickedValue(output, cell, item, item);
      return;
    }
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return;
    }
    const keys = Object.keys(item);
    for (let index = 0; index < keys.length; index += 1) {
      appendPickedValue(output, cell, keys[index], item[keys[index]]);
    }
  }

  function appendPickedValue(output, cell, outputKey, sourceKey) {
    const key = sourceKey || outputKey;
    if (key === "display") {
      writeResolvedValue(output, outputKey, cell, ["d", "label", "caption", "u", "value", "v"]);
      return;
    }
    if (key === "use") {
      writeResolvedValue(output, outputKey, cell, ["u", "value", "v", "d", "label", "caption"]);
      return;
    }
    if (hasCellKey(cell, key)) {
      output[outputKey] = cell[key];
    } else if (!isObjectCell(cell) && cell != null) {
      output[outputKey] = cell;
    }
  }

  function writeResolvedValue(output, outputKey, cell, keys) {
    if (isObjectCell(cell)) {
      for (let index = 0; index < keys.length; index += 1) {
        if (hasCellKey(cell, keys[index])) {
          output[outputKey] = cell[keys[index]];
          return;
        }
      }
    }
    if (!isObjectCell(cell) && cell != null) {
      output[outputKey] = cell;
    }
  }

  function normalizePick(pick) {
    return Array.isArray(pick) && pick.length ? pick : ["display", "use"];
  }

  function hasCellKey(cell, key) {
    return isObjectCell(cell) && Object.prototype.hasOwnProperty.call(cell, key);
  }

  function isObjectCell(cell) {
    return cell && typeof cell === "object" && !Array.isArray(cell);
  }

  return pickTableCell;
});
