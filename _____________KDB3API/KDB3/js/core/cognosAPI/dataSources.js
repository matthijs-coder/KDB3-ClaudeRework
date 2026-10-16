define([], function () {
  "use strict";

  function createDataSourcesApi() {
    return {
      // console helper / host knowledge base, no app caller
      getDataSourcesFeature: function () {
        return __getDashboardAPI().getFeature("DataSources");
      },

      // console helper / host knowledge base, no app caller
      getDataSourcesArray: function () {
        return __getDashboardAPI().getSpec().dataSources.sources;
      },

      // console helper / host knowledge base, no app caller
      getDataSource: function () {
        return __getDashboardAPI().getSources();
      },

      getDataSourceList: function () {
        return __getDashboardAPI().getFeature("DataSources").getDataSourceList();
      },

      // console helper / host knowledge base, no app caller
      getActiveDataSourceId: function () {
        return __getDashboardAPI().getFeature("DataSources").getActiveDataSourceId();
      },

      // console helper / host knowledge base, no app caller
      setActiveDataSourceId: function (_dataSourceId) {
        return __getDashboardAPI().getFeature("DataSources").setActiveDataSourceId(_dataSourceId);
      }
    };
  }

  return createDataSourcesApi;
});
