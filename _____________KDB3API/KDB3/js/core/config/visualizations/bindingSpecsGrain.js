define([], function () {
  "use strict";

  return {
    "grainByBucket": {
      "Line": {
        "defaultGrain": "stichtag",
        "grains": {
          "jahr": {
            "categories": "Jahr",
            "series": "",
            "widgetFilter": { "AggregationstypId": null, "Monat": null }
          },
          "jahrStichtag": {
            "categories": ["Jahr", "Monat"],
            "series": ""
          },
          "stichtagProJahrH": {
            "series": "",
            "repeatHorizontal": ["Jahr"],
            "repeatVertical": ""
          },
          "stichtagProJahrV": {
            "series": "",
            "repeatVertical": ["Jahr"],
            "repeatHorizontal": ""
          }
        }
      },
      "pie": {
        "defaultGrain": "jahr",
        "grains": {
          "jahrStichtag": {
            "repeatHorizontal": ["Jahr", "Monat"],
            "repeatVertical": "",
            "widgetFilter": {
              "AggregationstypId": { "include": ["Stichtag"] },
              "Monat": { "exclude": ["Gesamt", "ALLE"] }
            },
            "slotComposition": {
              "repeatVertical": {
                "hierarchy": {
                  "mode": "insertBeforeSelectedDimensionOrBeforeLast"
                }
              }
            }
          },
          "stichtag": {
            "repeatHorizontal": ["Jahr", "Monat"],
            "repeatVertical": "",
            "widgetFilter": {
              "AggregationstypId": { "include": ["Stichtag"] },
              "Monat": { "exclude": ["Gesamt", "ALLE"] }
            },
            "slotComposition": {
              "repeatVertical": {
                "hierarchy": {
                  "mode": "insertBeforeSelectedDimensionOrBeforeLast"
                }
              }
            }
          },
          "stichtagProJahrH": {
            "repeatHorizontal": ["Jahr"],
            "repeatVertical": ["Monat"],
            "widgetFilter": {
              "AggregationstypId": { "include": ["Stichtag"] },
              "Monat": { "exclude": ["Gesamt", "ALLE"] }
            },
            "slotComposition": {
              "repeatHorizontal": {
                "hierarchy": {
                  "mode": "insertBeforeSelectedDimensionOrBeforeLast"
                }
              }
            }
          },
          "stichtagProJahrV": {
            "repeatHorizontal": ["Monat"],
            "repeatVertical": ["Jahr"],
            "widgetFilter": {
              "AggregationstypId": { "include": ["Stichtag"] },
              "Monat": { "exclude": ["Gesamt", "ALLE"] }
            },
            "slotComposition": {
              "repeatVertical": {
                "hierarchy": {
                  "mode": "insertBeforeSelectedDimensionOrBeforeLast"
                }
              }
            }
          }
        }
      },
      "StackedBar": {
        "defaultGrain": "jahr",
        "grains": {
          "jahrStichtag": {
            "categories": ["Jahr", "Monat"],
            "repeatHorizontal": "",
            "repeatVertical": "",
            "widgetFilter": {
              "AggregationstypId": { "include": ["Stichtag"] },
              "Monat": { "exclude": ["Gesamt", "ALLE"] }
            }
          },
          "stichtag": {
            "categories": ["Jahr", "Monat"],
            "repeatHorizontal": "",
            "repeatVertical": "",
            "widgetFilter": {
              "AggregationstypId": { "include": ["Stichtag"] },
              "Monat": { "exclude": ["Gesamt", "ALLE"] }
            }
          },
          "stichtagProJahrH": {
            "categories": ["Monat"],
            "repeatHorizontal": ["Jahr"],
            "repeatVertical": "",
            "widgetFilter": {
              "AggregationstypId": { "include": ["Stichtag"] },
              "Monat": { "exclude": ["Gesamt", "ALLE"] }
            }
          },
          "stichtagProJahrV": {
            "categories": ["Monat"],
            "repeatVertical": ["Jahr"],
            "repeatHorizontal": "",
            "widgetFilter": {
              "AggregationstypId": { "include": ["Stichtag"] },
              "Monat": { "exclude": ["Gesamt", "ALLE"] }
            }
          }
        }
      },
      "StackedColumn": {
        "defaultGrain": "jahr",
        "grains": {
          "jahrStichtag": {
            "categories": ["Jahr", "Monat"],
            "repeatHorizontal": "",
            "repeatVertical": "",
            "widgetFilter": {
              "AggregationstypId": { "include": ["Stichtag"] },
              "Monat": { "exclude": ["Gesamt", "ALLE"] }
            }
          },
          "stichtag": {
            "categories": ["Jahr", "Monat"],
            "repeatHorizontal": "",
            "repeatVertical": "",
            "widgetFilter": {
              "AggregationstypId": { "include": ["Stichtag"] },
              "Monat": { "exclude": ["Gesamt", "ALLE"] }
            }
          },
          "stichtagProJahrH": {
            "categories": ["Monat"],
            "repeatHorizontal": ["Jahr"],
            "repeatVertical": "",
            "widgetFilter": {
              "AggregationstypId": { "include": ["Stichtag"] },
              "Monat": { "exclude": ["Gesamt", "ALLE"] }
            }
          },
          "stichtagProJahrV": {
            "categories": ["Monat"],
            "repeatVertical": ["Jahr"],
            "repeatHorizontal": "",
            "widgetFilter": {
              "AggregationstypId": { "include": ["Stichtag"] },
              "Monat": { "exclude": ["Gesamt", "ALLE"] }
            }
          }
        }
      },
      "List": {
        "defaultGrain": "jahrStichtag",
        "grains": {
          "jahr": {
            "grid_cols": [
              "Jahr",
              "[Personal_KDB_TM1].[KDB Kennzahlen].[replaceKennzahlName]"
            ],
            "slotComposition": {
              "grid_cols": {
                "dimension": {
                  "mode": "prependThenMoveFirstToIndex",
                  "targetIndex": 1
                },
                "hierarchy": {
                  "mode": "insertBeforeSelectedDimensionOrBeforeLast"
                }
              }
            }
          }
        }
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        "defaultGrain": "stichtag"
      }
    }
  };
});
