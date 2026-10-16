define([], function () {
  const padConfig = {
    visualization: {
      padKey: "visualization",
      elementId: "KDB_visualizationLaunchpad"
    },
    text: {
      padKey: "text",
      elementId: "KDB_textLaunchpad"
    },
    dataTables: {
      padKey: "dataTables",
      elementId: "KDB_dataTablesPad"
    },
    topN: {
      padKey: "topN",
      elementId: "KDB_topNPad"
    },
    otherResources: {
      padKey: "otherResources",
      elementId: "KDB_otherResourcesPad"
    }
  };

  return padConfig;
});
