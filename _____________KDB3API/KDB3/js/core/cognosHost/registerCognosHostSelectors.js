define([
  "./config/rootChromeSelectors.js",
  "./config/tabChromeSelectors.js",
  "./config/pageChromeSelectors.js",
  "./config/filterDockChromeSelectors.js",
  "./config/widgetChromeSelectors.js",
  "./effects/applyChromeCatalog.js",
  "./effects/createChromeChecks.js"
], function (
  _rootChrome,
  _tabChrome,
  _pageChrome,
  _filterDockChrome,
  _widgetChrome,
  _applyChromeCatalog,
  _createChromeChecks
) {
  "use strict";

  function registerCognosHostSelectors(_KDB) {
    var checks;
    try {
      _KDB.elements = _KDB.elements || {};
      _KDB.elements.selectors = _KDB.elements.selectors || {};
      checks = _createChromeChecks();
      checks.ensureRuntime(_KDB);
      _KDB.runtime.cognosHost.chromeChecks = checks;
      _applyChromeCatalog(_KDB, "root", _rootChrome.root.entries);
      _applyChromeCatalog(_KDB, "toolbar", _rootChrome.toolbar.entries);
      _applyChromeCatalog(_KDB, "dashboardPdf", _rootChrome.pdf.entries);
      _applyChromeCatalog(_KDB, "footer", _rootChrome.footer.entries);
      _applyChromeCatalog(_KDB, "tab", _tabChrome.tab.entries);
      _applyChromeCatalog(_KDB, "tabs", _tabChrome.tabs.entries);
      _applyChromeCatalog(_KDB, "dragDrop", _pageChrome.dragDrop.entries);
      _applyChromeCatalog(_KDB, "page", _pageChrome.page.entries);
      _applyChromeCatalog(_KDB, "filterDock", _filterDockChrome.filterDock.entries);
      _applyChromeCatalog(_KDB, "widget", _widgetChrome.widget.entries);
      _applyChromeCatalog(_KDB, "focusMode", _widgetChrome.focusMode.entries);
      _applyChromeCatalog(_KDB, "legend", _widgetChrome.legend.entries);
      return _KDB.elements.selectors;
    } catch (error) {
      console.error("[cognosHost.registerCognosHostSelectors] failed", error);
      throw error;
    }
  }

  return registerCognosHostSelectors;
});
