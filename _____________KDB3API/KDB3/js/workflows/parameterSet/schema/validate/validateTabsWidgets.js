define([
  "../v3Defaults.js",
  "../errorCodes.js",
  "./validatePrimitives.js",
  "./validateWidgetFields.js",
], function (_v3Defaults, _errorCodes, _primitives, _validateWidgetFields) {
  "use strict";

  const pushInvalid = _primitives.pushInvalid;

  // §4.4 tab entry: { name, hide? }.
  function validateTabs(tabs, diagnostics) {
    if (tabs === undefined) {
      return;
    }
    if (!Array.isArray(tabs) || tabs.length === 0) {
      pushInvalid(diagnostics, "tabs must be a non-empty array of tab entries when present", { received: tabs });
      return;
    }
    tabs.forEach(function (entry, index) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        pushInvalid(diagnostics, "tabs entry must be a plain object { name, hide? }", { index: index, received: entry });
        return;
      }
      if (typeof entry.name !== "string" || entry.name === "") {
        pushInvalid(diagnostics, "tabs entry name is required", { index: index, received: entry.name });
      }
      if (entry.hide !== undefined && entry.hide !== 1) {
        pushInvalid(diagnostics, "tabs entry hide must be 1 when present (visible tabs omit it)", { index: index, received: entry.hide });
      }
      Object.keys(entry).forEach(function (key) {
        if (key !== "name" && key !== "hide") {
          pushInvalid(diagnostics, "unknown tabs entry field", { index: index, field: key });
        }
      });
    });
  }

  // §4.5.1 widget object validation.
  function validateWgts(wgts, tabs, diagnostics) {
    if (wgts === undefined) {
      return;
    }
    if (!Array.isArray(wgts)) {
      pushInvalid(diagnostics, "wgts must be an array of widget objects", { received: wgts });
      return;
    }
    wgts.forEach(function (widget, index) {
      validateWidget(widget, index, tabs, diagnostics);
    });
  }

  function validateWidget(widget, index, tabs, diagnostics) {
    if (!widget || typeof widget !== "object" || Array.isArray(widget)) {
      pushInvalid(diagnostics, "widget entry must be a plain object", { index: index, received: widget });
      return;
    }
    const kind = widget.kind;
    if (_v3Defaults.WIDGET_KINDS.reserved.indexOf(kind) !== -1) {
      diagnostics.push(_errorCodes.makeDiagnostic(
        _errorCodes.codes.WRITEBACK_WIDGET_KIND_UNSUPPORTED,
        "validate",
        "widget kind \"" + kind + "\" is reserved and unsupported in tranche 1",
        { index: index, kind: kind }
      ));
      return;
    }
    const fields = _v3Defaults.WIDGET_FIELDS[kind];
    if (!fields) {
      diagnostics.push(_errorCodes.makeDiagnostic(
        _errorCodes.codes.WRITEBACK_WIDGET_KIND_UNSUPPORTED,
        "validate",
        "unknown widget kind",
        { index: index, kind: kind === undefined ? null : kind }
      ));
      return;
    }

    validateWidgetCommon(widget, index, tabs, diagnostics);
    _validateWidgetFields(widget, fields, index, kind, diagnostics);

    Object.keys(widget).forEach(function (key) {
      if (_v3Defaults.WIDGET_COMMON_FIELDS[key] === undefined && fields[key] === undefined) {
        pushInvalid(diagnostics, "unknown widget field for kind \"" + kind + "\"", { index: index, kind: kind, field: key });
      }
    });
  }

  function validateWidgetCommon(widget, index, tabs, diagnostics) {
    const tab = widget.tab;
    if (typeof tab !== "number" || !isFinite(tab) || tab < 0 || Math.floor(tab) !== tab) {
      pushInvalid(diagnostics, "widget tab must be a non-negative integer tab index", { index: index, received: tab });
    } else if (Array.isArray(tabs) && tab >= tabs.length) {
      pushInvalid(diagnostics, "widget tab must resolve to a tab in tabs (tab < tabs.length)", {
        index: index, tab: tab, tabsLength: tabs.length,
      });
    }
    ["x", "y", "w", "h"].forEach(function (key) {
      if (typeof widget[key] !== "number" || !isFinite(widget[key])) {
        pushInvalid(diagnostics, "widget layout value must be a finite number", { index: index, field: key, received: widget[key] });
      }
    });
  }

  return Object.freeze({
    validateTabs: validateTabs,
    validateWgts: validateWgts,
  });
});
