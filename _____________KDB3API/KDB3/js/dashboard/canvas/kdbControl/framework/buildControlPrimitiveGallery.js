define(["./createFrameworkElement", "../settings/config/settingsColorDefaults"], function (_createFrameworkElement, _colorDefaults) {

  "use strict";

  var COLOR_SWATCHES = [

    ["default", "#ffffff"],

    ["transparent", "#00000000"],

    ["abendstimmung", "#49274b"],

    ["frischgruen", "#82d282"],

    ["goldgelb", "#e6c828"],

    ["wienrot", "#ff0000"],

  ];

  function createTextInputRow(label, placeholder, inputId, initialValue) {

    var row = _createFrameworkElement("div", null, "kdb-control_input-row", null);

    var lab = _createFrameworkElement("div", null, "kdb-control_input-label", null);

    lab.textContent = label;

    var inp = _createFrameworkElement("input", null, "kdb-control_text-input", {

      type: "text",

      placeholder: placeholder || "",

      "data-placeholder-input-id": inputId,

    });

    if (initialValue != null && String(initialValue).trim() !== "") {
      inp.value = String(initialValue).trim();
    }

    row.appendChild(lab);

    row.appendChild(inp);

    return row;

  }

  function normalizePaletteEntry(entry) {

    if (!entry) return null;

    if (Array.isArray(entry) && entry.length >= 2) {

      return [String(entry[0]).trim(), String(entry[1]).trim()];

    }

    if (entry && typeof entry === "object") {

      var c = entry.color != null ? entry.color : entry.value;

      var name = entry.name != null ? entry.name : entry.key;

      if (name != null && c != null) return [String(name).trim(), String(c).trim()];

    }

    return null;

  }

  function readColorPaletteFromKdb(_KDB) {

    var o = _KDB && _KDB.config && _KDB.config.options;

    var raw = o && o.color;

    if (Array.isArray(raw) && raw.length) {

      var out = [];

      var j;

      for (j = 0; j < raw.length; j++) {

        var p = normalizePaletteEntry(raw[j]);

        if (p) out.push(p);

      }

      if (out.length) return out;

    }

    if (raw && typeof raw === "object") {

      var mapped = [];

      var keys = Object.keys(raw);

      var i;

      for (i = 0; i < keys.length; i++) {

        if (raw[keys[i]] != null && String(raw[keys[i]]).trim() !== "") {

          mapped.push([String(keys[i]).trim(), String(raw[keys[i]]).trim()]);

        }

      }

      if (mapped.length) return mapped;

    }

    return COLOR_SWATCHES.slice();

  }

  function resolveDefaultPaletteHex(_KDB) {
    var palette = readColorPaletteFromKdb(_KDB);
    var i;
    for (i = 0; i < palette.length; i++) {
      if (String(palette[i][0]).toLowerCase() === "default") return palette[i][1];
    }
    if (palette.length) return palette[0][1];
    return _colorDefaults.defaultPaletteOptionHex;
  }

  /** Breedste rij i.v.m. vet 12px (zoals swatch-hover); label zoals ghost: -naam #hex */
  function pickWidestPaletteRowIndex(palette) {

    if (!palette || !palette.length) return 0;

    var canvas = document.createElement("canvas");

    var ctx = canvas.getContext("2d");

    if (!ctx) {

      var fbBest = 0;

      var fbW = -1;

      var fi;

      for (fi = 0; fi < palette.length; fi++) {

        var gl = "-" + palette[fi][0] + " " + palette[fi][1];

        if (gl.length > fbW) {

          fbW = gl.length;

          fbBest = fi;

        }

      }

      return fbBest;

    }

    ctx.font = '700 12px "IBM Plex Sans", "Helvetica Neue", Arial, sans-serif';

    var bestIdx = 0;

    var bestPx = -1;

    var pi;

    for (pi = 0; pi < palette.length; pi++) {

      var ghostLine = "-" + palette[pi][0] + " " + palette[pi][1];

      var w = ctx.measureText(ghostLine).width;

      if (w > bestPx) {

        bestPx = w;

        bestIdx = pi;

      }

    }

    return bestIdx;

  }

  function readKdbControlRuntime(_KDB) {

    return (_KDB && _KDB.runtime && _KDB.runtime.kdbControl) || null;

  }

  function createColorFieldLifecycle(_KDB, key) {

    var rt = readKdbControlRuntime(_KDB);

    var ac = new AbortController();

    var pendingTimers = [];

    function clearPendingTimers() {

      var i;

      for (i = 0; i < pendingTimers.length; i++) {

        window.clearTimeout(pendingTimers[i]);

      }

      pendingTimers.length = 0;

      if (rt && rt.timers && Object.prototype.hasOwnProperty.call(rt.timers, key)) {

        delete rt.timers[key];

      }

    }

    function dispose() {

      clearPendingTimers();

      if (!ac.signal.aborted) ac.abort();

      if (rt && rt.abortControllers && rt.abortControllers[key] === ac) {

        delete rt.abortControllers[key];

      }

    }

    ac.signal.addEventListener("abort", clearPendingTimers);

    if (rt) {

      rt.listeners = rt.listeners || {};

      rt.abortControllers = rt.abortControllers || {};

      rt.timers = rt.timers || {};

      if (typeof rt.listeners[key] === "function") rt.listeners[key]();

      rt.abortControllers[key] = ac;

      rt.listeners[key] = dispose;

    }

    return {

      signal: ac.signal,

      scheduleTimeout: function (fn, ms) {

        var tid = window.setTimeout(function () {

          var idx = pendingTimers.indexOf(tid);

          if (idx >= 0) pendingTimers.splice(idx, 1);

          if (rt && rt.timers && rt.timers[key] === tid) delete rt.timers[key];

          fn();

        }, ms);

        pendingTimers.push(tid);

        if (rt) rt.timers[key] = tid;

        return tid;

      },

    };

  }

  function wireColorFieldDropdown(wrap, inp, drop, life) {

    var sig = life && life.signal;

    var bubbleOpts = sig ? { signal: sig } : undefined;

    var captureOpts = sig ? { capture: true, signal: sig } : true;

    function isOpen() {

      return wrap.classList.contains("kdb-control_color-field--open");

    }

    function openDropdown() {

      wrap.classList.add("kdb-control_color-field--open");

      drop.setAttribute("aria-hidden", "false");

    }

    function closeDropdown() {

      wrap.classList.remove("kdb-control_color-field--open");

      drop.setAttribute("aria-hidden", "true");

    }

    inp.addEventListener("focus", openDropdown, bubbleOpts);

    inp.addEventListener("click", openDropdown, bubbleOpts);

    inp.addEventListener("keydown", function (ev) {

      if (ev.key === "Escape" && isOpen()) closeDropdown();

    }, bubbleOpts);

    wrap.addEventListener("focusout", function () {

      var schedule = life && life.scheduleTimeout ? life.scheduleTimeout : window.setTimeout;

      schedule(function () {

        if (!wrap.contains(document.activeElement)) closeDropdown();

      }, 0);

    }, bubbleOpts);

    document.addEventListener(

      "mousedown",

      function (ev) {

        if (!isOpen()) return;

        if (wrap.contains(ev.target)) return;

        closeDropdown();

      },

      captureOpts

    );

  }

  function resolveColorInputDefaultHex(inputId, _KDB) {
    var map = _colorDefaults.colorInputs;
    if (map && inputId && Object.prototype.hasOwnProperty.call(map, inputId)) {
      var v = map[inputId];
      if (v != null && String(v).trim() !== "") return String(v).trim();
    }
    return resolveDefaultPaletteHex(_KDB);
  }

  function createColorInput(label, inputId, _KDB) {

    var palette = readColorPaletteFromKdb(_KDB);

    var life = createColorFieldLifecycle(_KDB, "colorField:" + String(inputId || "unknown"));

    var swatchOpts = life && life.signal ? { signal: life.signal } : undefined;

    var wrap = _createFrameworkElement("div", null, "kdb-control_color-field", null);

    var lab = _createFrameworkElement("div", null, "kdb-control_input-label", null);

    lab.textContent = label;

    var inputWrap = _createFrameworkElement("div", null, "kdb-control_color-input-wrap", null);

    var inp = _createFrameworkElement("input", null, "kdb-control_text-input", {

      type: "text",

      placeholder: "#Farbcode (zB. #FFA500)",

      "data-placeholder-input-id": inputId,

      autocomplete: "off",

      readonly: "readonly",

    });

    var defHex = resolveColorInputDefaultHex(inputId, _KDB);
    if (defHex) inp.value = String(defHex);

    var drop = _createFrameworkElement("div", null, "kdb-control_color-dropdown", {

      "aria-hidden": "true",

    });

    drop.setAttribute("role", "listbox");

    var pal = _createFrameworkElement("div", null, "kdb-control_color-palette", null);

    var i;

    for (i = 0; i < palette.length; i++) {

      var pair = palette[i];

      var opt = _createFrameworkElement("button", null, "kdb-control_color-swatch", {

        type: "button",

        title: pair[0] + " " + pair[1],

      });

      opt.textContent = pair[0] + " " + pair[1];

      opt.style.backgroundColor = pair[1];
      opt.style.color = _KDB.utils.readableTextColorForHex(pair[1]);

      (function (btn, hex) {

        btn.addEventListener("mousedown", function (ev) {

          ev.preventDefault();

          inp.value = hex;

          inp.dispatchEvent(new Event("input", { bubbles: true }));

          wrap.classList.remove("kdb-control_color-field--open");

          drop.setAttribute("aria-hidden", "true");

        }, swatchOpts);

      })(opt, pair[1]);

      pal.appendChild(opt);

    }

    if (palette.length > 0) {

      var widestIdx = pickWidestPaletteRowIndex(palette);

      var longPair = palette[widestIdx];

      var ghostLabel = "-" + longPair[0] + " " + longPair[1];

      var ghost = _createFrameworkElement("div", null, "kdb-control_color-swatch kdb-control_color-swatch--width-ghost", null);

      ghost.textContent = ghostLabel;

      ghost.setAttribute("aria-hidden", "true");

      ghost.style.backgroundColor = longPair[1];

      pal.appendChild(ghost);

    }

    drop.appendChild(pal);

    wrap.appendChild(lab);

    inputWrap.appendChild(inp);

    inputWrap.appendChild(drop);

    wrap.appendChild(inputWrap);

    wireColorFieldDropdown(wrap, inp, drop, life);

    return wrap;

  }

  function createToggleSwitch(label, action, checked, ariaLabelOverride) {

    var row = _createFrameworkElement("label", null, "kdb-control_switch-row KDB_ToggleButton", null);

    var spanLab = _createFrameworkElement("span", null, "kdb-control_switch-label", null);

    spanLab.textContent = label;

    var track = _createFrameworkElement("span", null, "kdb-control_switch-track", null);

    var cb = _createFrameworkElement("input", null, "kdb-control_switch-input", {

      type: "checkbox",

      "data-kdb-action": action || "",

    });

    if (ariaLabelOverride) cb.setAttribute("aria-label", ariaLabelOverride);

    if (checked) cb.setAttribute("checked", "checked");

    var slider = _createFrameworkElement("span", null, "KDB_ToggleButton_slider KDB_ToggleButton_round", null);

    track.appendChild(cb);

    track.appendChild(slider);

    row.appendChild(spanLab);

    row.appendChild(track);

    row.setAttribute("title", label);

    return row;

  }

  function createToggleSwitchWithIcon(imageSrc, ariaLabel, action, checked) {

    var row = _createFrameworkElement("label", null, "kdb-control_switch-row kdb-control_switch-row--icon KDB_ToggleButton", null);

    var spanLab = _createFrameworkElement("span", null, "kdb-control_switch-label kdb-control_switch-label--glyph", null);

    if (imageSrc) {

      var img = document.createElement("img");

      img.className = "kdb-control_switch-icon";

      img.src = imageSrc;

      img.alt = "";

      img.setAttribute("role", "presentation");

      spanLab.appendChild(img);

    }

    var track = _createFrameworkElement("span", null, "kdb-control_switch-track", null);

    var cb = _createFrameworkElement("input", null, "kdb-control_switch-input", {

      type: "checkbox",

      "data-kdb-action": action || "",

    });

    if (ariaLabel) cb.setAttribute("aria-label", ariaLabel);

    if (checked) cb.setAttribute("checked", "checked");

    var slider = _createFrameworkElement("span", null, "KDB_ToggleButton_slider KDB_ToggleButton_round", null);

    track.appendChild(cb);

    track.appendChild(slider);

    row.appendChild(spanLab);

    row.appendChild(track);

    if (ariaLabel) row.setAttribute("title", ariaLabel);

    return row;

  }

  function createActionButton(label, action) {

    var b = _createFrameworkElement("button", null, "kdb-control_action-button", {

      type: "button",

      "data-kdb-action": action || "",

    });

    b.textContent = label;

    b.setAttribute("title", label);

    return b;

  }

  function createDraggableActionButton(label, dragType) {

    var b = _createFrameworkElement("button", null, "kdb-control_action-button kdb-control_action-button--draggable", {

      type: "button",

      draggable: "true",

      "data-drag-type": dragType || "text",

    });

    b.textContent = label;

    b.setAttribute("title", label);

    return b;

  }

  function createRadioGroup(label, name, options, controlId, layoutOpts) {

    layoutOpts = layoutOpts || {};

    const wrap = _createFrameworkElement("div", null, "kdb-control_radio-group", null);

    if (label) {

      const cap = _createFrameworkElement("div", null, "kdb-control_radio-group-label", null);

      cap.textContent = label;

      wrap.appendChild(cap);

    }

    let formClass = "kdb-control__gallery-row-radio kdb-control_radio-form";

    if (layoutOpts.formRow) formClass += " kdb-control_radio-form--row";

    const form = _createFrameworkElement("div", null, formClass, {

      "data-placeholder-control-id": controlId || "headerEditMode",

    });

    for (let i = 0; i < options.length; i++) {

      const o = options[i];

      const id = "kdb-fw-radio-" + name + "-" + i;

      const lab = _createFrameworkElement("label", null, "kdb-control__radio-label", null);

      const radio = _createFrameworkElement("input", id, "kdb-control__radio", {

        type: "radio",

        name: name,

        value: o.value,

      });

      if (o.disabled) radio.setAttribute("disabled", "disabled");

      if (o.dataTabIndex != null && o.dataTabIndex !== "") {
        radio.setAttribute("data-tab-index", String(o.dataTabIndex));
      }

      if (layoutOpts.hideCaptions) {

        radio.setAttribute("aria-label", o.ariaLabel || o.caption || String(o.value));

      }

      const tip = o.caption != null && String(o.caption) ? String(o.caption) : o.ariaLabel || String(o.value);

      lab.setAttribute("title", tip);

      lab.appendChild(radio);

      if (!layoutOpts.hideCaptions) lab.appendChild(document.createTextNode(" " + o.caption));

      form.appendChild(lab);

    }

    wrap.appendChild(form);

    return wrap;

  }

  return {

    createTextInputRow: createTextInputRow,

    createColorInput: createColorInput,

    createToggleSwitch: createToggleSwitch,

    createToggleSwitchWithIcon: createToggleSwitchWithIcon,

    createActionButton: createActionButton,

    createDraggableActionButton: createDraggableActionButton,

    createRadioGroup: createRadioGroup,

  };

});
