define([], function () {
  "use strict";

  return {
    "defaultType": "Line",
    "visualizations": {
      "Line": {
        "id": "Line",
        "propertyValues": {
          "titleMode": "customTitle",
          "itemAxis.title.visible": false,
          "valueAxis.title.visible": false,
          "gridLines.visible": false
        },
        "layoutPropertyValues": {
          "itemAxis.gridLines.visible": false,
          "valueAxis.gridLines.visible": false,
          "valueLabels.visible": false,
          "labels.visible": false
        }
      },
      "StackedBar": {
        "id": "StackedBar",
        "propertyValues": {
          "titleMode": "customTitle",
          "itemAxis.title.visible": false,
          "valueAxis.title.visible": false,
          "gridLines.visible": false
        },
        "layoutPropertyValues": {
          "itemAxis.gridLines.visible": false,
          "valueAxis.gridLines.visible": false,
          "valueLabels.visible": true,
          "labels.visible": true
        }
      },
      "StackedColumn": {
        "id": "StackedColumn",
        "propertyValues": {
          "titleMode": "customTitle",
          "itemAxis.title.visible": false,
          "valueAxis.title.visible": false,
          "gridLines.visible": false
        },
        "layoutPropertyValues": {
          "itemAxis.gridLines.visible": false,
          "valueAxis.gridLines.visible": false,
          "valueLabels.visible": true,
          "labels.visible": true
        }
      },
      "Pie": {
        "id": "Pie",
        "propertyValues": {
          "titleMode": "customTitle",
          "itemAxis.title.visible": false,
          "valueAxis.title.visible": false,
          "gridLines.visible": false
        },
        "layoutPropertyValues": {
          "itemAxis.gridLines.visible": false,
          "valueAxis.gridLines.visible": false,
          "valueLabels.visible": true,
          "labels.visible": true,
          "labelLocation": "centerHorizontal"
        }
      },
      "List": {
        "id": "List",
        "propertyValues": {
          "titleMode": "customTitle",
          "itemAxis.title.visible": false,
          "valueAxis.title.visible": false,
          "gridLines.visible": false
        },
        "layoutPropertyValues": {
          "itemAxis.gridLines.visible": false,
          "valueAxis.gridLines.visible": false,
          "hideSummaries": true
        }
      },
      "Prognose": {
        "id": "com.ibm.vis.custom.prognoseyearlinechart",
        "propertyValues": {
          "titleMode": "customTitle",
          "itemAxis.title.visible": false,
          "valueAxis.title.visible": false,
          "gridLines.visible": false
        },
        "layoutPropertyValues": {
          "itemAxis.gridLines.visible": false,
          "valueAxis.gridLines.visible": false,
          "valueLabels.visible": false,
          "labels.visible": false,
          "x.ticks.marks.show": false,
          "y.ticks.marks.show": false,
          "x.labels.orientation": "diagonal",
          "x.grid.show": false,
          "y.grid.show": false
        }
      },
      "TopN": {
        "id": "List",
        "propertyValues": {
          "titleMode": "customTitle",
          "itemAxis.title.visible": false,
          "valueAxis.title.visible": false,
          "gridLines.visible": false
        },
        "layoutPropertyValues": {
          "itemAxis.gridLines.visible": false,
          "valueAxis.gridLines.visible": false,
          "hideSummaries": true
        }
      },
    },
    "topNOptions": {
      "0": 0,
      "default": 0,
      "top-10": 10,
      "top-5": 5,
      "top-3": 3,
      "top-2": 2,
      "top-1": 1,
      "bottom-10": 10,
      "bottom-5": 5,
      "bottom-3": 3,
      "bottom-2": 2,
      "bottom-1": 1
    }
  };
});
