const visualizationsPropId = JSON.stringify({
  visualizationsPropId: {
  defaultTopN: "0",
  defaultWidth: "10cm",
  defaultHeight: "10cm",
  defaultBackgroundColor: "",
  defaultType: "Line",
  visualizations: {
    Line: { id: "Line", tooltip: "Linie" },
    StackedBar: { id: "StackedBar", tooltip: "Gestapeltes Balkendiagramm" },
    StackedColumn: { id: "StackedColumn", tooltip: "Gestapelte Säule" },
    Pie: { id: "pie", tooltip: "Kreisdiagramm" },
    List: { id: "List", tooltip: "Tabelle" },
    Prognose: { id: "com.ibm.vis.custom.prognoseyearlinechart", tooltip: "Prognoselinie" },
  }
  },
});
