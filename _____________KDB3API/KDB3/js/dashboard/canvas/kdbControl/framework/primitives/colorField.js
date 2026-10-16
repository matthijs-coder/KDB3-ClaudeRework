define([
  "../createFrameworkElement.js",
  "./colorPalette.js",
  "../../config/labels.js",
  "../../../../../core/utils/kit/runtime.js"
], function (_createElement, _palette, _labels, _rt) {
  "use strict";

  var OPEN_CLASS = "kdb-control_color-field--open";

  // One AbortController per colour field, kept in `runtime.abortControllers` so destroy aborts the listeners
  // (including the capture-phase document `mousedown`) and the focus-out timer in `runtime.timers`.
  function createFieldScope(rt, key) {
    var previous = rt.abortControllers[key];
    if (previous) previous.abort();
    var scope = new AbortController();
    rt.abortControllers[key] = scope;
    return scope;
  }

  function createDropdownControls(wrap, dropEl) {
    return {
      isOpen: function isOpen() {
        return wrap.classList.contains(OPEN_CLASS);
      },
      open: function open() {
        wrap.classList.add(OPEN_CLASS);
        dropEl.setAttribute("aria-hidden", "false");
      },
      close: function close() {
        wrap.classList.remove(OPEN_CLASS);
        dropEl.setAttribute("aria-hidden", "true");
      }
    };
  }

  function wireDropdown(wrap, inputEl, dropdown, rt, key, signal) {
    inputEl.addEventListener("focus", dropdown.open, { signal: signal });
    inputEl.addEventListener("click", dropdown.open, { signal: signal });
    inputEl.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && dropdown.isOpen()) dropdown.close();
    }, { signal: signal });
    wrap.addEventListener("focusout", function () {
      _rt.scheduleTimeout(rt.timers, key, function () {
        if (!wrap.contains(document.activeElement)) dropdown.close();
      }, 0);
    }, { signal: signal });
    document.addEventListener("mousedown", function (event) {
      if (dropdown.isOpen() && !wrap.contains(event.target)) dropdown.close();
    }, { capture: true, signal: signal });
  }

  function createSwatch(_KDB, pair, inputEl, closeDropdown, signal) {
    var swatch = _createElement("button", null, "kdb-control_color-swatch", { type: "button", title: pair[0] + " " + pair[1] });
    swatch.textContent = pair[0] + " " + pair[1];
    swatch.style.backgroundColor = pair[1];
    swatch.style.color = _KDB.utils.readableTextColorForHex(pair[1]);
    swatch.addEventListener("mousedown", function (event) {
      event.preventDefault();
      inputEl.value = pair[1];
      inputEl.dispatchEvent(new Event("input", { bubbles: true }));
      closeDropdown();
    }, { signal: signal });
    return swatch;
  }

  function createWidthGhost(palette) {
    var widest = palette[_palette.pickWidestPaletteRowIndex(palette)];
    var ghost = _createElement("div", null, "kdb-control_color-swatch kdb-control_color-swatch--width-ghost", null);
    ghost.textContent = _palette.buildGhostLabel(widest);
    ghost.setAttribute("aria-hidden", "true");
    ghost.style.backgroundColor = widest[1];
    return ghost;
  }

  function createColorInput(label, inputId, _KDB) {
    var rt = _KDB.runtime.kdbControl;
    var palette = _palette.readColorPalette(_KDB);
    var key = "colorField:" + String(inputId || "unknown");
    var scope = createFieldScope(rt, key);

    var wrap = _createElement("div", null, "kdb-control_color-field", null);
    var labelEl = _createElement("div", null, "kdb-control_input-label", null);
    labelEl.textContent = label;
    var inputWrap = _createElement("div", null, "kdb-control_color-input-wrap", null);
    var inputEl = _createElement("input", null, "kdb-control_text-input", {
      type: "text",
      placeholder: _labels.colorPlaceholder,
      "data-placeholder-input-id": inputId,
      autocomplete: "off",
      readonly: "readonly"
    });
    var defaultHex = _palette.resolveColorInputDefaultHex(inputId, _KDB);
    if (defaultHex) inputEl.value = String(defaultHex);

    var dropEl = _createElement("div", null, "kdb-control_color-dropdown", { "aria-hidden": "true" });
    dropEl.setAttribute("role", "listbox");
    var paletteEl = _createElement("div", null, "kdb-control_color-palette", null);
    var dropdown = createDropdownControls(wrap, dropEl);
    palette.forEach(function (pair) {
      paletteEl.appendChild(createSwatch(_KDB, pair, inputEl, dropdown.close, scope.signal));
    });
    if (palette.length > 0) paletteEl.appendChild(createWidthGhost(palette));
    dropEl.appendChild(paletteEl);

    wrap.appendChild(labelEl);
    inputWrap.appendChild(inputEl);
    inputWrap.appendChild(dropEl);
    wrap.appendChild(inputWrap);
    wireDropdown(wrap, inputEl, dropdown, rt, key, scope.signal);
    return wrap;
  }

  return { createColorInput: createColorInput };
});
