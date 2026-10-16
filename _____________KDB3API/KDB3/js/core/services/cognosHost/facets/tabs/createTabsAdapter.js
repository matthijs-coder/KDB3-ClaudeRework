define([
  "./listTabs.js",
  "./getTabName.js",
  "./setTabName.js"
], function (_listTabs, _getTabName, _setTabName) {
  "use strict";

  // The tabs facet of the cognosHost service. Named with the Adapter suffix
  // that naming.mdc prescribes for host adapters; "facet" is the architectural
  // term for a domain-scoped part of the ring-1 adapter.
  //
  // listTabs returns Outcome<TabDescriptor[]>. Host local is tabsApi.
  // Tab chrome clicks stay chrome; getTabsContent is not published
  // (raw spec arrays must not cross the facet boundary).
  function createTabsAdapter(_deps) {
    var ctx = {
      _KDB: _deps._KDB,
      generation: _deps.generation,
      isDisposed: _deps.isDisposed
    };
    return {
      listTabs: _listTabs.bind(null, ctx),
      getTabName: _getTabName.bind(null, ctx),
      setTabName: _setTabName.bind(null, ctx)
    };
  }

  return createTabsAdapter;
});
