define([
  "../state/actionTypes.js",
  "../effects.js",
  "../config/settingsInputs.js"
], function (_types, _effects, _settingsInputs) {
  "use strict";

  var OWNER_TOGGLES = {
    "header.toggle": { owner: "header", type: "header/toggle" },
    "header.subtitle.toggle": { owner: "header", type: "header/toggleSubtitle" },
    "footer.toggle": { owner: "footer", type: "footer/toggle" }
  };

  function isSwitchCheckbox(el) {
    return !!el && el.tagName === "INPUT" && el.type === "checkbox" && !!el.classList && el.classList.contains("kdb-control_switch-input");
  }

  // Inputs, radios and switches of the control panel: echo into framework state, route to the owners (header, footer, settings).
  function bindControlInputs(ctx, signal) {
    var _KDB = ctx._KDB;

    function selectControlValue(controlId, value) {
      ctx.dispatch({ type: _types.ACTION_FRAMEWORK_SET_PLACEHOLDER_SELECTION, payload: { controlId: controlId, value: value } });
      ctx.syncView();
    }

    function dispatchHeaderEditRadio(value) {
      var type = value === "renameHeaderSubtitle" ? "header/startSubtitleEdit" : "header/startTitleEdit";
      if (_effects.dispatchToOwnerApi(_KDB, "header", { type: type, payload: { source: "kdbControl" } })) ctx.syncView();
    }

    function onInput(event) {
      var target = event.target;
      var inputId = target && target.getAttribute && target.getAttribute("data-kdb-input-id");
      if (!inputId || target.tagName !== "INPUT" || _settingsInputs.isSettingsInput(inputId)) return;
      ctx.dispatch({ type: _types.ACTION_FRAMEWORK_SET_PLACEHOLDER_INPUT, payload: { inputId: inputId, value: target.value } });
      ctx.syncView();
    }

    function onRadioChange(radio) {
      var row = radio.closest(".kdb-control__gallery-row-radio[data-kdb-control-id]");
      var controlId = row && row.getAttribute("data-kdb-control-id");
      if (controlId === "headerEditMode" && radio.checked) {
        dispatchHeaderEditRadio(radio.value);
        return;
      }
      if (radio.closest(".kdb-control_tab-edit-placeholder")) return;
      if (controlId && radio.checked) selectControlValue(controlId, radio.value);
    }

    function onSwitchChange(checkbox) {
      var action = checkbox.getAttribute("data-kdb-action");
      if (!action) return;
      if (Object.prototype.hasOwnProperty.call(OWNER_TOGGLES, action)) {
        var toggle = OWNER_TOGGLES[action];
        _effects.dispatchToOwnerApi(_KDB, toggle.owner, { type: toggle.type, payload: { source: "kdbControl" } });
        ctx.syncView();
      } else if (action === "dashboard.settingsButtons.toggle") {
        ctx.dispatch({ type: _types.ACTION_SETTINGS_TOGGLE_DASHBOARD_CHROME, payload: { key: "hideWidgetSettingsButtons" } });
        ctx.syncView();
      } else if (action === "dashboard.developerMode.toggle") {
        ctx.dispatch({ type: _types.ACTION_SETTINGS_TOGGLE_DEVELOPER_MODE, payload: {} });
        ctx.syncView();
      } else {
        selectControlValue(action, checkbox.checked ? "1" : "0");
      }
    }

    function onChange(event) {
      var target = event.target;
      if (!target || !target.getAttribute) return;
      if (target.tagName === "INPUT" && target.getAttribute("type") === "radio" && target.name) onRadioChange(target);
      else if (isSwitchCheckbox(target)) onSwitchChange(target);
    }

    ctx.contentEl.addEventListener("input", onInput, { signal: signal });
    ctx.contentEl.addEventListener("change", onChange, { signal: signal });
  }

  return bindControlInputs;
});
