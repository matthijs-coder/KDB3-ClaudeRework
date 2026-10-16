define([
  "./validatePrimitives.js",
  "../../../../config/visualizations/visTypeRules.js",
], function (_primitives, _visTypeRules) {
  "use strict";

  const pushInvalid = _primitives.pushInvalid;

  // §4.5.1 per-kind widget field validation (keys beyond the common frame).
  // Optional keys are simply absent when the owner default applies; a present
  // key must carry a valid non-sentinel value.
  function validateWidgetFields(widget, fields, index, kind, diagnostics) {
    Object.keys(fields).forEach(function (fieldName) {
      const fieldSpec = fields[fieldName];
      const value = widget[fieldName];
      if (value === undefined) {
        if (fieldSpec.required) {
          pushInvalid(diagnostics, "required widget field missing", { index: index, kind: kind, field: fieldName });
        }
        return;
      }
      if (value === null) {
        pushInvalid(diagnostics, "widget field must be omitted instead of null", { index: index, kind: kind, field: fieldName });
        return;
      }
      validateWidgetFieldType(fieldSpec, fieldName, value, index, kind, diagnostics);
    });
  }

  function validateWidgetFieldType(fieldSpec, fieldName, value, index, kind, diagnostics) {
    const details = { index: index, kind: kind, field: fieldName, received: value };
    switch (fieldSpec.type) {
      case "string":
        if (typeof value !== "string" || (fieldSpec.required && value === "" && fieldName !== "text")) {
          pushInvalid(diagnostics, "widget field must be a string", details);
        } else if (fieldName === "grp" && !_visTypeRules.isGrain(value)) {
          pushInvalid(diagnostics, "widget grp must be a grouping grain", details);
        }
        break;
      case "number":
        if (typeof value !== "number" || !isFinite(value)) {
          pushInvalid(diagnostics, "widget field must be a finite number", details);
        } else if ((fieldName === "vals" || fieldName === "iter" || fieldName === "wzbar" || fieldName === "vcap") &&
            value !== 0 && value !== 1) {
          pushInvalid(diagnostics, "widget " + fieldName + " must be 0 or 1", details);
        }
        break;
      case "colour":
        if (typeof value !== "string" || value === "") {
          pushInvalid(diagnostics, "widget colour field must be a non-empty string/token", details);
        }
        break;
      case "styleToken":
        if (typeof value !== "string" && (typeof value !== "object" || value === null || Array.isArray(value))) {
          pushInvalid(diagnostics, "widget style field must be a string token or plain object", details);
        }
        break;
      default:
        break;
    }
  }

  return validateWidgetFields;
});
