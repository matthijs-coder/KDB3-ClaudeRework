define([], function () {
  "use strict";

  return {
    SLOT_VALUES: "values",
    SLOT_CATEGORIES: "categories",
    SLOT_SERIES: "series",
    SLOT_COLOR: "color",
    SLOT_REPEAT_HORIZONTAL: "repeatHorizontal",
    SLOT_REPEAT_VERTICAL: "repeatVertical",
    SLOT_GRID_COLS: "grid_cols",
    ALL_SLOT_NAMES: [
      "values",
      "categories",
      "series",
      "color",
      "repeatHorizontal",
      "repeatVertical",
      "grid_cols",
    ],
    REQUIRED_SLOTS: ["values", "categories", "series", "grid_cols"],
  };
});
