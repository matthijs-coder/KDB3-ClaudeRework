/*
 * Registers the Cognos chrome selector catalogue on `_KDB.elements.selectors.<group>` (strings only, same values as
 * the `strings` of the config modules) and installs `runtime.cognosHost.chromeChecks`.
 * Groups by config module: rootChromeSelectors -> root, toolbar, dashboardPdf (the module's `pdf`), footer;
 * tabChromeSelectors -> tab, tabs; pageChromeSelectors -> dragDrop, page; filterDockChromeSelectors -> filterDock;
 * widgetChromeSelectors -> widget, focusMode, legend. Features read the registry at call time; the config modules
 * stay the single source of the values (tools/tests/w3-chrome-selectors.test.mjs pins the equality).
 */
define([
  "./config/rootChromeSelectors.js",
  "./config/tabChromeSelectors.js",
  "./config/pageChromeSelectors.js",
  "./config/filterDockChromeSelectors.js",
  "./config/widgetChromeSelectors.js",
  "./config/chromeLabels.js",
  "./chromeChecks.js"
], function (_rootChrome, _tabChrome, _pageChrome, _filterDockChrome, _widgetChrome, _chromeLabels, _createChromeChecks) {
  "use strict";

  var CATALOG = [
    ["root", _rootChrome.root],
    ["toolbar", _rootChrome.toolbar],
    ["dashboardPdf", _rootChrome.pdf],
    ["footer", _rootChrome.footer],
    ["tab", _tabChrome.tab],
    ["tabs", _tabChrome.tabs],
    ["dragDrop", _pageChrome.dragDrop],
    ["page", _pageChrome.page],
    ["filterDock", _filterDockChrome.filterDock],
    ["widget", _widgetChrome.widget],
    ["focusMode", _widgetChrome.focusMode],
    ["legend", _widgetChrome.legend]
  ];

  function applyChromeCatalog(_KDB, namespace, entries, selectorMeta) {
    var bucket = Object.assign({}, _KDB.elements.selectors[namespace] || {});
    var key;
    var entry;
    for (key in entries) {
      if (!Object.prototype.hasOwnProperty.call(entries, key)) continue;
      entry = entries[key];
      if (!entry || entry.selector == null) continue;
      bucket[key] = entry.selector;
      selectorMeta[namespace + "." + key] = {
        required: entry.required === true,
        selector: entry.selector
      };
    }
    _KDB.elements.selectors[namespace] = bucket;
  }

  function registerChromeLabels(_KDB) {
    var labels;
    _KDB.config = _KDB.config || {};
    labels = _KDB.config.labels = _KDB.config.labels || {};
    labels.de = labels.de || {};
    labels.de.chrome = Object.assign({}, _chromeLabels, labels.de.chrome || {});
  }

  function registerCognosHostSelectors(_KDB) {
    var checks = _createChromeChecks();
    var selectorMeta;
    var idx;
    _KDB.elements = _KDB.elements || {};
    _KDB.elements.selectors = _KDB.elements.selectors || {};
    selectorMeta = checks.ensureRuntime(_KDB).selectorMeta;
    _KDB.runtime.cognosHost.chromeChecks = checks;
    registerChromeLabels(_KDB);
    for (idx = 0; idx < CATALOG.length; idx += 1) {
      applyChromeCatalog(_KDB, CATALOG[idx][0], CATALOG[idx][1].entries, selectorMeta);
    }
    return _KDB.elements.selectors;
  }

  return registerCognosHostSelectors;
});
