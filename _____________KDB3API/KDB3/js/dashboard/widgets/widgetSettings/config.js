define([
  "./config/dropdownDefaults.js"
], function (_dropdownDefaults) {
  "use strict";

  // START HERE for settings consequences: every settings kind, the owner that applies it and the
  // byWidget key it commits to. A kind without an action type for the resolved target is unsupported.
  const KIND_TABLE = {
    visualization: { target: "widgetVis", actionType: "widgetVis/applyVisType", stateKey: "visType", control: "visType", isVis: true },
    dimension: { target: "widgetVis", actionType: "widgetVis/applyDimension", stateKey: "dimension", control: "dimension", isVis: true },
    topN: { target: "widgetVis", actionType: "widgetVis/applyTopNChoice", stateKey: "topNChoice", control: "topNChoice", isVis: true },
    showValues: { target: "widgetVis", actionType: "widgetVis/applyShowValues", stateKey: "showValues", control: "showValues", isVis: true },
    grouping: { target: "widgetVis", actionType: "widgetVis/applyGrouping", stateKey: "grouping", control: "grouping", isVis: true },
    iterator: { target: "widgetVis", actionType: "widgetVis/applyIteratorZoom", stateKey: "iterator", control: "iterator", isVis: true },
    zoom: { target: "widgetVis", actionType: "widgetVis/applyIteratorZoom", stateKey: "zoom", control: "zoom", isVis: true },
    valueCaption: { target: "widgetVis", actionType: "widgetVis/applyIteratorZoom", stateKey: "valueCaption", control: "valueCaption", isVis: true },
    maximize: { target: "widgetVis", actionType: "widgetVis/maximizeToggle" },
    unmaximize: { target: "widgetVis", actionType: "widgetVis/maximizeToggle" },
    title: { target: "widgetText", actionTypeByInteraction: { iconClick: "widgetText/commitTextEdit", default: "widgetText/applyTitle" } },
    fontSize: { target: "widgetText", actionType: "widgetText/applyFontSize", stateKey: "fontSize" },
    backgroundColor: { target: "widgetSettings", actionType: "widgetSettings/commitColour", stateKey: "colour" },
    layout: { targetByWidgetType: { text: "widgetText" }, actionType: "widgetText/applyRestyle", stateKey: "restyle" },
    move: { target: "widgetBase", actionTypeByInteraction: { dropdownOption: "widgetBase/setMoveMode", default: "widgetBase/enableMove" } },
    resize: { target: "widgetBase", actionType: "widgetBase/resizeToggle" },
    reset: { target: "widgetBase", actionType: "widgetBase/routeToLaunchpad" }
  };
  const FALLBACK_TARGET = "widgetBase";
  const SCAFFOLD_TARGETS = ["widgetVis", "widgetText", "widgetSettings"];
  const KIND_ALIASES = {
    dimensions: "dimension",
    restyle: "layout",
    text: "title",
    backgroundcolor: "backgroundColor",
    topn: "topN",
    fontsize: "fontSize",
    showvalues: "showValues",
    valuecaption: "valueCaption"
  };

  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function normalizeKind(kind) {
    const normalized = String(kind || "").toLowerCase();
    return hasOwn(KIND_ALIASES, normalized) ? KIND_ALIASES[normalized] : normalized;
  }

  function readKindEntry(kind) {
    const normalized = normalizeKind(kind);
    return hasOwn(KIND_TABLE, normalized) ? KIND_TABLE[normalized] : null;
  }

  function resolveTarget(widgetType, kind) {
    const entry = readKindEntry(kind);
    if (!entry) {
      return FALLBACK_TARGET;
    }
    if (entry.targetByWidgetType) {
      return hasOwn(entry.targetByWidgetType, widgetType) ? entry.targetByWidgetType[widgetType] : FALLBACK_TARGET;
    }
    return entry.target;
  }

  function isTargetOfEntry(entry, target) {
    if (entry.targetByWidgetType) {
      return Object.keys(entry.targetByWidgetType).some(function (widgetType) {
        return entry.targetByWidgetType[widgetType] === target;
      });
    }
    return entry.target === target;
  }

  function resolveType(target, kind, interaction) {
    const entry = readKindEntry(kind);
    if (!entry || !isTargetOfEntry(entry, target)) {
      return SCAFFOLD_TARGETS.indexOf(target) >= 0 ? target + "/scaffoldNoop" : "widgetBase/scaffoldNoop";
    }
    const byInteraction = entry.actionTypeByInteraction;
    if (!byInteraction) {
      return entry.actionType;
    }
    return hasOwn(byInteraction, interaction) ? byInteraction[interaction] : byInteraction.default;
  }

  // Exact (not normalized) lookup, falling back to the kind itself: callers pass either canonical kinds
  // or the raw kind reported by the downstream owner.
  function stateKeyForKind(kind) {
    const key = String(kind || "");
    const entry = hasOwn(KIND_TABLE, key) ? KIND_TABLE[key] : null;
    return entry && entry.stateKey ? entry.stateKey : key;
  }

  function controlForKind(kind) {
    const entry = readKindEntry(kind);
    return entry && entry.control ? entry.control : null;
  }

  function isWidgetVisKind(kind) {
    const entry = readKindEntry(kind);
    return !!(entry && entry.isVis === true);
  }

  const LABELS = {
    topNGroupingRequired: "Um die Top-N Funktion zu verwenden, muss zuerst eine Gruppierungsdimension gewählt werden."
  };

  const IMAGE_BASE_PATH = "./v1/ext/KDB3/images/";

  function readImagePath(_KDB) {
    void _KDB;
    return IMAGE_BASE_PATH;
  }

  const OPTIONS = {
    fontSize: [
      { key: "default", label: "Automatisch", value: "automatic" },
      { key: "8px", label: "8px", value: "8px;" },
      { key: "10px", label: "10px", value: "10px;" },
      { key: "12px", label: "12px", value: "12px;" },
      { key: "14px", label: "14px", value: "14px;" },
      { key: "16px", label: "16px", value: "16px;" },
      { key: "18px", label: "18px", value: "18px;" },
      { key: "20px", label: "20px", value: "20px;" },
      { key: "22px", label: "22px", value: "22px;" },
      { key: "24px", label: "24px", value: "24px;" },
      { key: "26px", label: "26px", value: "26px;" },
      { key: "28px", label: "28px", value: "28px;" },
      { key: "30px", label: "30px", value: "30px;" }
    ],
    topN: [
      { key: "top-10", label: "Top-10", value: "10" },
      { key: "top-5", label: "Top-5", value: "5" },
      { key: "top-3", label: "Top-3", value: "3" },
      { key: "top-2", label: "Top-2", value: "2" },
      { key: "top-1", label: "Top-1", value: "1" }
    ],
    restyle: [
      { key: "default", label: "Default", value: "KDB_widgetHeader_defaultStyle" },
      { key: "rahmen(alle)", label: "Rahmen(alle)", value: "KDB_widgetHeader_allBordersStyle" },
      { key: "rahmen(unterer)", label: "Rahmen(unterer)", value: "KDB_widgetHeader_bottomBorderStyle" },
      { key: "rahmen(oberer)", label: "Rahmen(oberer)", value: "KDB_widgetHeader_topBorderStyle" },
      { key: "zentriert", label: "Zentriert", value: "KDB_widgetHeader_centeredStyle" },
      { key: "rahmen(alle) und zentriert", label: "Rahmen(alle) und zentriert", value: "KDB_widgetHeader_allBordersCenteredStyle" },
      { key: "rahmen(unterer) und zentriert", label: "Rahmen(unterer) und zentriert", value: "KDB_widgetHeader_bottomBorderCenteredStyle" },
      { key: "rahmen(oberer) und zentriert", label: "Rahmen(oberer) und zentriert", value: "KDB_widgetHeader_topBorderCenteredStyle" }
    ],
    visualization: [
      { key: "line", label: "Linie", value: "line", icon: "line.png" },
      { key: "pie", label: "Kreisdiagramm", value: "pie", icon: "pie.png" },
      { key: "stackedbar", label: "Balkendiagramm", value: "stackedbar", icon: "stackedbar.png" },
      { key: "stackedcolumn", label: "Säulendiagramm", value: "stackedcolumn", icon: "stackedcolumn.png" },
      { key: "list", label: "Tabelle", value: "list", icon: "list.png" },
      { key: "prognose", label: "Prognose", value: "com.ibm.vis.custom.prognoseyear", icon: "prognose.png" }
    ],
    grouping: [
      { key: "inherit", label: "Diagrammstandard", value: "inherit", isDefault: true },
      { key: "stichtag", label: "Stichtag", value: "stichtag" },
      { key: "jahr", label: "Jahr", value: "jahr" },
      { key: "jahrStichtag", label: "Jahr | Stichtag", value: "jahrStichtag" },
      { key: "stichtagProJahrH", label: "Stichtag pro Jahr (H)", value: "stichtagProJahrH" },
      { key: "stichtagProJahrV", label: "Stichtag pro Jahr (V)", value: "stichtagProJahrV" }
    ],
    showValues: [
      { key: "off", label: "Aus", value: "off" },
      { key: "inherit", label: "Standard", value: "inherit", isDefault: true },
      { key: "on", label: "Ein", value: "on" }
    ],
    iterator: [
      { key: "iter-off", label: "Aus", value: "off" },
      { key: "iter-inherit", label: "Standard", value: "inherit", isDefault: true },
      { key: "iter-on", label: "Ein", value: "on" }
    ],
    zoom: [
      { key: "zoom-off", label: "Aus", value: "off" },
      { key: "zoom-inherit", label: "Standard", value: "inherit", isDefault: true },
      { key: "zoom-on", label: "Ein", value: "on" }
    ],
    valueCaption: [
      { key: "vcap-off", label: "Aus", value: "off" },
      { key: "vcap-inherit", label: "Standard", value: "inherit", isDefault: true },
      { key: "vcap-on", label: "Ein", value: "on" }
    ],
    move: [
      { key: "default", label: "default", value: "default" },
      { key: "einmalig", label: "einmalig", value: "oneShot" },
      { key: "aktiv", label: "aktiv", value: "persistent" }
    ],
    title: [
      { key: "default", label: "default", value: "default" }
    ]
  };

  function optionKeyMatches(option, key) {
    if (!key) {
      return false;
    }
    return String(option.key || "").toLowerCase() === String(key).toLowerCase();
  }

  function readOptionUseValue(option) {
    if (option.useValue != null) {
      return option.useValue;
    }
    if (option.value != null) {
      return option.value;
    }
    return option.key;
  }

  function normalizeUseValue(value) {
    return String(value == null ? "" : value).toLowerCase();
  }

  function optionUseValueMatches(option, useValue) {
    if (useValue == null) {
      return false;
    }
    return normalizeUseValue(readOptionUseValue(option)) === normalizeUseValue(useValue);
  }

  function findMatchingOption(source, defaultConfig) {
    return source.find(function (option) { return optionKeyMatches(option, defaultConfig.key); })
      || source.find(function (option) { return optionUseValueMatches(option, defaultConfig.useValue); })
      || null;
  }

  function isDefaultDuplicate(option, defaultConfig, defaultOption) {
    return optionKeyMatches(option, defaultConfig.key)
      || optionKeyMatches(option, defaultOption.key)
      || optionUseValueMatches(option, defaultConfig.useValue)
      || optionUseValueMatches(option, defaultOption.useValue);
  }

  function clearDefaultFlag(option) {
    const copy = Object.assign({}, option);
    delete copy.isDefault;
    return copy;
  }

  function mergeWithDefault(option, defaultConfig) {
    const useValue = defaultConfig.useValue != null ? defaultConfig.useValue : readOptionUseValue(option);
    const displayValue = defaultConfig.displayValue || option.displayValue || option.label || option.key || useValue;
    return {
      key: defaultConfig.key || option.key,
      displayValue: displayValue,
      useValue: useValue,
      label: displayValue,
      value: useValue,
      icon: option.icon,
      isDefault: true
    };
  }

  function applyConfiguredDefault(options, configKey) {
    const defaultConfig = _dropdownDefaults[configKey];
    if (!defaultConfig) {
      return Array.isArray(options) ? options.slice() : [];
    }
    const source = Array.isArray(options) ? options : [];
    const defaultOption = mergeWithDefault(findMatchingOption(source, defaultConfig) || {}, defaultConfig);
    const others = source
      .filter(function (option) { return !isDefaultDuplicate(option, defaultConfig, defaultOption); })
      .map(clearDefaultFlag);
    return [defaultOption].concat(others);
  }

  function isOptionInitiallySelected(options, index) {
    if (!Array.isArray(options) || options.length === 0) {
      return false;
    }
    const hasConfiguredDefault = options.some(function (option) { return option.isDefault === true; });
    if (hasConfiguredDefault) {
      return options[index].isDefault === true;
    }
    return index === 0;
  }

  return {
    KIND_TABLE: KIND_TABLE,
    normalizeKind: normalizeKind,
    resolveTarget: resolveTarget,
    resolveType: resolveType,
    stateKeyForKind: stateKeyForKind,
    controlForKind: controlForKind,
    isWidgetVisKind: isWidgetVisKind,
    LABELS: LABELS,
    IMAGE_BASE_PATH: IMAGE_BASE_PATH,
    readImagePath: readImagePath,
    options: OPTIONS,
    findMatchingOption: findMatchingOption,
    applyConfiguredDefault: applyConfiguredDefault,
    isOptionInitiallySelected: isOptionInitiallySelected
  };
});
