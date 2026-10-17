define([
  "../../../../core/utils/convertUnitToPx.js",
  "../../../../core/config/canvasSettingsDefaults.js",
  "../../schema/v3Defaults.js",
], function (_convertUnitToPx, _canvasSettingsDefaults, _v3Defaults) {
  "use strict";

  // Owner state names come from SETT_KEY_CATALOG.ownerStatePath ("settings.<section>[.<group>].<field>"),
  // so the v3 catalog is the only place that spells them.
  const CATALOG = _v3Defaults.SETT_KEY_CATALOG;

  function ownerPathParts(spec) {
    return spec.ownerStatePath.split(".");
  }

  function ownerFields(group) {
    const fields = {};
    Object.keys(group).forEach(function (v3Key) {
      const parts = ownerPathParts(group[v3Key]);
      fields[v3Key] = parts[parts.length - 1];
    });
    return fields;
  }

  function sectionOf(group) {
    return ownerPathParts(group[Object.keys(group)[0]])[1];
  }

  function newwgOwnerGroup(group) {
    return ownerPathParts(group[Object.keys(group)[0]])[2];
  }

  const SECTION = { dash: sectionOf(CATALOG.dash), panel: sectionOf(CATALOG.panel), newwg: sectionOf(CATALOG.newwg.vis) };
  const DASH = ownerFields(CATALOG.dash);
  const PANEL_COLOUR_KEYS = ownerFields(CATALOG.panel);
  const NEWWG = {
    vis: { group: newwgOwnerGroup(CATALOG.newwg.vis), fields: ownerFields(CATALOG.newwg.vis) },
    txt: { group: newwgOwnerGroup(CATALOG.newwg.txt), fields: ownerFields(CATALOG.newwg.txt) },
  };

  // GET collector for v3 `canv`/`sett` per contracts/writeback.md §4.1/§4.1.1.
  // Reads the kdbControl snapshot via _KDB.api.kdbControl.getState() and emits
  // only deltas against owner defaults. Dashboard width/height are carried by
  // `canv` ({w,h} in px) only, never duplicated as `sett.dash.w/h`; `sett.dash`
  // carries bg/hidWs/devOn, `sett.panel`/`sett.newwg` their §4.1.1 keys.
  // Dimensions normalize via convertUnitToPx ("10cm" -> 378), colours compare
  // case-insensitively.
  function collectCanvasSettings(_KDB, diagnostics) {
    const state = readKdbControlState(_KDB);
    const settings = state && state.settings;
    if (!settings) {
      diagnostics.push({
        code: "WRITEBACK_KDBCONTROL_RESTORE_FAILED",
        phase: "get",
        message: "kdbControl settings state is not available; canv/sett omitted",
      });
      return {};
    }
    const defaults = _canvasSettingsDefaults.createDefaultSettings();
    const result = {};

    const canv = collectCanv(settings[SECTION.dash], defaults[SECTION.dash]);
    if (canv) {
      result.canv = canv;
    }
    const sett = {};
    const dash = collectDash(settings[SECTION.dash], defaults[SECTION.dash]);
    if (dash) {
      sett.dash = dash;
    }
    const panel = collectColourGroup(settings[SECTION.panel], defaults[SECTION.panel], PANEL_COLOUR_KEYS);
    if (panel) {
      sett.panel = panel;
    }
    const newwg = collectNewwg(settings[SECTION.newwg], defaults[SECTION.newwg]);
    if (newwg) {
      sett.newwg = newwg;
    }
    if (Object.keys(sett).length > 0) {
      result.sett = sett;
    }
    return result;
  }

  function collectCanv(dashboard, dashboardDefaults) {
    if (!dashboard) {
      return null;
    }
    const width = _convertUnitToPx(dashboard[DASH.w]);
    const height = _convertUnitToPx(dashboard[DASH.h]);
    const defaultWidth = _convertUnitToPx(dashboardDefaults[DASH.w]);
    const defaultHeight = _convertUnitToPx(dashboardDefaults[DASH.h]);
    if (width === null || height === null) {
      return null;
    }
    if (width === defaultWidth && height === defaultHeight) {
      return null; // omit when default (§4)
    }
    return { w: width, h: height };
  }

  function collectDash(dashboard, dashboardDefaults) {
    if (!dashboard) {
      return null;
    }
    const dash = {};
    if (!coloursEqual(dashboard[DASH.bg], dashboardDefaults[DASH.bg])) {
      dash.bg = dashboard[DASH.bg];
    }
    if (dashboard[DASH.hidWs] === false) {
      dash.hidWs = 0;
    }
    if (dashboard[DASH.devOn] === true) {
      dash.devOn = 1;
    }
    return Object.keys(dash).length > 0 ? dash : null;
  }

  function collectColourGroup(group, groupDefaults, keyMap) {
    if (!group) {
      return null;
    }
    const result = {};
    Object.keys(keyMap).forEach(function (v3Key) {
      const ownerKey = keyMap[v3Key];
      if (!coloursEqual(group[ownerKey], groupDefaults[ownerKey])) {
        result[v3Key] = group[ownerKey];
      }
    });
    return Object.keys(result).length > 0 ? result : null;
  }

  function collectNewwg(defaultsNew, defaultsNewDefaults) {
    if (!defaultsNew) {
      return null;
    }
    const newwg = {};
    const vis = collectNewwgEntry(defaultsNew[NEWWG.vis.group], defaultsNewDefaults[NEWWG.vis.group], NEWWG.vis.fields);
    if (vis) {
      newwg.vis = vis;
    }
    const txt = collectNewwgEntry(defaultsNew[NEWWG.txt.group], defaultsNewDefaults[NEWWG.txt.group], NEWWG.txt.fields);
    if (txt) {
      newwg.txt = txt;
    }
    return Object.keys(newwg).length > 0 ? newwg : null;
  }

  function collectNewwgEntry(entry, entryDefaults, fields) {
    if (!entry) {
      return null;
    }
    const result = {};
    const width = _convertUnitToPx(entry[fields.w]);
    const defaultWidth = _convertUnitToPx(entryDefaults[fields.w]);
    if (width !== null && width !== defaultWidth) {
      result.w = width;
    }
    const height = _convertUnitToPx(entry[fields.h]);
    const defaultHeight = _convertUnitToPx(entryDefaults[fields.h]);
    if (height !== null && height !== defaultHeight) {
      result.h = height;
    }
    if (!coloursEqual(entry[fields.bg], entryDefaults[fields.bg])) {
      result.bg = entry[fields.bg];
    }
    return Object.keys(result).length > 0 ? result : null;
  }

  function coloursEqual(a, b) {
    if (a === b) return true;
    if (typeof a !== "string" || typeof b !== "string") return false;
    return a.trim().toLowerCase() === b.trim().toLowerCase();
  }

  function readKdbControlState(_KDB) {
    const api = _KDB && _KDB.api ? _KDB.api.kdbControl : null;
    return api ? api.getState() : null;
  }

  return collectCanvasSettings;
});
