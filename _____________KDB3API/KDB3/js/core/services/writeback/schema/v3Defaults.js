define([], function () {
  "use strict";

  // Normative schema data for compact v3 per contracts/writeback.md §4.
  // This module is data-only: defaults, omit rules, aliases and sentinels.
  // normalizeV3 consumes these tables; validateV3 rejects unknown encodings.
  //
  // Descriptive-key schema (PO-approved 2026-07-10): all sections are plain
  // objects with keys of at most 5 characters; omitted key = owner default.

  const SCHEMA_VERSION = 3;

  // Canonical top-level field order (§4, §2.4 field ordering).
  const TOP_LEVEL_FIELD_ORDER = Object.freeze(["v", "pkg", "canv", "sett", "head", "foot", "filt", "tabs", "wgts"]);

  // §4.1.1 sett key catalog. Unknown sett keys are invalid.
  // ownerStatePath / defaultSource are contract references into kdbControl state;
  // the owner restore delta resolves them at restore time.
  // sett.dash.hidSu is retired / ignored by restore; type stays flag01 so old JSON validates.
  const SETT_KEY_CATALOG = Object.freeze({
    dash: Object.freeze({
      w: Object.freeze({ ownerStatePath: "settings.dashboard.width", type: "number", defaultSource: "settingsDimensionConfig.dashboard.width.default" }),
      h: Object.freeze({ ownerStatePath: "settings.dashboard.height", type: "number", defaultSource: "settingsDimensionConfig.dashboard.height.default" }),
      bg: Object.freeze({ ownerStatePath: "settings.dashboard.backgroundColor", type: "colour", defaultSource: "settingsColorDefaults.colorInputs.dashboardBg" }),
      hidWs: Object.freeze({ ownerStatePath: "settings.dashboard.hideWidgetSettingsButtons", type: "flag01", defaultSource: "true", omitWhenValue: 1 }),
      hidSu: Object.freeze({ ownerStatePath: "settings.dashboard.hideSuButtons", type: "flag01", defaultSource: "false", omitWhenValue: 0 }),
      devOn: Object.freeze({ ownerStatePath: "settings.dashboard.isDeveloperMode", type: "flag01", defaultSource: "false", omitWhenValue: 0 }),
    }),
    panel: Object.freeze({
      bg: Object.freeze({ ownerStatePath: "settings.controlPanel.backgroundColor", type: "colour", defaultSource: "settingsColorDefaults.colorInputs.panelBg" }),
      btn: Object.freeze({ ownerStatePath: "settings.controlPanel.buttonColor", type: "colour", defaultSource: "settingsColorDefaults.colorInputs.panelButton" }),
      act: Object.freeze({ ownerStatePath: "settings.controlPanel.actionButtonColor", type: "colour", defaultSource: "settingsColorDefaults.colorInputs.panelActionButton" }),
      inBg: Object.freeze({ ownerStatePath: "settings.controlPanel.innerBackgroundColor", type: "colour", defaultSource: "settingsColorDefaults.colorInputs.panelInnerBg" }),
    }),
    newwg: Object.freeze({
      vis: Object.freeze({
        w: Object.freeze({ ownerStatePath: "settings.defaultsNew.visualization.width", type: "number", defaultSource: "settingsDimensionConfig.visualization.width.default" }),
        h: Object.freeze({ ownerStatePath: "settings.defaultsNew.visualization.height", type: "number", defaultSource: "settingsDimensionConfig.visualization.height.default" }),
        bg: Object.freeze({ ownerStatePath: "settings.defaultsNew.visualization.backgroundColor", type: "colour", defaultSource: "settingsColorDefaults.colorInputs.graphBg" }),
      }),
      txt: Object.freeze({
        w: Object.freeze({ ownerStatePath: "settings.defaultsNew.comment.width", type: "number", defaultSource: "settingsDimensionConfig.comment.width.default" }),
        h: Object.freeze({ ownerStatePath: "settings.defaultsNew.comment.height", type: "number", defaultSource: "settingsDimensionConfig.comment.height.default" }),
        bg: Object.freeze({ ownerStatePath: "settings.defaultsNew.comment.backgroundColor", type: "colour", defaultSource: "settingsColorDefaults.colorInputs.commentBg" }),
      }),
    }),
  });

  // §4.2 / §4.7 header/footer sentinel maps (owner status string -> compact 0/1/omit).
  const HEADER_STATUS_TO_ON = Object.freeze({ active: 1, removed: 0, idle: null }); // null => omit
  const FOOTER_STATUS_TO_ON = Object.freeze({ active: 1, removed: 0, idle: null }); // null => omit

  const HEAD_KEYS = Object.freeze(["on", "title", "sub", "subOn", "icon"]);
  const FOOT_KEYS = Object.freeze(["on"]);

  // §4.5 widget kinds.
  const WIDGET_KINDS = Object.freeze({
    supported: Object.freeze(["vis", "txt"]),
    reserved: Object.freeze(["tbl", "topn"]),
  });

  // §4.5.1 widget object field catalogs. Common keys apply to every kind;
  // per-kind keys carry the delta payload. Omitted optional key = owner default.
  const WIDGET_COMMON_FIELDS = Object.freeze({
    tab: Object.freeze({ type: "nonNegativeInteger", required: true }),
    x: Object.freeze({ type: "number", required: true }),
    y: Object.freeze({ type: "number", required: true }),
    w: Object.freeze({ type: "number", required: true }),
    h: Object.freeze({ type: "number", required: true }),
    kind: Object.freeze({ type: "string", required: true }),
  });

  const WIDGET_FIELDS = Object.freeze({
    vis: Object.freeze({
      code: Object.freeze({ type: "string", required: true }),
      type: Object.freeze({ type: "string", required: true }),
      dim: Object.freeze({ type: "string", required: false }),
      topn: Object.freeze({ type: "string", required: false }),
      vals: Object.freeze({ type: "number", required: false }),
      grp: Object.freeze({ type: "string", required: false }),
      iter: Object.freeze({ type: "number", required: false }),
      wzbar: Object.freeze({ type: "number", required: false }),
      vcap: Object.freeze({ type: "number", required: false }),
      bgcol: Object.freeze({ type: "colour", required: false }),
      ctcol: Object.freeze({ type: "colour", required: false }),
    }),
    txt: Object.freeze({
      text: Object.freeze({ type: "string", required: true }),
      fsize: Object.freeze({ type: "number", required: false }),
      bgcol: Object.freeze({ type: "colour", required: false }),
      style: Object.freeze({ type: "styleToken", required: false }),
    }),
  });

  function isOmissionSentinel(value) {
    if (value === null || value === undefined) {
      return true;
    }
    if (typeof value === "string" && (value === "" || value.toLowerCase() === "none")) {
      return true;
    }
    return false;
  }

  function isDefaultHeadIcon(value) {
    if (value === undefined || value === null) {
      return true;
    }
    if (typeof value !== "string") {
      return false;
    }
    const stem = value.trim().replace(/\.png$/i, "");
    if (!stem) {
      return true;
    }
    var lower = stem.toLowerCase();
    return lower === "none" || lower === "default" || lower === "stadt-wien";
  }

  return Object.freeze({
    SCHEMA_VERSION: SCHEMA_VERSION,
    TOP_LEVEL_FIELD_ORDER: TOP_LEVEL_FIELD_ORDER,
    SETT_KEY_CATALOG: SETT_KEY_CATALOG,
    HEADER_STATUS_TO_ON: HEADER_STATUS_TO_ON,
    FOOTER_STATUS_TO_ON: FOOTER_STATUS_TO_ON,
    HEAD_KEYS: HEAD_KEYS,
    FOOT_KEYS: FOOT_KEYS,
    WIDGET_KINDS: WIDGET_KINDS,
    WIDGET_COMMON_FIELDS: WIDGET_COMMON_FIELDS,
    WIDGET_FIELDS: WIDGET_FIELDS,
    isOmissionSentinel: isOmissionSentinel,
    isDefaultHeadIcon: isDefaultHeadIcon,
  });
});
