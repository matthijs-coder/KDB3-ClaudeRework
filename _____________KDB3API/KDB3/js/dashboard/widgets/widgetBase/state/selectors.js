// Published reads of widgetBase. readWidgetShell(_KDB, widgetId) -> the widget shell element in the owner document | null.
define(["../../../../core/utils/kit/data.js", "../view/resolveWidgetShell.js"], function (_data, _shellModule) {
  function readBaseRoot(_KDB) {
    if (!_KDB || !_KDB.state || !_KDB.state.widgets || !_KDB.state.widgets.base) {
      return undefined;
    }
    return _KDB.state.widgets.base;
  }

  function readWidgetBaseState(_KDB) {
    const base = readBaseRoot(_KDB);
    return base ? _data.cloneJson(base) : undefined;
  }

  function readFrame(_KDB, _widgetId) {
    const base = readBaseRoot(_KDB);
    if (!base || !base.byId || !base.byId[_widgetId]) {
      return undefined;
    }
    return _data.cloneJson(base.byId[_widgetId]);
  }

  function readWidgetsByTab(_KDB, _tabId) {
    const base = readBaseRoot(_KDB);
    if (!base || !base.byId) {
      return [];
    }
    const frames = [];
    const ids = Object.keys(base.byId);
    let index = 0;
    while (index < ids.length) {
      const frame = base.byId[ids[index]];
      if (frame && frame.tabId === _tabId) {
        frames.push(_data.cloneJson(frame));
      }
      index += 1;
    }
    return frames;
  }

  function readCanvasWidgetsByTab(_KDB, _tabId) {
    const base = readBaseRoot(_KDB);
    if (!base || !base.byId) {
      return [];
    }
    const frames = [];
    const ids = Object.keys(base.byId);
    let index = 0;
    while (index < ids.length) {
      const frame = base.byId[ids[index]];
      if (frame && frame.tabId === _tabId && frame.placement === "onCanvas" && frame.lifecycle !== "disposed") {
        frames.push(_data.cloneJson(frame));
      }
      index += 1;
    }
    return frames;
  }

  function readPlacement(_KDB, _widgetId) {
    const base = readBaseRoot(_KDB);
    const frame = base && base.byId ? base.byId[_widgetId] : null;
    if (!frame) {
      return undefined;
    }
    return {
      placement: frame.placement,
      launchpadPad: frame.launchpadPad,
      launchpadSlotKey: frame.launchpadSlotKey,
      layout: _data.cloneJson(frame.layout)
    };
  }

  function readAllWidgetIds(_KDB) {
    const base = readBaseRoot(_KDB);
    if (!base || !base.byId) {
      return [];
    }
    return Object.keys(base.byId);
  }

  function readWidgetShell(_KDB, _widgetId) {
    return _shellModule.resolveWidgetShell(_KDB, _widgetId);
  }

  return {
    readWidgetShell: readWidgetShell,
    readWidgetBaseState: readWidgetBaseState,
    readFrame: readFrame,
    readWidgetsByTab: readWidgetsByTab,
    readCanvasWidgetsByTab: readCanvasWidgetsByTab,
    readPlacement: readPlacement,
    readAllWidgetIds: readAllWidgetIds
  };
});
