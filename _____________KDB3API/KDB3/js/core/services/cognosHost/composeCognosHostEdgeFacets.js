define([
  "./facets/dashboard/createDashboardAdapter.js",
  "./facets/messages/createMessagesAdapter.js",
  "./facets/tabs/createTabsAdapter.js",
  "./facets/dataSources/createDataSourcesAdapter.js"
], function (
  _createDashboardAdapter,
  _createMessagesAdapter,
  _createTabsAdapter,
  _createDataSourcesAdapter
) {
  "use strict";

  // Slice-5 edge factories. Receives the same `_deps` object the core
  // composer passes into each factory. Owner orchestrators stamp
  // `dashboardFacet` / `messagesFacet` / `tabsFacet` / `dataSourcesFacet`
  // on their runtime.
  function composeCognosHostEdgeFacets(_deps) {
    return {
      dashboard: _createDashboardAdapter(_deps),
      messages: _createMessagesAdapter(_deps),
      tabs: _createTabsAdapter(_deps),
      dataSources: _createDataSourcesAdapter(_deps)
    };
  }

  return composeCognosHostEdgeFacets;
});
