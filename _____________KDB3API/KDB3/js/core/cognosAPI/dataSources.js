define([], function () {
  "use strict";

  function __controller(_KDB) {
    try {
      return {
        getDataSourcesFeature: function () {
          return __getDashboardAPI().getFeature("DataSources");
        },

        getDataSourcesArray: function () {
          return __getDashboardAPI().getSpec().dataSources.sources;
        },

        getDataSource: function () {
          return __getDashboardAPI().getSources();
        },

        getDataSourceList: function () {
          return __getDashboardAPI().getFeature("DataSources").getDataSourceList();
        },

        getActiveDataSourceId: function () {
          return __getDashboardAPI().getFeature("DataSources").getActiveDataSourceId();
        },

        setActiveDataSourceId: function (_dataSourceId) {
          return __getDashboardAPI().getFeature("DataSources").setActiveDataSourceId(_dataSourceId);
        },
      };
    } catch (error) {
      console.error("[KDB][__controller] failed", error);
      throw error;
    }
  }

  return __controller;
});
