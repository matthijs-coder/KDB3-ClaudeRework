define([
  "../../../../utils/convertUnitToPx.js",
  "../../../../../dashboard/canvas/kdbControl/state/initialState.js",
], function (_convertUnitToPx, _kdbControlInitialState) {
  "use strict";

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
    const defaults = _kdbControlInitialState().settings;
    const result = {};

    const canv = collectCanv(settings.dashboard, defaults.dashboard);
    if (canv) {
      result.canv = canv;
    }
    const sett = {};
    const dash = collectDash(settings.dashboard, defaults.dashboard);
    if (dash) {
      sett.dash = dash;
    }
    const panel = collectColourGroup(settings.controlPanel, defaults.controlPanel, { bg: "backgroundColor", btn: "buttonColor", act: "actionButtonColor", inBg: "innerBackgroundColor" });
    if (panel) {
      sett.panel = panel;
    }
    const newwg = collectNewwg(settings.defaultsNew, defaults.defaultsNew);
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
    const width = _convertUnitToPx(dashboard.width);
    const height = _convertUnitToPx(dashboard.height);
    const defaultWidth = _convertUnitToPx(dashboardDefaults.width);
    const defaultHeight = _convertUnitToPx(dashboardDefaults.height);
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
    if (!coloursEqual(dashboard.backgroundColor, dashboardDefaults.backgroundColor)) {
      dash.bg = dashboard.backgroundColor;
    }
    if (dashboard.hideWidgetSettingsButtons === false) {
      dash.hidWs = 0;
    }
    if (dashboard.isDeveloperMode === true) {
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
    const vis = collectNewwgEntry(defaultsNew.visualization, defaultsNewDefaults.visualization);
    if (vis) {
      newwg.vis = vis;
    }
    const txt = collectNewwgEntry(defaultsNew.comment, defaultsNewDefaults.comment);
    if (txt) {
      newwg.txt = txt;
    }
    return Object.keys(newwg).length > 0 ? newwg : null;
  }

  function collectNewwgEntry(entry, entryDefaults) {
    if (!entry) {
      return null;
    }
    const result = {};
    const width = _convertUnitToPx(entry.width);
    const defaultWidth = _convertUnitToPx(entryDefaults.width);
    if (width !== null && width !== defaultWidth) {
      result.w = width;
    }
    const height = _convertUnitToPx(entry.height);
    const defaultHeight = _convertUnitToPx(entryDefaults.height);
    if (height !== null && height !== defaultHeight) {
      result.h = height;
    }
    if (!coloursEqual(entry.backgroundColor, entryDefaults.backgroundColor)) {
      result.bg = entry.backgroundColor;
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
    return api && typeof api.getState === "function" ? api.getState() : null;
  }

  return collectCanvasSettings;
});
