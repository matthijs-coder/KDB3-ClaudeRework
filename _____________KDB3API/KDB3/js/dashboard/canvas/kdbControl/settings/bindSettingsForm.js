define(["../events/eventNames"], function (_eventNames) {
  "use strict";
  var SETTINGS_FORM_INPUT_IDS = {
    dashboardWidth: 1,
    dashboardHeight: 1,
    dashboardBg: 1,
    graphWidth: 1,
    graphHeight: 1,
    graphBg: 1,
    commentWidth: 1,
    commentHeight: 1,
    commentBg: 1,
    panelBg: 1,
    panelButton: 1,
    panelActionButton: 1,
    panelInnerBg: 1,
  };
  var COLOR_INPUT_IDS = {
    dashboardBg: 1,
    graphBg: 1,
    commentBg: 1,
    panelBg: 1,
    panelButton: 1,
    panelActionButton: 1,
    panelInnerBg: 1,
  };
  function strVal(el) {
    return el && el.value != null ? String(el.value) : "";
  }
  function dispatchForInput(dispatch, id, el) {
    var value = strVal(el);
    switch (id) {
      case "dashboardWidth":
        dispatch({
          type: _eventNames.ACTION_SETTINGS_SET_DASHBOARD_DIMENSION,
          payload: { dimension: "width", value: value },
        });
        return;
      case "dashboardHeight":
        dispatch({
          type: _eventNames.ACTION_SETTINGS_SET_DASHBOARD_DIMENSION,
          payload: { dimension: "height", value: value },
        });
        return;
      case "dashboardBg":
        dispatch({ type: _eventNames.ACTION_SETTINGS_SET_DASHBOARD_COLOR, payload: { value: value } });
        return;
      case "graphWidth":
        dispatch({
          type: _eventNames.ACTION_SETTINGS_SET_VISUALIZATION_DEFAULT,
          payload: { field: "width", value: value },
        });
        return;
      case "graphHeight":
        dispatch({
          type: _eventNames.ACTION_SETTINGS_SET_VISUALIZATION_DEFAULT,
          payload: { field: "height", value: value },
        });
        return;
      case "graphBg":
        dispatch({
          type: _eventNames.ACTION_SETTINGS_SET_VISUALIZATION_DEFAULT,
          payload: { field: "backgroundColor", value: value },
        });
        return;
      case "commentWidth":
        dispatch({
          type: _eventNames.ACTION_SETTINGS_SET_COMMENT_DEFAULT,
          payload: { field: "width", value: value },
        });
        return;
      case "commentHeight":
        dispatch({
          type: _eventNames.ACTION_SETTINGS_SET_COMMENT_DEFAULT,
          payload: { field: "height", value: value },
        });
        return;
      case "commentBg":
        dispatch({
          type: _eventNames.ACTION_SETTINGS_SET_COMMENT_DEFAULT,
          payload: { field: "backgroundColor", value: value },
        });
        return;
      case "panelBg":
        dispatch({
          type: _eventNames.ACTION_SETTINGS_SET_CONTROL_PANEL_COLOR,
          payload: { role: "background", value: value },
        });
        return;
      case "panelButton":
        dispatch({
          type: _eventNames.ACTION_SETTINGS_SET_CONTROL_PANEL_COLOR,
          payload: { role: "button", value: value },
        });
        return;
      case "panelActionButton":
        dispatch({
          type: _eventNames.ACTION_SETTINGS_SET_CONTROL_PANEL_COLOR,
          payload: { role: "actionButton", value: value },
        });
        return;
      case "panelInnerBg":
        dispatch({ type: _eventNames.ACTION_SETTINGS_SET_CONTROL_PANEL_COLOR, payload: { role: "innerBackground", value: value } });
        return;
      default:
        return;
    }
  }
  function bindSettingsForm(_ctx, _signal) {
    var dispatch = _ctx && _ctx.dispatch;
    var contentEl = _ctx && _ctx.contentEl;
    if (!dispatch || typeof dispatch !== "function" || !contentEl) return;
    function targetInput(ev) {
      var t = ev.target;
      if (!t || t.tagName !== "INPUT" || !t.getAttribute) return null;
      var id = t.getAttribute("data-placeholder-input-id");
      if (!id || !SETTINGS_FORM_INPUT_IDS[id]) return null;
      return t;
    }
    function onChangeOrFocusout(ev) {
      var el = targetInput(ev);
      if (!el) return;
      var id = el.getAttribute("data-placeholder-input-id");
      dispatchForInput(dispatch, id, el);
    }
    function onKeydown(ev) {
      if (ev.key !== "Enter") return;
      var el = targetInput(ev);
      if (!el) return;
      ev.preventDefault();
      var id = el.getAttribute("data-placeholder-input-id");
      dispatchForInput(dispatch, id, el);
    }
    function onInput(ev) {
      var el = targetInput(ev);
      if (!el) return;
      var id = el.getAttribute("data-placeholder-input-id");
      if (!COLOR_INPUT_IDS[id]) return;
      dispatchForInput(dispatch, id, el);
    }
    contentEl.addEventListener("change", onChangeOrFocusout, { signal: _signal });
    contentEl.addEventListener("focusout", onChangeOrFocusout, { signal: _signal });
    contentEl.addEventListener("keydown", onKeydown, { signal: _signal });
    contentEl.addEventListener("input", onInput, { signal: _signal });
  }
  return bindSettingsForm;
});
