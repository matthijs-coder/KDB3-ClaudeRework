define([], function () {
  "use strict";

  return {
    "dataTableByKennzahlenTable": {
      "Personal_KDB": {
        "datasourceName": "Personal_KDB"
      }
    },
    "visTypeByBucket": {
      "Line": {
        "cognosVisualizationTypeId": "Line",
        "byKennzahlenTable": {
          "Personal_KDB": {
            "values": "[Personal_KDB_TM1].[KDB Kennzahlen]",
            "categories": "[Personal_KDB_TM1].[Monat_flach].[Monat_flach].[Monat]",
            "series": [
              "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]"
            ],
            "color": "",
            "repeatHorizontal": "",
            "repeatVertical": "",
            "dimensionSelectionAffects": "series",
            "slotComposition": {
              "series": {
                "hierarchy": {
                  "mode": "insertAfterSelectedDimensionOrAt",
                  "targetIndex": 0
                }
              }
            },
            "widgetFilter": {
              "AggregationstypId": {
                "include": [
                  "Stichtag"
                ]
              },
              "[Personal_KDB_TM1].[Monat_flach].[Monat_flach].[Monat]": {
                "exclude": [
                  "Gesamt",
                  "ALLE"
                ]
              },
              "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]": {
                "exclude": [
                  "Gesamt",
                  "ALLE"
                ]
              }
            }
          }
        }
      },
      "StackedBar": {
        "cognosVisualizationTypeId": "StackedBar",
        "byKennzahlenTable": {
          "Personal_KDB": {
            "values": "[Personal_KDB_TM1].[KDB Kennzahlen]",
            "categories": [
              "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]"
            ],
            "series": "",
            "color": "",
            "repeatHorizontal": "",
            "repeatVertical": "",
            "dimensionSelectionAffects": "color",
            "widgetFilter": {
              "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]": {
                "exclude": [
                  "ALLE",
                  "Gesamt"
                ]
              }
            }
          }
        }
      },
      "StackedColumn": {
        "cognosVisualizationTypeId": "StackedColumn",
        "byKennzahlenTable": {
          "Personal_KDB": {
            "values": "[Personal_KDB_TM1].[KDB Kennzahlen]",
            "categories": [
              "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]"
            ],
            "series": "",
            "color": "",
            "repeatHorizontal": "",
            "repeatVertical": "",
            "dimensionSelectionAffects": "color",
            "widgetFilter": {
              "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]": {
                "exclude": [
                  "ALLE",
                  "Gesamt"
                ]
              }
            }
          }
        }
      },
      "pie": {
        "cognosVisualizationTypeId": "Pie",
        "byKennzahlenTable": {
          "Personal_KDB": {
            "values": "[Personal_KDB_TM1].[KDB Kennzahlen]",
            "categories": [
              "[Personal_KDB_TM1].[Geschlecht].[Geschlecht].[Geschlecht]"
            ],
            "series": "",
            "color": "",
            "repeatHorizontal": [
              "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]"
            ],
            "repeatVertical": "",
            "dimensionSelectionAffects": "categories",
            "slotComposition": {
              "repeatVertical": {
                "hierarchy": {
                  "mode": "insertBeforeSelectedDimensionOrBeforeLast"
                }
              }
            },
            "widgetFilter": {
              "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]": {
                "exclude": [
                  "ALLE",
                  "Gesamt"
                ]
              },
              "Geschlecht": {
                "exclude": [
                  "ALLE",
                  "Gesamt"
                ]
              }
            }
          }
        }
      },
      "List": {
        "cognosVisualizationTypeId": "List",
        "byKennzahlenTable": {
          "Personal_KDB": {
            "values": "",
            "categories": "",
            "series": "",
            "color": "",
            "repeatHorizontal": "",
            "repeatVertical": "",
            "grid_cols": [
              "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]",
              "[Personal_KDB_TM1].[Monat_flach].[Monat_flach].[Monat]",
              "[Personal_KDB_TM1].[KDB Kennzahlen].[replaceKennzahlName]"
            ],
            "dimensionSelectionAffects": "grid_cols",
            "slotComposition": {
              "grid_cols": {
                "dimension": {
                  "mode": "prependThenMoveFirstToIndex",
                  "targetIndex": 2
                },
                "hierarchy": {
                  "mode": "insertBeforeSelectedDimensionOrBeforeLast"
                }
              }
            },
            "widgetFilter": {
              "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]": {
                "exclude": [
                  "ALLE",
                  "Gesamt"
                ]
              }
            }
          }
        }
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        "cognosVisualizationTypeId": "com.ibm.vis.custom.prognoseyearlinechart",
        "byKennzahlenTable": {
          "Personal_KDB": {
            "values": "[Personal_KDB_TM1].[KDB Kennzahlen]",
            "categories": "[Personal_KDB_TM1].[Monat_flach].[Monat_flach].[Monat]",
            "series": [
              "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]",
              "[Personal_KDB_TM1].[Stichtag].[Stichtag].[Stichtag]"
            ],
            "color": "",
            "repeatHorizontal": "",
            "repeatVertical": "",
            "dimensionSelectionAffects": "series",
            "slotComposition": {
              "series": {
                "hierarchy": {
                  "mode": "insertAfterSelectedDimensionOrAt",
                  "targetIndex": 0
                }
              }
            },
            "widgetFilter": {
              "[Personal_KDB_TM1].[Stichtag].[Stichtag].[Stichtag]": {
                "include": [
                  "PKZ",
                  "PKZ inkl. Prognose"
                ]
              },
              "AggregationstypId": {
                "include": [
                  "Stichtag"
                ]
              },
              "[Personal_KDB_TM1].[Monat_flach].[Monat_flach].[Monat]": {
                "exclude": [
                  "ALLE",
                  "Gesamt"
                ]
              },
              "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]": {
                "exclude": [
                  "ALLE",
                  "Gesamt"
                ]
              }
            }
          }
        }
      }
    },
    "visualizationTypeToBucket": {
      "Line": "Line",
      "StackedBar": "StackedBar",
      "StackedColumn": "StackedColumn",
      "Pie": "pie",
      "pie": "pie",
      "List": "List",
      "Prognose": "com.ibm.vis.custom.prognoseyearlinechart",
      "com.ibm.vis.custom.prognoseyearlinechart": "com.ibm.vis.custom.prognoseyearlinechart",
      "com.ibm.vis.custom.prognoseyear": "com.ibm.vis.custom.prognoseyearlinechart"
    },
    "emptyDataFilter": {
      "itemId": "[Personal_KDB_TM1].[KDB Kennzahlen].[KDB Kennzahlen].[KDB Kennzahlen]",
      "value": "1"
    }
  };
});
